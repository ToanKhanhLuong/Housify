// Service xử lý nghiệp vụ cho module payment (UC-38, UC-39, UC-42)
import Payment from "../../models/Payment.js";
import Invoice from "../../models/Invoice.js";
import Contract from "../../models/Contract.js";
import Room from "../../models/Room.js";
import Building from "../../models/Building.js";
import Manager from "../../models/Manager.js";
import Occupant from "../../models/Occupant.js";
import User from "../../models/User.js";
import AuditLog from "../../models/AuditLog.js";
import { env } from "../../config/env.js";
import { withTransaction } from "../../helpers/withTransaction.js";
import { endOfVietnamDay, startOfVietnamDay } from "../../helpers/date.js";
import { getRepresentativeRecipientEmail } from "../../helpers/representativeEmail.js";
import { notify } from "../../helpers/notify.js";
import { audit } from "../../helpers/audit.js";
import { sendMail } from "../../config/mail.js";
import { AppError } from "../../utils/AppError.js";
import {
  ROLE,
  USER_STATUS,
  INVOICE_STATUS,
  NOTIFICATION_TYPE,
  AUDIT_ACTION,
} from "../../constants/enums.js";


// Tính nhãn thời điểm thanh toán đúng hạn hoặc quá hạn bao nhiêu ngày (BR-101)
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

