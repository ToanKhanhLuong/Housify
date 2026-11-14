// Service xử lý nghiệp vụ cho module payment (UC-38, UC-39, UC-42)
import Payment from "../../models/Payment.js";
import Invoice from "../../models/Invoice.js";
import Contract from "../../models/Contract.js";
import Room from "../../models/Room.js";
import Building from "../../models/Building.js";
import Manager from "../../models/Manager.js";
import Occupant from "../../models/Occupant.js";
import User from "../../models/User.js";
import { withTransaction } from "../../helpers/withTransaction.js";
import { endOfVietnamDay, startOfVietnamDay } from "../../helpers/date.js";
import { notify } from "../../helpers/notify.js";
import { sendMail } from "../../config/mail.js";
import { AppError } from "../../utils/AppError.js";
import {
  ROLE,
  INVOICE_STATUS,
  NOTIFICATION_TYPE,
} from "../../constants/enums.js";


/**
 * Helper: Tính trạng thái thanh toán "Đúng hạn" hoặc "Quá hạn X ngày" (BR-101)
 */
const calculateOverdueLabel = (paidAt, dueDate) => {
  if (!dueDate) return "Đúng hạn";
  const paidTime = new Date(paidAt).getTime();
  const dueTime = new Date(dueDate).getTime();

  if (paidTime <= dueTime) {
    return "Đúng hạn";
  }
  const diffMs = paidTime - dueTime;
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return `Quá hạn ${days} ngày`;
};

/**
 * Helper: Đọc thời gian giao dịch SePay. SePay gửi "YYYY-MM-DD HH:mm:ss" theo giờ Việt Nam, không kèm múi giờ,
 * nên phải gắn +07:00 để máy chủ chạy giờ UTC không đọc lệch 7 tiếng. Chuỗi có múi giờ thì đọc nguyên
 */
