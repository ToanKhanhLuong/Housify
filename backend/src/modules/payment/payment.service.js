// Service xử lý nghiệp vụ cho module payment (UC-38, UC-39, UC-42)
import Payment from "../../models/Payment.js";
import Invoice from "../../models/Invoice.js";
import Contract from "../../models/Contract.js";
import Room from "../../models/Room.js";
import Building from "../../models/Building.js";
import Occupant from "../../models/Occupant.js";
import User from "../../models/User.js";
import { withTransaction } from "../../helpers/withTransaction.js";
import { notify } from "../../helpers/notify.js";
import { sendMail } from "../../config/mail.js";
import {
  ROLE,
  INVOICE_STATUS,
  NOTIFICATION_TYPE,
} from "../../constants/enums.js";
import { AppError } from "../../utils/AppError.js";

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
 * UC-38 & UC-42: Xử lý Webhook SePay báo tiền về
 * SePay gọi vào endpoint: POST /api/webhooks/sepay
 */
export const processSepayWebhook = async (payload) => {
  const sepayTxnId = String(payload.id);
  const transferContent = payload.content || "";
  const amount = Number(payload.transferAmount) || 0;
  const bankName = payload.gateway || "Ngân hàng";
  const paidAt = payload.transactionDate
    ? new Date(payload.transactionDate)
    : new Date();

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

  // 4. Nếu hóa đơn đã PAID hoặc CANCELLED -> Chỉ ghi log theo quy tắc nghiệp vụ
  if (
    invoice.status === INVOICE_STATUS.PAID ||
    invoice.status === INVOICE_STATUS.CANCELLED
  ) {
    console.log(
      `[SePay Webhook] Hóa đơn ${invoiceCode} đang ở trạng thái [${invoice.status}], chỉ ghi log.`,
    );
    return {
      success: true,
      message: `Hóa đơn đã ở trạng thái ${invoice.status}, chỉ ghi log`,
      ignored: true,
    };
  }

  // 5. Nếu hóa đơn đang PENDING -> Lưu giao dịch và chuyển trạng thái PAID trong 1 transaction
  let newPayment = null;
  await withTransaction(async (session) => {
    // 5.1. Tạo bản ghi giao dịch trong bảng payments
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

    // 5.2. Cập nhật hóa đơn sang PAID
    invoice.status = INVOICE_STATUS.PAID;
    invoice.paidAt = paidAt;
    await invoice.save({ session });
  });

  // 6. Tính toán tình trạng thanh toán đúng hạn hay trễ hạn (UC-42)
  const statusLabel = calculateOverdueLabel(paidAt, invoice.dueDate);

  // 7. Gửi thông báo chuông cho 3 vai trò: Manager, Admin, Customer (UC-42)
  const room = invoice.contractId?.roomId;
  const building = room?.buildingId;
  const roomNumber = room?.roomNumber || "Phòng";

  // 7.1. Báo chuông cho Manager phụ trách tòa
  if (building?.managerId) {
    await notify({
      userIds: [building.managerId],
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: "Hóa đơn đã được thanh toán",
      message: `Phòng ${roomNumber} đã thanh toán hóa đơn tháng ${invoice.month} — ${amount.toLocaleString("vi-VN")} đ (${statusLabel}).`,
      refId: invoice._id,
    });
  }

  // 7.2. Báo chuông cho Admin (chủ nhà)
  const adminUsers = await User.find({
    roleId: ROLE.ADMIN,
    status: "ACTIVE",
  }).select("_id");
  if (adminUsers.length > 0) {
    await notify({
      userIds: adminUsers.map((a) => a._id),
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: "Tiền về tài khoản",
      message: `Giao dịch ${amount.toLocaleString("vi-VN")} đ về tài khoản — hóa đơn ${invoice.invoiceCode} phòng ${roomNumber} đã thanh toán (${statusLabel}).`,
      refId: invoice._id,
    });
  }

  // 7.3. Báo chuông cho Customer (Người đại diện)
  const representative = await Occupant.findOne({
    contractId: invoice.contractId?._id,
    isRepresentative: true,
  });

  if (representative?.userId) {
    await notify({
      userIds: [representative.userId],
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: "Thanh toán thành công",
      message: `Hóa đơn ${invoice.invoiceCode} tháng ${invoice.month} đã thanh toán thành công — ${amount.toLocaleString("vi-VN")} đ (${statusLabel}).`,
      refId: invoice._id,
    });
  }

  // 8. Gửi email xác nhận thanh toán cho Customer (UC-42)
  const customerEmail = invoice.contractId?.representativeEmail;
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
  const { from, to, page = 1, limit = 10 } = query;
  const userRole = user.role ?? user.roleId;

  // 1. Phân quyền: Xác định danh sách invoiceId mà user có quyền xem
  let invoiceFilter = {};

  if (userRole === ROLE.CUSTOMER) {
    // Customer: Chỉ xem các hợp đồng mà mình là người đại diện
    const repOccupant = await Occupant.findOne({
      userId: user._id,
      isRepresentative: true,
    });
    if (!repOccupant) {
      return { items: [], total: 0, page: Number(page), limit: Number(limit) };
    }
    invoiceFilter.contractId = repOccupant.contractId;
  } else if (userRole === ROLE.MANAGER) {
    // Manager: Xem các phòng thuộc tòa mình phụ trách
    const managerBuilding = await Building.findOne({
      managerId: user._id,
      isDeleted: false,
    });
    if (!managerBuilding) {
      return { items: [], total: 0, page: Number(page), limit: Number(limit) };
    }
    const rooms = await Room.find({ buildingId: managerBuilding._id }).select(
      "_id",
    );
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
    if (from) {
      paymentFilter.paidAt.$gte = new Date(from);
    }
    if (to) {
      // Đặt đến 23:59:59 của ngày 'to' để lấy trọn ngày
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      paymentFilter.paidAt.$lte = toDate;
    }
  }

  // 3. Phân trang và truy vấn
  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    Payment.find(paymentFilter)
      .populate({
        path: "invoiceId",
        select: "invoiceCode month totalAmount dueDate status contractId",
        populate: {
          path: "contractId",
          select: "roomId",
          populate: { path: "roomId", select: "roomNumber floorNumber" },
        },
      })
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(paymentFilter),
  ]);

  // 4. Định dạng dữ liệu trả về và tính nhãn "Đúng hạn" / "Quá hạn X ngày"
  const items = payments.map((p) => {
    const inv = p.invoiceId;
    const room = inv?.contractId?.roomId;
    const statusLabel = calculateOverdueLabel(p.paidAt, inv?.dueDate);

    return {
      _id: p._id,
      sepayTxnId: p.sepayTxnId,
      amount: p.amount,
      bankName: p.bankName,
      transferContent: p.transferContent,
      paidAt: p.paidAt,
      statusLabel, // "Đúng hạn" hoặc "Quá hạn X ngày"
      invoice: inv
        ? {
            _id: inv._id,
            invoiceCode: inv.invoiceCode,
            month: inv.month,
            totalAmount: inv.totalAmount,
            dueDate: inv.dueDate,
            status: inv.status,
            roomNumber: room?.roomNumber || "",
          }
        : null,
    };
  });

  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
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