// Chuyển chuỗi thời gian của SePay sang Date có gắn múi giờ +07:00 để không bị lệch giờ trên server UTC
const parseSepayDate = (value) => {
  if (!value) return new Date();
  const text = String(value).trim();
  const parsed = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? new Date(`${text.replace(" ", "T")}+07:00`)
    : new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const normalizeAccountNo = (value) =>
  String(value || "").replace(/\s+/g, "").trim();

// Tách các cụm ký tự độc lập trong nội dung chuyển khoản để đối chiếu khớp 100% với invoiceCode lưu trong DB
// (không ép khuôn cứng số ký tự hay chữ hoa/thường — mã hóa đơn trên DB là gì thì phải khớp y hệt 100% chuỗi đó)
const extractContentTokens = (content) => {
  const text = String(content || "");
  const tokens = text.match(/[A-Za-z0-9_-]+/g) || [];
  return [...new Set(tokens)].slice(0, 50);
};

const logReconciliation = (reason, details) => {
  console.warn(`[SePay Reconciliation] ${reason}:`, JSON.stringify(details));
};

const makeAbortError = (flag) => {
  const error = new Error(flag);
  error[flag] = true;
  return error;
};

const safeNotify = async (notifyFn, payload, warnings, label) => {
  try {
    await notifyFn(payload);
  } catch (error) {
    console.error(`[SePay Notification Error] ${label}:`, error.message);
    warnings.push(`Gửi thông báo ${label} thất bại`);
  }
};

// Xử lý webhook từ SePay khi có biến động số dư ngân hàng (UC-38, UC-42)
export const processSepayWebhook = async (payload, deps = {}) => {
  const {
    notifyFn = notify,
    sendMailFn = sendMail,
    onBeforePaymentCreate = null,
  } = deps;

  const sepayTxnId = String(payload?.id ?? "").trim();
  const transferContent = String(payload?.content || "").trim();
  const amount = Number(payload?.transferAmount);
  const bankName = String(payload?.gateway || "Ngân hàng").trim() || "Ngân hàng";
  const paidAt = parseSepayDate(payload?.transactionDate);

  if (!sepayTxnId || !Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Dữ liệu giao dịch SePay không hợp lệ", 422);
  }

  console.log(
    `[SePay Webhook] Nhận giao dịch ${sepayTxnId}: ${amount} đ, loại: "${payload.transferType || "in"}", nội dung: "${transferContent}"`,
  );

  // 0. Chỉ xử lý giao dịch tiền VÀO tài khoản và khớp số tài khoản nhận tiền (nếu payload có gửi)
  if (payload.transferType && payload.transferType !== "in") {
    logReconciliation("OUTGOING_TRANSFER_IGNORED", {
      sepayTxnId,
      transferType: payload.transferType,
      amount,
      bankName,
      paidAt,
    });
    return {
      success: true,
      message: `Bỏ qua giao dịch tiền ra (${payload.transferType})`,
      sepayTxnId,
      ignored: true,
    };
  }

  const expectedAccountNo = normalizeAccountNo(env.BANK_ACCOUNT_NO);
  const receivedAccountNo = normalizeAccountNo(payload.accountNumber);
  if (expectedAccountNo && receivedAccountNo && receivedAccountNo !== expectedAccountNo) {
    logReconciliation("ACCOUNT_NUMBER_MISMATCH", {
      sepayTxnId,
      receivedAccountNo,
      amount,
      bankName,
      paidAt,
    });
    return {
      success: true,
      message: "Giao dịch không thuộc số tài khoản nhận tiền của hệ thống",
      sepayTxnId,
      ignored: true,
    };
  }

  // 1. Chống xử lý trùng giao dịch đã khớp hoặc giao dịch lệch tiền đã ghi nhận trước đó (BR-105)
  const [existingPayment, existingMismatchAudit] = await Promise.all([
    Payment.findOne({ sepayTxnId }).lean(),
    AuditLog.exists({
      action: { $in: [AUDIT_ACTION.PAYMENT_UNDERPAID, AUDIT_ACTION.PAYMENT_OVERPAID] },
      "metadata.sepayTxnId": sepayTxnId,
    }),
  ]);
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
  if (existingMismatchAudit) {
    console.log(
      `[SePay Webhook] Giao dịch không khớp ${sepayTxnId} đã được ghi nhận trước đó, bỏ qua.`,
    );
    return {
      success: true,
      message: "Giao dịch đã được ghi nhận đối soát trước đó",
      sepayTxnId,
      ignored: true,
    };
  }

  // 2. Tách từ trong nội dung chuyển khoản và đối chiếu khớp chính xác 100% với invoiceCode trong database
  const candidateTokens = extractContentTokens(transferContent);
  if (candidateTokens.length === 0) {
    logReconciliation("NO_INVOICE_CODE", {
      sepayTxnId,
      amount,
      bankName,
      transferContent,
      paidAt,
    });
    return {
      success: true,
      message: "Nội dung chuyển khoản không chứa mã hóa đơn",
      sepayTxnId,
      ignored: true,
    };
  }

  // 3. Tìm hóa đơn khớp chính xác 100% từng ký tự với invoiceCode đã lưu trong DB
  const matchedInvoices = await Invoice.find({
    invoiceCode: { $in: candidateTokens },
  }).populate({
    path: "contractId",
    populate: { path: "roomId", populate: { path: "buildingId" } },
  });

  if (matchedInvoices.length === 0) {
    logReconciliation("INVOICE_NOT_FOUND", {
      sepayTxnId,
      amount,
      bankName,
      transferContent,
      paidAt,
    });
    return {
      success: true,
      message: "Nội dung chuyển khoản không khớp chính xác với mã hóa đơn nào",
      sepayTxnId,
      ignored: true,
    };
  }

  if (matchedInvoices.length > 1) {
    const matchedCodes = matchedInvoices.map((inv) => inv.invoiceCode);
    logReconciliation("MULTIPLE_INVOICE_CODES", {
      sepayTxnId,
      matchedCodes,
      amount,
      bankName,
      transferContent,
      paidAt,
    });
    return {
      success: true,
      message: "Nội dung chuyển khoản chứa nhiều mã hóa đơn, không thể tự động đối soát",
      sepayTxnId,
      ignored: true,
    };
  }

  const invoice = matchedInvoices[0];
  const invoiceCode = invoice.invoiceCode;

  // 4. Chỉ hóa đơn PENDING mới được thanh toán. DRAFT, PAID, CANCELLED -> Chỉ ghi nhận log đối soát
  if (invoice.status !== INVOICE_STATUS.PENDING) {
    logReconciliation("INVOICE_NOT_PENDING", {
      sepayTxnId,
      invoiceId: invoice._id,
      invoiceCode,
      invoiceStatus: invoice.status,
      amount,
      expectedAmount: invoice.totalAmount,
      bankName,
      transferContent,
      paidAt,
    });
    return {
      success: true,
      message: `Hóa đơn đã ở trạng thái ${invoice.status}, chỉ ghi log`,
      sepayTxnId,
      ignored: true,
    };
  }

  // 5. Đối chiếu số tiền và ghi dữ liệu nguyên tử trong Transaction
  const expectedAmount = Number(invoice.totalAmount || 0);
  const isExactAmount = amount === expectedAmount;
  const isUnderpaid = amount < expectedAmount;
  const isOverpaid = amount > expectedAmount;

  let newPayment = null;
  try {
    await withTransaction(async (session) => {
      if (isExactAmount) {
        // Khóa và chuyển trạng thái PENDING -> PAID có điều kiện trước khi lưu Payment
        const updatedInvoice = await Invoice.findOneAndUpdate(
          { _id: invoice._id, status: INVOICE_STATUS.PENDING },
          { $set: { status: INVOICE_STATUS.PAID, paidAt } },
          { session, returnDocument: "after" },
        );
        if (!updatedInvoice) {
          throw makeAbortError("isInvoiceStateChanged");
        }
        invoice.status = updatedInvoice.status;
        invoice.paidAt = updatedInvoice.paidAt;

        if (typeof onBeforePaymentCreate === "function") {
          await onBeforePaymentCreate(session);
        }

        // Chỉ tạo Payment trong bảng payments khi giao dịch khớp đúng số tiền và đối soát thành công
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
      } else {
        // Chuyển thiếu hoặc thừa: giữ PENDING, không tạo Payment vào bảng payments; lưu AuditLog để đối soát
        const stillPending = await Invoice.exists({
          _id: invoice._id,
          status: INVOICE_STATUS.PENDING,
        }).session(session);
        if (!stillPending) {
          throw makeAbortError("isInvoiceStateChanged");
        }

        const dupAudit = await AuditLog.exists({
          action: { $in: [AUDIT_ACTION.PAYMENT_UNDERPAID, AUDIT_ACTION.PAYMENT_OVERPAID] },
          "metadata.sepayTxnId": sepayTxnId,
        }).session(session);
        if (dupAudit) {
          throw makeAbortError("isDuplicateMismatch");
        }

        const amountStr = amount.toLocaleString("vi-VN");
        const expectedStr = expectedAmount.toLocaleString("vi-VN");
        await audit(
          {
            action: isUnderpaid
              ? AUDIT_ACTION.PAYMENT_UNDERPAID
              : AUDIT_ACTION.PAYMENT_OVERPAID,
            targetType: invoice.contractId?._id ? "contracts" : "invoices",
            targetId: invoice.contractId?._id ?? invoice._id,
            reason: isUnderpaid
              ? `Hóa đơn ${invoice.invoiceCode}: chuyển ${amountStr} đ (thiếu so với ${expectedStr} đ) — Mã GD ${sepayTxnId}`
              : `Hóa đơn ${invoice.invoiceCode}: chuyển ${amountStr} đ (thừa so với ${expectedStr} đ) — Mã GD ${sepayTxnId}`,
            metadata: {
              invoiceId: invoice._id,
              invoiceCode: invoice.invoiceCode,
              sepayTxnId,
              amount,
              expectedAmount,
              transferContent,
              bankName,
              paidAt,
            },
          },
          session,
        );
        logReconciliation(isUnderpaid ? "PAYMENT_UNDERPAID" : "PAYMENT_OVERPAID", {
          sepayTxnId,
          invoiceId: invoice._id,
          invoiceCode: invoice.invoiceCode,
          amount,
          expectedAmount,
          bankName,
          transferContent,
          paidAt,
        });
      }
    });
  } catch (error) {
    if (error?.isInvoiceStateChanged) {
      logReconciliation("CONCURRENT_INVOICE_STATE_CHANGED", {
        sepayTxnId,
        invoiceId: invoice._id,
        invoiceCode,
        amount,
        bankName,
        paidAt,
      });
      return {
        success: true,
        message: "Trạng thái hóa đơn vừa thay đổi, bỏ qua giao dịch",
        sepayTxnId,
        ignored: true,
      };
    }
    if (error?.isDuplicateMismatch) {
      return {
        success: true,
        message: "Giao dịch đã được ghi nhận đối soát trước đó",
        sepayTxnId,
        ignored: true,
      };
    }
    if (error?.code === 11000) {
      if (error.keyPattern?.invoiceId && !error.keyPattern?.sepayTxnId) {
        logReconciliation("DUPLICATE_INVOICE_PAYMENT", {
          sepayTxnId,
          invoiceId: invoice._id,
          invoiceCode,
          amount,
          bankName,
          paidAt,
        });
        return {
          success: true,
          message: "Hóa đơn đã được ghi nhận thanh toán trước đó, bỏ qua giao dịch trùng",
          sepayTxnId,
          ignored: true,
        };
      }
      return {
        success: true,
        message: "Giao dịch đã được xử lý trước đó",
        sepayTxnId,
        ignored: true,
      };
    }
    throw error;
  }

  // 6. Lấy thông tin phòng, tòa, Admin, Customer để gửi thông báo SAU KHI transaction đã commit
  const room = invoice.contractId?.roomId;
  const building = room?.buildingId;
  const roomNumber = room?.roomNumber || "Phòng";
  const deliveryWarnings = [];

  let adminUsers = [];
  let representative = null;
  try {
    [adminUsers, representative] = await Promise.all([
      User.find({
        roleId: ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
      }).select("_id"),
      Occupant.findOne({
        contractId: invoice.contractId?._id,
        isRepresentative: true,
      }),
    ]);
  } catch (error) {
    console.error("[SePay Post-Commit Lookup Error]:", error.message);
    deliveryWarnings.push("Không tra cứu được người nhận thông báo");
  }

  // Trường hợp chuyển thiếu hoặc thừa (!== totalAmount): giữ PENDING và cảnh báo Manager, Admin, Customer
  if (!isExactAmount) {
    const expectedStr = expectedAmount.toLocaleString("vi-VN");
    const amountStr = amount.toLocaleString("vi-VN");

    const managerTitle = isUnderpaid
      ? `Phòng ${roomNumber} chuyển thiếu tiền hóa đơn`
      : `Phòng ${roomNumber} chuyển thừa tiền hóa đơn`;
    const managerMessage = isUnderpaid
      ? `Phòng ${roomNumber} chuyển ${amountStr} đ cho hóa đơn ${invoice.invoiceCode} (chưa đủ ${expectedStr} đ). Hóa đơn vẫn Chờ thanh toán.`
      : `Phòng ${roomNumber} chuyển ${amountStr} đ cho hóa đơn ${invoice.invoiceCode} (vượt quá ${expectedStr} đ). Hóa đơn chưa được gạch nợ, vui lòng liên hệ khách xử lý hoàn tiền thừa.`;

    const adminTitle = isUnderpaid
      ? `Giao dịch chưa đủ tiền — ${invoice.invoiceCode}`
      : `Giao dịch chuyển thừa tiền — ${invoice.invoiceCode}`;
    const adminMessage = isUnderpaid
      ? `Phòng ${roomNumber} chuyển ${amountStr} đ cho hóa đơn ${invoice.invoiceCode} (tổng ${expectedStr} đ). Hóa đơn chưa được gạch nợ.`
      : `Phòng ${roomNumber} chuyển ${amountStr} đ cho hóa đơn ${invoice.invoiceCode} (tổng ${expectedStr} đ). Hóa đơn chưa được gạch nợ do sai lệch số tiền.`;

    const customerTitle = isUnderpaid
      ? "Số tiền chuyển khoản chưa đủ"
      : "Số tiền chuyển khoản không khớp hóa đơn";
    const customerMessage = isUnderpaid
      ? `Giao dịch ${amountStr} đ cho hóa đơn ${invoice.invoiceCode} chưa đủ số tiền (${expectedStr} đ). Hóa đơn chưa được gạch nợ, vui lòng chuyển đúng số tiền theo mã QR.`
      : `Giao dịch ${amountStr} đ cho hóa đơn ${invoice.invoiceCode} vượt quá số tiền hóa đơn (${expectedStr} đ). Hóa đơn chưa được gạch nợ, vui lòng liên hệ quản lý để được hỗ trợ.`;

    if (building?.managerId) {
      await safeNotify(
        notifyFn,
        {
          userIds: [building.managerId],
          type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
          title: managerTitle,
          message: managerMessage,
          refId: invoice._id,
        },
        deliveryWarnings,
        "Manager",
      );
    }

    if (adminUsers.length > 0) {
      await safeNotify(
        notifyFn,
        {
          userIds: adminUsers.map((a) => a._id),
          type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
          title: adminTitle,
          message: adminMessage,
          refId: invoice._id,
        },
        deliveryWarnings,
        "Admin",
      );
    }

    if (representative?.userId) {
      await safeNotify(
        notifyFn,
        {
          userIds: [representative.userId],
          type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
          title: customerTitle,
          message: customerMessage,
          refId: invoice._id,
        },
        deliveryWarnings,
        "Customer",
      );
    }

    return {
      success: true,
      underpaid: isUnderpaid,
      overpaid: isOverpaid,
      message: isUnderpaid
        ? "Số tiền chuyển khoản chưa đủ so với hóa đơn, giữ trạng thái Chờ thanh toán"
        : "Số tiền chuyển khoản vượt quá hóa đơn, giữ trạng thái Chờ thanh toán",
      invoiceCode,
      amount,
      expectedAmount,
      payment: null,
      ...(deliveryWarnings.length > 0 && { warning: deliveryWarnings.join("; ") }),
    };
  }

  // Trường hợp chuyển khớp chính xác (=== totalAmount): hóa đơn thành PAID (gửi thông báo UC-42 an toàn)
  const statusLabel = calculateOverdueLabel(paidAt, invoice.dueDate);

  if (building?.managerId) {
    await safeNotify(
      notifyFn,
      {
        userIds: [building.managerId],
        type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
        title: "Hóa đơn đã được thanh toán",
        message: `Phòng ${roomNumber} đã thanh toán hóa đơn tháng ${invoice.month} — ${amount.toLocaleString("vi-VN")} đ (${statusLabel}).`,
        refId: invoice._id,
      },
      deliveryWarnings,
      "Manager",
    );
  }

  if (adminUsers.length > 0) {
    await safeNotify(
      notifyFn,
      {
        userIds: adminUsers.map((a) => a._id),
        type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
        title: "Tiền về tài khoản",
        message: `Giao dịch ${amount.toLocaleString("vi-VN")} đ về tài khoản — hóa đơn ${invoice.invoiceCode} phòng ${roomNumber} đã thanh toán (${statusLabel}).`,
        refId: invoice._id,
      },
      deliveryWarnings,
      "Admin",
    );
  }

  if (representative?.userId) {
    await safeNotify(
      notifyFn,
      {
        userIds: [representative.userId],
        type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
        title: "Thanh toán thành công",
        message: `Hóa đơn ${invoice.invoiceCode} tháng ${invoice.month} đã thanh toán thành công — ${amount.toLocaleString("vi-VN")} đ (${statusLabel}).`,
        refId: invoice._id,
      },
      deliveryWarnings,
      "Customer",
    );
  }

  // 8. Gửi email xác nhận thanh toán cho Customer (UC-42) — lỗi email không làm mất giao dịch đã commit
  try {
    const customerEmail = await getRepresentativeRecipientEmail(
      invoice.contractId?._id,
      invoice.contractId?.representativeEmail,
    );
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

      const mailSent = await sendMailFn(
        customerEmail,
        `[Housify] Xác nhận thanh toán hóa đơn ${invoice.invoiceCode}`,
        emailHtml,
      );
      if (!mailSent) {
        console.error(`[SePay Mail Error] Gửi email xác nhận hóa đơn ${invoice.invoiceCode} thất bại`);
        deliveryWarnings.push("Gửi email xác nhận thất bại");
      }
    }
  } catch (error) {
    console.error(`[SePay Mail Error] Gửi email xác nhận hóa đơn ${invoice.invoiceCode}:`, error.message);
    deliveryWarnings.push("Gửi email xác nhận thất bại");
  }

  return {
    success: true,
    message: "Thanh toán hóa đơn thành công",
    invoiceCode,
    amount,
    statusLabel,
    payment: newPayment,
    ...(deliveryWarnings.length > 0 && { warning: deliveryWarnings.join("; ") }),
  };
};