const parseSepayDate = (value) => {
  if (!value) return new Date();
  const text = String(value).trim();
  const parsed = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? new Date(`${text.replace(" ", "T")}+07:00`)
    : new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * UC-38 & UC-42: Xử lý Webhook SePay báo tiền về
 * SePay gọi vào endpoint: POST /api/webhooks/sepay
 */
export const processSepayWebhook = async (payload) => {
  const sepayTxnId = String(payload.id);
  const transferContent = payload.content || "";
  const amount = Number(payload.transferAmount) || 0;
  const bankName = payload.gateway || "Ngân hàng";
  const paidAt = parseSepayDate(payload.transactionDate);

  console.log(
    `[SePay Webhook] Nhận giao dịch ${sepayTxnId}: ${amount} đ, nội dung: "${transferContent}"`,
  );

  // 1. Chống xử lý trùng giao dịch (BR-105)
  const existingPayment = await Payment.findOne({ sepayTxnId });
  if (existingPayment) {
    console.log(
      `[SePay Webhook] Giao dịch ${sepayTxnId} đã được xử lý trước đó, bỏ qua.`,
    );
    return {
      success: true,
      message: "Giao dịch đã được xử lý trước đó",
      sepayTxnId,
      ignored: true,
    };
  }

  // 2. Trích xuất mã hóa đơn từ nội dung chuyển khoản (Định dạng: HD + YYMM + 4 ký tự)
  const match =
    transferContent.match(/\bHD\d{4}[A-Z0-9]{4}\b/i) ||
    transferContent.match(/\bHD[A-Z0-9]{6,12}\b/i) ||
    transferContent.match(/HD\d{4}[A-Z0-9]{4}/i);
  if (!match) {
    console.log(
      `[SePay Webhook] Nội dung "${transferContent}" không chứa mã hóa đơn nào, bỏ qua.`,
    );
    return {
      success: true,
      message: "Nội dung chuyển khoản không chứa mã hóa đơn",
      ignored: true,
    };
  }

  const invoiceCode = match[0].toUpperCase();

  // 3. Tìm hóa đơn trong database
  const invoice = await Invoice.findOne({ invoiceCode }).populate({
    path: "contractId",
    populate: { path: "roomId", populate: { path: "buildingId" } },
  });

  if (!invoice) {
    console.log(
      `[SePay Webhook] Không tìm thấy hóa đơn có mã ${invoiceCode}, bỏ qua.`,
    );
    return {
      success: true,
      message: `Không tìm thấy hóa đơn ${invoiceCode}`,
      ignored: true,
    };
  }

  // 4. Chỉ hóa đơn PENDING mới được thanh toán. DRAFT, PAID, CANCELLED -> Chỉ ghi log theo quy tắc nghiệp vụ
  if (invoice.status !== INVOICE_STATUS.PENDING) {
    console.log(
      `[SePay Webhook] Hóa đơn ${invoiceCode} đang ở trạng thái [${invoice.status}], chỉ ghi log.`,
    );
    return {
      success: true,
      message: `Hóa đơn đã ở trạng thái ${invoice.status}, chỉ ghi log`,
      ignored: true,
    };
  }

  // 5. Nếu hóa đơn đang PENDING -> Lưu giao dịch; chỉ gạch nợ PAID khi số tiền >= tổng hóa đơn
  const isSufficient = amount >= Number(invoice.totalAmount || 0);
  const previousPayments = await Payment.find({ invoiceId: invoice._id })
    .select("amount")
    .lean();
  const previousPaidTotal = previousPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );

  let newPayment = null;
  await withTransaction(async (session) => {
    // 5.1. Tạo bản ghi giao dịch trong bảng payments (kể cả chuyển thiếu để đối chiếu sao kê và tính tiền thừa kỳ sau)
    const [createdPayment] = await Payment.create(
      [
        {
          sepayTxnId,
          invoiceId: invoice._id,
          amount,
          transferContent,
          bankName,
          paidAt,
        },
      ],
      { session },
    );
    newPayment = createdPayment;

    // 5.2. Chỉ cập nhật hóa đơn sang PAID khi số tiền chuyển khoản >= tổng tiền hóa đơn
    if (isSufficient) {
      invoice.status = INVOICE_STATUS.PAID;
      invoice.paidAt = paidAt;
      await invoice.save({ session });
    }
  });

  // 6. Lấy thông tin phòng, tòa, Admin, Customer để gửi thông báo
  const room = invoice.contractId?.roomId;
  const building = room?.buildingId;
  const roomNumber = room?.roomNumber || "Phòng";
  const adminUsers = await User.find({
    roleId: ROLE.ADMIN,
    status: "ACTIVE",
  }).select("_id");
  const representative = await Occupant.findOne({
    contractId: invoice.contractId?._id,
    isRepresentative: true,
  });

  // Trường hợp chuyển thiếu (< totalAmount): giữ PENDING và cảnh báo Manager, Admin, Customer
  if (!isSufficient) {
    const expectedStr = Number(invoice.totalAmount || 0).toLocaleString("vi-VN");
    const amountStr = amount.toLocaleString("vi-VN");

    if (building?.managerId) {
      await notify({
        userIds: [building.managerId],
        type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
        title: `Phòng ${roomNumber} chuyển thiếu tiền hóa đơn`,
        message: `Phòng ${roomNumber} chuyển ${amountStr} đ cho hóa đơn ${invoice.invoiceCode} (chưa đủ ${expectedStr} đ). Hóa đơn vẫn Chờ thanh toán.`,
        refId: invoice._id,
      });
    }

    if (adminUsers.length > 0) {
      await notify({
        userIds: adminUsers.map((a) => a._id),
        type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
        title: `Giao dịch chưa đủ tiền — ${invoice.invoiceCode}`,
        message: `Phòng ${roomNumber} chuyển ${amountStr} đ cho hóa đơn ${invoice.invoiceCode} (tổng ${expectedStr} đ). Hóa đơn chưa được gạch nợ.`,
        refId: invoice._id,
      });
    }

    if (representative?.userId) {
      await notify({
        userIds: [representative.userId],
        type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
        title: "Số tiền chuyển khoản chưa đủ",
        message: `Giao dịch ${amountStr} đ cho hóa đơn ${invoice.invoiceCode} chưa đủ số tiền (${expectedStr} đ). Vui lòng quét đúng QR để hoàn tất; khoản dư sẽ được Manager khấu trừ kỳ sau.`,
        refId: invoice._id,
      });
    }

    return {
      success: true,
      underpaid: true,
      message: "Số tiền chuyển khoản chưa đủ so với hóa đơn, giữ trạng thái Chờ thanh toán",
      invoiceCode,
      amount,
      expectedAmount: invoice.totalAmount,
      payment: newPayment,
    };
  }

  // Trường hợp chuyển đủ hoặc thừa (>= totalAmount): hóa đơn thành PAID
  const statusLabel = calculateOverdueLabel(paidAt, invoice.dueDate);
  const totalReceived = previousPaidTotal + amount;
  const overpaidAmount = Math.max(0, totalReceived - Number(invoice.totalAmount || 0));
  const overpaidSuffix =
    overpaidAmount > 0
      ? ` — Dư ${overpaidAmount.toLocaleString("vi-VN")} đ (khấu trừ kỳ sau)`
      : "";

  // 7.1. Báo chuông cho Manager phụ trách tòa
  if (building?.managerId) {
    await notify({
      userIds: [building.managerId],
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: "Hóa đơn đã được thanh toán",
      message: `Phòng ${roomNumber} đã thanh toán hóa đơn tháng ${invoice.month} — ${amount.toLocaleString("vi-VN")} đ (${statusLabel})${overpaidSuffix}.`,
      refId: invoice._id,
    });
  }

  // 7.2. Báo chuông cho Admin (chủ nhà)
  if (adminUsers.length > 0) {
    await notify({
      userIds: adminUsers.map((a) => a._id),
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: "Tiền về tài khoản",
      message: `Giao dịch ${amount.toLocaleString("vi-VN")} đ về tài khoản — hóa đơn ${invoice.invoiceCode} phòng ${roomNumber} đã thanh toán (${statusLabel})${overpaidSuffix}.`,
      refId: invoice._id,
    });
  }

  // 7.3. Báo chuông cho Customer (Người đại diện)
  if (representative?.userId) {
    await notify({
      userIds: [representative.userId],
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: "Thanh toán thành công",
      message: `Hóa đơn ${invoice.invoiceCode} tháng ${invoice.month} đã thanh toán thành công — ${amount.toLocaleString("vi-VN")} đ (${statusLabel})${overpaidSuffix}.`,
      refId: invoice._id,
    });
  }

  // 8. Gửi email xác nhận thanh toán cho Customer (UC-42)
  let customerEmail = invoice.contractId?.representativeEmail;
  if (representative?.userId) {
    const repUser = await User.findById(representative.userId).select('email').lean();
    if (repUser?.email) customerEmail = repUser.email;
  }
  if (customerEmail) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2b6cb0;">Xác nhận thanh toán hóa đơn thành công</h2>
        <p>Xin chào quý khách,</p>
        <p>Hệ thống Housify xác nhận đã nhận được khoản thanh toán hóa đơn tiền phòng của quý khách với chi tiết như sau:</p>
        <ul>
          <li><b>Mã hóa đơn:</b> ${invoice.invoiceCode}</li>
          <li><b>Phòng:</b> ${roomNumber}</li>
          <li><b>Kỳ thanh toán:</b> Tháng ${invoice.month}</li>
          <li><b>Số tiền đã thanh toán:</b> <span style="color: #2b6cb0; font-weight: bold; font-size: 16px;">${amount.toLocaleString("vi-VN")} VNĐ</span></li>
          <li><b>Thời gian thanh toán:</b> ${paidAt.toLocaleString("vi-VN")}</li>
          <li><b>Mã giao dịch ngân hàng:</b> ${sepayTxnId}</li>
          <li><b>Tình trạng:</b> <span style="font-weight: bold; color: ${statusLabel === "Đúng hạn" ? "#38a169" : "#e53e3e"};">${statusLabel}</span></li>
        </ul>
        <p>Cảm ơn quý khách đã hoàn tất nghĩa vụ thanh toán đúng quy định!</p>
      </div>
    `;

    await sendMail(
      customerEmail,
      `[Housify] Xác nhận thanh toán hóa đơn ${invoice.invoiceCode}`,
      emailHtml,
    );
  }

  return {
    success: true,
    message: "Thanh toán hóa đơn thành công",
    invoiceCode,
    amount,
    statusLabel,
    payment: newPayment,
  };
};

/**
 * UC-39: Xem lịch sử thanh toán
 * GET /api/payments?from=&to=&page=&limit=
 */
export const getPayments = async (query, user) => {
  const { from, to, roomId, page = 1, limit = 10 } = query;
  const userRole = user.role ?? user.roleId;
  const emptyResult = {
    items: [],
    total: 0,
    page: Number(page),
    limit: Number(limit),
    totalPages: 0,
  };

  // 1. Phân quyền: Xác định danh sách invoiceId mà user có quyền xem
  let invoiceFilter = {};

  if (userRole === ROLE.CUSTOMER) {
    // Customer: Xem mọi hợp đồng mà mình là người đại diện (khách thuê lại có nhiều hợp đồng)
    const contractIds = await Occupant.distinct("contractId", {
      userId: user._id,
      isRepresentative: true,
    });
    if (contractIds.length === 0) {
      return emptyResult;
    }
    invoiceFilter.contractId = { $in: contractIds };
  } else if (userRole === ROLE.MANAGER) {
    // Manager: Xem các phòng thuộc tòa mình phụ trách
    const managerBuilding = await Building.findOne({
      managerId: user._id,
      isDeleted: false,
    });
    if (!managerBuilding) {
      return emptyResult;
    }
    // Lọc theo 1 phòng (roomId) – chỉ trong tòa mình, phòng tòa khác trả rỗng
    const roomFilter = { buildingId: managerBuilding._id };
    if (roomId) roomFilter._id = roomId;
    const rooms = await Room.find(roomFilter).select("_id");
    const contracts = await Contract.find({
      roomId: { $in: rooms.map((r) => r._id) },
    }).select("_id");
    invoiceFilter.contractId = { $in: contracts.map((c) => c._id) };
  }

  const allowedInvoices = await Invoice.find(invoiceFilter).select("_id");
  const allowedInvoiceIds = allowedInvoices.map((inv) => inv._id);

  // 2. Tạo bộ lọc cho bảng payments
  const paymentFilter = {
    invoiceId: { $in: allowedInvoiceIds },
  };

  // Lọc theo khoảng ngày thanh toán paidAt
  if (from || to) {
    paymentFilter.paidAt = {};
    // from, to là ngày theo giờ Việt Nam: từ 00:00 ngày from đến 23:59:59 ngày to
    if (from) {
      paymentFilter.paidAt.$gte = startOfVietnamDay(from);
    }
    if (to) {
      paymentFilter.paidAt.$lte = endOfVietnamDay(to);
    }
  }

  // 3. Phân trang và truy vấn
  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    Payment.find(paymentFilter)
      .populate({
        path: "invoiceId",
        select: "invoiceCode month totalAmount dueDate sentAt createdAt status items contractId",
        populate: {
          path: "contractId",
          select: "roomId representativeCccd representativeEmail",
          populate: {
            path: "roomId",
            select: "roomNumber floorNumber buildingId",
            populate: {
              path: "buildingId",
              select: "name address managerId",
            },
          },
        },
      })
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(paymentFilter),
  ]);

  // Lấy thông tin đại diện (Occupant) và thông tin Manager của tòa nhà
  const contractIds = payments
    .map((p) => p.invoiceId?.contractId?._id)
    .filter(Boolean);
  const managerUserIds = payments
    .map((p) => p.invoiceId?.contractId?.roomId?.buildingId?.managerId)
    .filter(Boolean);

  const [representatives, managers] = await Promise.all([
    Occupant.find({
      contractId: { $in: contractIds },
      isRepresentative: true,
    }).select("contractId name phone cccd"),
    Manager.find({
      userId: { $in: managerUserIds },
    }).select("userId name phone"),
  ]);

  const repMap = new Map(representatives.map((r) => [r.contractId.toString(), r]));
  const managerMap = new Map(managers.map((m) => [m.userId.toString(), m]));

  const missingRepCccds = payments
    .filter((p) => {
      const cId = p.invoiceId?.contractId?._id?.toString();
      return cId && !repMap.has(cId) && p.invoiceId?.contractId?.representativeCccd;
    })
    .map((p) => p.invoiceId.contractId.representativeCccd);

  let userMap = new Map();
  if (missingRepCccds.length > 0) {
    const users = await User.find({ cccd: { $in: missingRepCccds } }).select("name phone cccd email");
    userMap = new Map(users.map((u) => [u.cccd, u]));
  }

  // 4. Định dạng dữ liệu trả về và tính nhãn "Đúng hạn" / "Quá hạn X ngày"
  const items = payments.map((p) => {
    const inv = p.invoiceId;
    const contract = inv?.contractId;
    const room = contract?.roomId;
    const building = room?.buildingId;
    const cId = contract?._id?.toString();
    const rep = (cId ? repMap.get(cId) : null) || (contract?.representativeCccd ? userMap.get(contract.representativeCccd) : null);
    const bManager = building?.managerId ? managerMap.get(building.managerId.toString()) : null;
    const isUnderpaid = inv && Number(p.amount) < Number(inv.totalAmount);
    const isOverpaid = inv && Number(p.amount) > Number(inv.totalAmount);
    const paymentStatus = isUnderpaid ? "UNDERPAID" : isOverpaid ? "OVERPAID" : "EXACT";
    const statusLabel = isUnderpaid
      ? "Chuyển thiếu (chưa gạch nợ)"
      : calculateOverdueLabel(p.paidAt, inv?.dueDate);

    return {
      _id: p._id,
      sepayTxnId: p.sepayTxnId,
      amount: p.amount,
      bankName: p.bankName,
      transferContent: p.transferContent,
      paidAt: p.paidAt,
      paymentStatus,
      statusLabel, // "Đúng hạn", "Quá hạn X ngày", hoặc "Chuyển thiếu (chưa gạch nợ)"
      representativeName: rep?.name || "",
      representativePhone: rep?.phone || "",
      invoice: inv
        ? {
          _id: inv._id,
          invoiceCode: inv.invoiceCode,
          month: inv.month,
          totalAmount: inv.totalAmount,
          dueDate: inv.dueDate,
          sentAt: inv.sentAt,
          createdAt: inv.createdAt,
          status: inv.status,
          items: inv.items || [],
          roomNumber: room?.roomNumber || "",
          floorNumber: room?.floorNumber || "",
          building: building
            ? {
              _id: building._id,
              name: building.name,
              address: building.address,
              managerName: bManager?.name || "",
              managerPhone: bManager?.phone || "",
            }
            : null,
          representative: {
            name: rep?.name || "",
            phone: rep?.phone || "",
            email: contract?.representativeEmail || rep?.email || "",
            cccd: contract?.representativeCccd || rep?.cccd || "",
          },
          representativeName: rep?.name || "",
          representativePhone: rep?.phone || "",
        }
        : null,
    };
  });

  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)) || 0,
  };
};

/**
 * UC-39: Xem chi tiết 1 biên lai thanh toán
 * GET /api/payments/:id
 */
export const getPaymentById = async (id, user) => {
  const payment = await Payment.findById(id).populate({
    path: "invoiceId",
    select: "invoiceCode month totalAmount dueDate sentAt createdAt status items contractId",
    populate: {
      path: "contractId",
      select: "roomId representativeCccd representativeEmail",
      populate: {
        path: "roomId",
        select: "roomNumber floorNumber buildingId",
        populate: {
          path: "buildingId",
          select: "name address managerId",
        },
      },
    },
  });

  if (!payment) {
    throw new AppError("Không tìm thấy biên lai thanh toán", 404);
  }

  const inv = payment.invoiceId;
  const contract = inv?.contractId;
  const room = contract?.roomId;
  const building = room?.buildingId;

  const userRole = user.role ?? user.roleId;
  if (userRole === ROLE.MANAGER) {
    const managerBuilding = await Building.findOne({
      managerId: user._id,
      isDeleted: false,
    });
    if (!managerBuilding || String(building?._id) !== String(managerBuilding._id)) {
      throw new AppError("Bạn không có quyền xem biên lai của tòa nhà khác", 403);
    }
  } else if (userRole === ROLE.CUSTOMER) {
    const contractIds = await Occupant.distinct("contractId", {
      userId: user._id,
      isRepresentative: true,
    });
    const isOwner = contractIds.some((cId) => String(cId) === String(contract?._id));
    if (!isOwner) {
      throw new AppError("Bạn không có quyền xem biên lai này", 403);
    }
  }

  const rep = contract?._id
    ? await Occupant.findOne({ contractId: contract._id, isRepresentative: true }).select("name phone cccd")
    : null;
  const userRep = !rep && contract?.representativeCccd
    ? await User.findOne({ cccd: contract.representativeCccd }).select("name phone cccd email")
    : null;

  const bManager = building?.managerId
    ? await Manager.findOne({ userId: building.managerId }).select("name phone")
    : null;

  const isUnderpaid = inv && Number(payment.amount) < Number(inv.totalAmount);
  const isOverpaid = inv && Number(payment.amount) > Number(inv.totalAmount);
  const paymentStatus = isUnderpaid ? "UNDERPAID" : isOverpaid ? "OVERPAID" : "EXACT";
  const statusLabel = isUnderpaid
    ? "Chuyển thiếu (chưa gạch nợ)"
    : calculateOverdueLabel(payment.paidAt, inv?.dueDate);

  return {
    _id: payment._id,
    sepayTxnId: payment.sepayTxnId,
    amount: payment.amount,
    bankName: payment.bankName,
    transferContent: payment.transferContent,
    paidAt: payment.paidAt,
    paymentStatus,
    statusLabel,
    representativeName: rep?.name || userRep?.name || "",
    representativePhone: rep?.phone || userRep?.phone || "",
    invoice: inv
      ? {
        _id: inv._id,
        invoiceCode: inv.invoiceCode,
        month: inv.month,
        totalAmount: inv.totalAmount,
        dueDate: inv.dueDate,
        sentAt: inv.sentAt,
        createdAt: inv.createdAt,
        status: inv.status,
        items: inv.items || [],
        roomNumber: room?.roomNumber || "",
        floorNumber: room?.floorNumber || "",
        building: building
          ? {
            _id: building._id,
            name: building.name,
            address: building.address,
            managerName: bManager?.name || "",
            managerPhone: bManager?.phone || "",
          }
          : null,
        representative: {
          name: rep?.name || userRep?.name || "",
          phone: rep?.phone || userRep?.phone || "",
          email: contract?.representativeEmail || userRep?.email || "",
          cccd: contract?.representativeCccd || rep?.cccd || userRep?.cccd || "",
        },
        representativeName: rep?.name || userRep?.name || "",
        representativePhone: rep?.phone || userRep?.phone || "",
      }
      : null,
  };
};

/**
 * Route Dev: Giả lập SePay báo tiền về ở local
 * POST /api/dev/sepay-simulate
 */
export const simulateSepay = async (data) => {
  const { invoiceCode, amount } = data;

  const mockPayload = {
    id: `DEV_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    gateway: "TPBank",
    transactionDate: new Date().toISOString(),
    content: `${invoiceCode} thanh toan test`,
    transferType: "in",
    transferAmount: Number(amount),
  };

  return processSepayWebhook(mockPayload);
};