// Lấy danh sách lịch sử thanh toán theo phạm vi quyền của Manager hoặc Customer (UC-39)
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
    // Customer: Xem các hợp đồng mà mình từng là người đại diện; nếu truyền roomId thì lọc đúng phòng đó và chặn phòng người khác
    const contractIds = await Occupant.distinct("contractId", {
      userId: user._id,
      isRepresentative: true,
    });
    if (roomId) {
      const roomExists = await Room.exists({ _id: roomId, isDeleted: false });
      if (!roomExists) {
        throw new AppError("Không tìm thấy phòng", 404);
      }
      const matchedContracts =
        contractIds.length > 0
          ? await Contract.find({ _id: { $in: contractIds }, roomId }).select("_id").lean()
          : [];
      if (matchedContracts.length === 0) {
        throw new AppError("Bạn không có quyền xem lịch sử thanh toán của phòng khác", 403);
      }
      invoiceFilter.contractId = { $in: matchedContracts.map((c) => c._id) };
    } else {
      if (contractIds.length === 0) {
        return emptyResult;
      }
      invoiceFilter.contractId = { $in: contractIds };
    }
  } else if (userRole === ROLE.MANAGER) {
    // Manager: Xem các phòng thuộc tòa mình phụ trách (phòng tòa khác trả 403)
    const managerBuilding = await Building.findOne({
      managerId: user._id,
      isDeleted: false,
    });
    if (!managerBuilding) {
      throw new AppError("Bạn chưa được phân công phụ trách tòa nhà nào", 403);
    }
    let targetRoomIds;
    if (roomId) {
      const targetRoom = await Room.findOne({ _id: roomId, isDeleted: false })
        .select("buildingId")
        .lean();
      if (!targetRoom) {
        throw new AppError("Không tìm thấy phòng", 404);
      }
      if (String(targetRoom.buildingId) !== String(managerBuilding._id)) {
        throw new AppError(
          "Bạn không có quyền xem lịch sử thanh toán của phòng thuộc tòa nhà khác",
          403,
        );
      }
      targetRoomIds = [targetRoom._id];
    } else {
      targetRoomIds = await Room.distinct("_id", { buildingId: managerBuilding._id });
    }
    const contracts = await Contract.find({
      roomId: { $in: targetRoomIds },
    }).select("_id");
    invoiceFilter.contractId = { $in: contracts.map((c) => c._id) };
  } else if (roomId) {
    // Admin: hỗ trợ lọc theo roomId (trả 404 đồng nhất nếu mã phòng không tồn tại)
    const targetRoom = await Room.exists({ _id: roomId, isDeleted: false });
    if (!targetRoom) {
      throw new AppError("Không tìm thấy phòng", 404);
    }
    const contracts = await Contract.find({ roomId }).select("_id");
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

  const missingRepCccds = [
    ...new Set(
      payments
        .filter((p) => {
          const cId = p.invoiceId?.contractId?._id?.toString();
          return cId && !repMap.has(cId) && p.invoiceId?.contractId?.representativeCccd;
        })
        .map((p) => p.invoiceId.contractId.representativeCccd),
    ),
  ];

  const fallbackRepMap = new Map();
  if (missingRepCccds.length > 0) {
    const fallbackReps = await Occupant.find({
      cccd: { $in: missingRepCccds },
      isRepresentative: true,
    })
      .sort({ createdAt: -1 })
      .select("name phone cccd")
      .lean();
    for (const occ of fallbackReps) {
      if (!fallbackRepMap.has(occ.cccd)) {
        fallbackRepMap.set(occ.cccd, occ);
      }
    }
  }

  // 4. Định dạng dữ liệu trả về và tính nhãn "Đúng hạn" / "Quá hạn X ngày"
  const items = payments.map((p) => {
    const inv = p.invoiceId;
    const contract = inv?.contractId;
    const room = contract?.roomId;
    const building = room?.buildingId;
    const cId = contract?._id?.toString();
    const rep =
      (cId ? repMap.get(cId) : null) ||
      (contract?.representativeCccd ? fallbackRepMap.get(contract.representativeCccd) : null);
    const bManager = building?.managerId ? managerMap.get(building.managerId.toString()) : null;
    const isUnderpaid = inv && Number(p.amount) < Number(inv.totalAmount);
    const isOverpaid = inv && Number(p.amount) > Number(inv.totalAmount);
    const paymentStatus = isUnderpaid ? "UNDERPAID" : isOverpaid ? "OVERPAID" : "EXACT";
    const statusLabel = isUnderpaid
      ? "Chuyển thiếu (chưa gạch nợ)"
      : isOverpaid
        ? "Chuyển thừa (chưa gạch nợ)"
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

// Lấy chi tiết một biên lai thanh toán kèm thông tin hóa đơn, phòng, tòa nhà và người đại diện (UC-39)
export const getPaymentById = async (id, user) => {
  // Truy vấn giao dịch và populate ngược lên hóa đơn, hợp đồng, phòng, tòa nhà
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

  // Kiểm tra quyền xem: Manager chỉ xem biên lai thuộc tòa mình, Customer chỉ xem biên lai thuộc hợp đồng của mình
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

  // Lấy thêm tên, SĐT người đại diện và Manager phụ trách tòa để hiển thị trên biên lai
  const rep = contract?._id
    ? await Occupant.findOne({ contractId: contract._id, isRepresentative: true }).select("name phone cccd")
    : null;
  const fallbackRep = !rep && contract?.representativeCccd
    ? await Occupant.findOne({
        cccd: contract.representativeCccd,
        isRepresentative: true,
      })
        .sort({ createdAt: -1 })
        .select("name phone cccd")
    : null;

  const bManager = building?.managerId
    ? await Manager.findOne({ userId: building.managerId }).select("name phone")
    : null;

  const repInfo = rep || fallbackRep;

  // Xác định trạng thái khớp tiền (đủ, thiếu, thừa) và nhãn hiển thị tương ứng
  const isUnderpaid = inv && Number(payment.amount) < Number(inv.totalAmount);
  const isOverpaid = inv && Number(payment.amount) > Number(inv.totalAmount);
  const paymentStatus = isUnderpaid ? "UNDERPAID" : isOverpaid ? "OVERPAID" : "EXACT";
  const statusLabel = isUnderpaid
    ? "Chuyển thiếu (chưa gạch nợ)"
    : isOverpaid
      ? "Chuyển thừa (chưa gạch nợ)"
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
    representativeName: repInfo?.name || "",
    representativePhone: repInfo?.phone || "",
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
          name: repInfo?.name || "",
          phone: repInfo?.phone || "",
          email: contract?.representativeEmail || "",
          cccd: contract?.representativeCccd || repInfo?.cccd || "",
        },
        representativeName: repInfo?.name || "",
        representativePhone: repInfo?.phone || "",
      }
      : null,
  };
};

// Tạo payload giả lập và gọi lại trực tiếp hàm xử lý webhook để test ở môi trường dev
export const simulateSepay = async (data) => {
  const { invoiceCode, amount } = data;

  const mockPayload = {
    id: `DEV_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    gateway: "TPBank",
    transactionDate: new Date().toISOString(),
    accountNumber: env.BANK_ACCOUNT_NO || undefined,
    content: `${invoiceCode} thanh toan test`,
    transferType: "in",
    transferAmount: Number(amount),
  };

  return processSepayWebhook(mockPayload);
};
