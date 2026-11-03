// Service xử lý nghiệp vụ cho module invoice (UC-34, UC-35, UC-36, UC-37)
import Invoice from "../../models/Invoice.js";
import Contract from "../../models/Contract.js";
import Room from "../../models/Room.js";
import Building from "../../models/Building.js";
import Service from "../../models/Service.js";
import Occupant from "../../models/Occupant.js";
import { getCurrentPrice } from "../../helpers/getCurrentPrice.js";
import { notify } from "../../helpers/notify.js";
import { sendMail } from "../../config/mail.js";
import { env } from "../../config/env.js";
import {
  ROLE,
  CONTRACT_STATUS,
  INVOICE_STATUS,
  INVOICE_ITEM_TYPE,
  NOTIFICATION_TYPE,
} from "../../constants/enums.js";
import AppError from "../../utils/AppError.js";

const generateInvoiceCode = async (month) => {
  const [yearStr, monthStr] = month.split("-");
  const yymm = `${yearStr.slice(2)}${monthStr}`;
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  while (true) {
    let randomPart = "";
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `HD${yymm}${randomPart}`;
    const exists = await Invoice.findOne({ invoiceCode: code });
    if (!exists) return code;
  }
};

/**
 * Helper: Lấy tòa nhà mà Manager đang phụ trách
 */
const getManagerBuilding = async (userId) => {
  const building = await Building.findOne({
    managerId: userId,
    isDeleted: false,
  });
  if (!building) {
    throw new AppError("Bạn chưa được phân công phụ trách tòa nhà nào", 403);
  }
  return building;
};

/**
 * Helper: Tính toán trạng thái Quá hạn động (isOverdue) khi trả về client (BR-101)
 * Không lưu trường này trong MongoDB
 */
const formatInvoiceData = (invoiceDoc) => {
  const obj = invoiceDoc.toObject ? invoiceDoc.toObject() : { ...invoiceDoc };
  const now = new Date();

  // Quá hạn khi: trạng thái PENDING và ngày hiện tại đã vượt quá dueDate
  if (obj.status === INVOICE_STATUS.PENDING && obj.dueDate) {
    obj.isOverdue = now > new Date(obj.dueDate);
  } else {
    obj.isOverdue = false;
  }

  // Đã thanh toán: kiểm tra xem có nộp muộn không
  if (obj.status === INVOICE_STATUS.PAID && obj.paidAt && obj.dueDate) {
    obj.isPaidLate = new Date(obj.paidAt) > new Date(obj.dueDate);
  }

  return obj;
};

/**
 * UC-34: Lấy dữ liệu gợi ý trước khi lập hóa đơn (Prefill)
 * GET /api/invoices/prefill?contractId=&month=
 */
export const getPrefill = async (query, user) => {
  const { contractId, month } = query;

  // 1. Kiểm tra hợp đồng
  const contract = await Contract.findById(contractId).populate("roomId");
  if (!contract) {
    throw new AppError("Không tìm thấy hợp đồng", 404);
  }
  if (contract.status !== CONTRACT_STATUS.ACTIVE) {
    throw new AppError(
      "Chỉ có thể lập hóa đơn cho hợp đồng đang có hiệu lực (ACTIVE)",
      400,
    );
  }

  // 2. Quyền Manager: chỉ lập cho phòng thuộc tòa nhà mình quản lý
  const room = contract.roomId;
  if (user.roleId === ROLE.MANAGER) {
    const managerBuilding = await getManagerBuilding(user._id);
    if (room.buildingId.toString() !== managerBuilding._id.toString()) {
      throw new AppError(
        "Bạn không có quyền lập hóa đơn cho phòng thuộc tòa nhà khác",
        403,
      );
    }
  }

  const warnings = [];

  // 3. Kiểm tra xem đã có hóa đơn DRAFT hoặc PENDING trong cùng tháng chưa
  const existingInvoice = await Invoice.findOne({
    contractId,
    month,
    status: { $in: [INVOICE_STATUS.DRAFT, INVOICE_STATUS.PENDING] },
  });

  let hasExistingInvoice = false;
  if (existingInvoice) {
    hasExistingInvoice = true;
    const statusText =
      existingInvoice.status === INVOICE_STATUS.DRAFT
        ? "Nháp"
        : "Chờ thanh toán";
    warnings.push(
      `Phòng này đã có hóa đơn [${statusText}] trong tháng ${month}. Bạn có thể chỉnh sửa hóa đơn cũ hoặc chọn tiếp tục tạo thêm.`,
    );
  }

  // 4. Tìm hóa đơn kỳ trước để lấy chỉ số điện/nước cũ
  const previousInvoice = await Invoice.findOne({
    contractId,
    month: { $lt: month },
    status: { $ne: INVOICE_STATUS.CANCELLED },
  }).sort({ month: -1 });

  // 5. Chuẩn bị danh sách các dòng tiền gợi ý (items)
  const items = [];

  // 5.1. Dòng tiền phòng (RENT): lấy từ giá thuê chốt trên hợp đồng
  items.push({
    type: INVOICE_ITEM_TYPE.RENT,
    description: `Tiền thuê phòng tháng ${month}`,
    quantity: 1,
    unitPrice: contract.rentPrice,
    amount: contract.rentPrice,
  });

  // 5.2. Lấy danh sách dịch vụ của tòa nhà
  const allServices = await Service.find({ isDeleted: false });
  const checkDate = new Date();

  for (const service of allServices) {
    const priceDoc = await getCurrentPrice(
      service._id,
      room.buildingId,
      checkDate,
    );
    const unitPrice = priceDoc ? priceDoc.unitPrice : 0;

    if (!priceDoc) {
      warnings.push(
        `Chưa có đơn giá cho dịch vụ [${service.name}] tại tòa nhà này. Giá tạm tính là 0đ.`,
      );
    }

    if (service.isFixed) {
      // Phí cố định: gửi xe, rác, wifi...
      items.push({
        serviceId: service._id,
        type: INVOICE_ITEM_TYPE.FIXED,
        description: service.name,
        quantity: 1,
        unitPrice,
        amount: unitPrice,
      });
    } else {
      // Phí theo chỉ số: điện, nước
      let oldReading = 0;
      if (previousInvoice && Array.isArray(previousInvoice.items)) {
        const prevItem = previousInvoice.items.find(
          (it) =>
            it.serviceId && it.serviceId.toString() === service._id.toString(),
        );
        if (prevItem && prevItem.newReading !== undefined) {
          oldReading = prevItem.newReading;
        }
      }

      items.push({
        serviceId: service._id,
        type: INVOICE_ITEM_TYPE.METERED,
        description: service.name,
        oldReading,
        newReading: null, // Để Manager nhập chỉ số mới ở giao diện
        quantity: 0,
        unitPrice,
        amount: 0,
      });
    }
  }

  return {
    contract: {
      _id: contract._id,
      roomNumber: room.roomNumber,
      rentPrice: contract.rentPrice,
      representativeEmail: contract.representativeEmail,
    },
    month,
    hasExistingInvoice,
    existingInvoiceId: existingInvoice ? existingInvoice._id : null,
    items,
    warnings,
  };
};

/**
 * UC-34: Tạo hóa đơn đơn lẻ (Lưu nháp)
 * POST /api/invoices
 */
export const createInvoice = async (data, user) => {
  const { contractId, month, items, confirmDuplicate } = data;

  // 1. Kiểm tra hợp đồng
  const contract = await Contract.findById(contractId).populate("roomId");
  if (!contract) {
    throw new AppError("Không tìm thấy hợp đồng", 404);
  }
  if (contract.status !== CONTRACT_STATUS.ACTIVE) {
    throw new AppError(
      "Chỉ có thể lập hóa đơn cho hợp đồng đang có hiệu lực (ACTIVE)",
      400,
    );
  }

  // 2. Quyền Manager
  const room = contract.roomId;
  if (user.roleId === ROLE.MANAGER) {
    const managerBuilding = await getManagerBuilding(user._id);
    if (room.buildingId.toString() !== managerBuilding._id.toString()) {
      throw new AppError("Bạn không có quyền lập hóa đơn cho phòng này", 403);
    }
  }

  // 3. Cảnh báo trùng kỳ hóa đơn (HTTP 409)
  const existing = await Invoice.findOne({
    contractId,
    month,
    status: { $in: [INVOICE_STATUS.DRAFT, INVOICE_STATUS.PENDING] },
  });

  if (existing && !confirmDuplicate) {
    const statusText =
      existing.status === INVOICE_STATUS.DRAFT ? "Nháp" : "Chờ thanh toán";
    throw new AppError(
      `Phòng này đã có hóa đơn [${statusText}] trong tháng ${month}. Bạn có chắc chắn muốn tạo thêm hóa đơn mới không?`,
      409,
    );
  }

  // 4. Server tự tính toán từng dòng tiền và tổng số tiền (BR-095)
  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    let quantity = Number(item.quantity) || 0;
    let unitPrice = Number(item.unitPrice) || 0;
    let oldReading =
      item.oldReading !== undefined ? Number(item.oldReading) : undefined;
    let newReading =
      item.newReading !== undefined ? Number(item.newReading) : undefined;

    if (item.type === INVOICE_ITEM_TYPE.METERED) {
      if (oldReading === undefined || newReading === undefined) {
        throw new AppError(
          `Dịch vụ ${item.description} yêu cầu nhập cả chỉ số cũ và chỉ số mới`,
          422,
        );
      }
      if (newReading < oldReading) {
        throw new AppError(
          `Chỉ số mới của [${item.description}] phải lớn hơn hoặc bằng chỉ số cũ (${newReading} < ${oldReading})`,
          422,
        );
      }
      quantity = newReading - oldReading;
    }

    if (item.type === INVOICE_ITEM_TYPE.RENT) {
      unitPrice = contract.rentPrice; // Chốt tiền phòng theo hợp đồng
      quantity = 1;
    }

    const amount = quantity * unitPrice;
    totalAmount += amount;

    processedItems.push({
      serviceId: item.serviceId || undefined,
      type: item.type,
      description: item.description,
      oldReading,
      newReading,
      quantity,
      unitPrice,
      amount,
    });
  }

  // 5. Sinh mã hóa đơn duy nhất
  const invoiceCode = await generateInvoiceCode(month);

  // 6. Lưu hóa đơn ở trạng thái DRAFT
  const invoice = await Invoice.create({
    invoiceCode,
    contractId,
    month,
    items: processedItems,
    totalAmount,
    status: INVOICE_STATUS.DRAFT,
    createdBy: user._id,
  });

  return invoice;
};

/**
 * UC-34: Tạo hóa đơn hàng loạt cho nhiều phòng
 * POST /api/invoices/bulk
 */
export const createBulkInvoices = async (data, user) => {
  const { contractIds, month } = data;

  const managerBuilding =
    user.roleId === ROLE.MANAGER ? await getManagerBuilding(user._id) : null;
  const allServices = await Service.find({ isDeleted: false });
  const checkDate = new Date();

  const createdInvoices = [];
  const errors = [];

  for (const contractId of contractIds) {
    try {
      const contract = await Contract.findById(contractId).populate("roomId");
      if (!contract || contract.status !== CONTRACT_STATUS.ACTIVE) {
        errors.push({
          contractId,
          message: "Hợp đồng không tồn tại hoặc không ACTIVE",
        });
        continue;
      }

      const room = contract.roomId;
      if (
        managerBuilding &&
        room.buildingId.toString() !== managerBuilding._id.toString()
      ) {
        errors.push({
          contractId,
          message: "Phòng không thuộc tòa nhà bạn phụ trách",
        });
        continue;
      }

      // Lấy chỉ số điện nước cũ từ hóa đơn kỳ trước
      const prevInvoice = await Invoice.findOne({
        contractId,
        month: { $lt: month },
        status: { $ne: INVOICE_STATUS.CANCELLED },
      }).sort({ month: -1 });

      const items = [];
      let totalAmount = 0;

      // 1. Tiền phòng
      items.push({
        type: INVOICE_ITEM_TYPE.RENT,
        description: `Tiền thuê phòng tháng ${month}`,
        quantity: 1,
        unitPrice: contract.rentPrice,
        amount: contract.rentPrice,
      });
      totalAmount += contract.rentPrice;

      // 2. Phí dịch vụ tòa
      for (const service of allServices) {
        const priceDoc = await getCurrentPrice(
          service._id,
          room.buildingId,
          checkDate,
        );
        const unitPrice = priceDoc ? priceDoc.unitPrice : 0;

        if (service.isFixed) {
          items.push({
            serviceId: service._id,
            type: INVOICE_ITEM_TYPE.FIXED,
            description: service.name,
            quantity: 1,
            unitPrice,
            amount: unitPrice,
          });
          totalAmount += unitPrice;
        } else {
          // Điện nước: tạm thời gán chỉ số mới = chỉ số cũ, số lượng = 0 để nhập sau
          let oldReading = 0;
          if (prevInvoice && Array.isArray(prevInvoice.items)) {
            const prevItem = prevInvoice.items.find(
              (it) =>
                it.serviceId &&
                it.serviceId.toString() === service._id.toString(),
            );
            if (prevItem && prevItem.newReading !== undefined) {
              oldReading = prevItem.newReading;
            }
          }

          items.push({
            serviceId: service._id,
            type: INVOICE_ITEM_TYPE.METERED,
            description: service.name,
            oldReading,
            newReading: oldReading,
            quantity: 0,
            unitPrice,
            amount: 0,
          });
        }
      }

      const invoiceCode = await generateInvoiceCode(month);
      const invoice = await Invoice.create({
        invoiceCode,
        contractId,
        month,
        items,
        totalAmount,
        status: INVOICE_STATUS.DRAFT,
        createdBy: user._id,
      });

      createdInvoices.push(invoice);
    } catch (err) {
      errors.push({ contractId, message: err.message });
    }
  }

  return {
    totalCreated: createdInvoices.length,
    invoices: createdInvoices,
    errors,
  };
};

/**
 * UC-34: Sửa hóa đơn nháp
 * PUT /api/invoices/:id
 */
export const updateInvoice = async (id, data, user) => {
  const invoice = await Invoice.findById(id).populate({
    path: "contractId",
    populate: { path: "roomId" },
  });

  if (!invoice) {
    throw new AppError("Không tìm thấy hóa đơn", 404);
  }

  // Chỉ cho phép sửa khi còn DRAFT
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new AppError(
      "Chỉ có thể chỉnh sửa hóa đơn khi đang ở trạng thái Nháp (DRAFT)",
      400,
    );
  }

  // Kiểm tra quyền Manager
  if (user.roleId === ROLE.MANAGER) {
    const managerBuilding = await getManagerBuilding(user._id);
    const room = invoice.contractId?.roomId;
    if (room && room.buildingId.toString() !== managerBuilding._id.toString()) {
      throw new AppError("Bạn không có quyền sửa hóa đơn này", 403);
    }
  }

  const { items } = data;
  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    let quantity = Number(item.quantity) || 0;
    let unitPrice = Number(item.unitPrice) || 0;
    let oldReading =
      item.oldReading !== undefined ? Number(item.oldReading) : undefined;
    let newReading =
      item.newReading !== undefined ? Number(item.newReading) : undefined;

    if (item.type === INVOICE_ITEM_TYPE.METERED) {
      if (oldReading === undefined || newReading === undefined) {
        throw new AppError(
          `Dịch vụ ${item.description} yêu cầu nhập cả chỉ số cũ và mới`,
          422,
        );
      }
      if (newReading < oldReading) {
        throw new AppError(
          `Chỉ số mới của [${item.description}] phải lớn hơn hoặc bằng chỉ số cũ`,
          422,
        );
      }
      quantity = newReading - oldReading;
    }

    if (item.type === INVOICE_ITEM_TYPE.RENT) {
      unitPrice = invoice.contractId.rentPrice;
      quantity = 1;
    }

    const amount = quantity * unitPrice;
    totalAmount += amount;

    processedItems.push({
      serviceId: item.serviceId || undefined,
      type: item.type,
      description: item.description,
      oldReading,
      newReading,
      quantity,
      unitPrice,
      amount,
    });
  }

  invoice.items = processedItems;
  invoice.totalAmount = totalAmount;
  await invoice.save();

  return invoice;
};

/**
 * UC-35: Gửi hóa đơn (Chuyển sang PENDING, sinh VietQR, gửi mail & chuông)
 * POST /api/invoices/:id/send
 */
export const sendInvoice = async (id, user) => {
  const invoice = await Invoice.findById(id).populate({
    path: "contractId",
    populate: { path: "roomId" },
  });

  if (!invoice) {
    throw new AppError("Không tìm thấy hóa đơn", 404);
  }

  // 1. Chỉ gửi hóa đơn DRAFT
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new AppError(
      "Chỉ có thể gửi hóa đơn đang ở trạng thái Nháp (DRAFT)",
      400,
    );
  }

  // 2. Hợp đồng phải đang ACTIVE
  const contract = invoice.contractId;
  if (!contract || contract.status !== CONTRACT_STATUS.ACTIVE) {
    throw new AppError(
      "Hợp đồng của hóa đơn này không còn hiệu lực (phải ACTIVE)",
      400,
    );
  }

  // 3. Quyền Manager
  if (user.roleId === ROLE.MANAGER) {
    const managerBuilding = await getManagerBuilding(user._id);
    const room = contract.roomId;
    if (room && room.buildingId.toString() !== managerBuilding._id.toString()) {
      throw new AppError(
        "Bạn không có quyền gửi hóa đơn của tòa nhà khác",
        403,
      );
    }
  }

  // 4. Sinh mã QR VietQR chuẩn quicklink
  const bankId = env.BANK_ID || "970422"; // Mặc định MBBank
  const accountNo = env.BANK_ACCOUNT_NO || "";
  const accountName = env.BANK_ACCOUNT_NAME || "";
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${invoice.totalAmount}&addInfo=${invoice.invoiceCode}&accountName=${encodeURIComponent(accountName)}`;

  // 5. Cập nhật trạng thái PENDING và hạn nộp (+7 ngày)
  const now = new Date();
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  invoice.status = INVOICE_STATUS.PENDING;
  invoice.qrContent = qrUrl;
  invoice.sentAt = now;
  invoice.dueDate = dueDate;
  await invoice.save();

  let warning = null;

  // 6. Báo chuông in-app cho người đại diện
  const representative = await Occupant.findOne({
    contractId: contract._id,
    isRepresentative: true,
  });

  if (representative && representative.userId) {
    await notify({
      userIds: [representative.userId],
      type: NOTIFICATION_TYPE.INVOICE_SENT,
      title: `Hóa đơn tiền phòng tháng ${invoice.month}`,
      message: `Hóa đơn ${invoice.invoiceCode} đã được gửi. Tổng tiền: ${invoice.totalAmount.toLocaleString("vi-VN")} đ. Hạn thanh toán đến ngày ${dueDate.toLocaleDateString("vi-VN")}.`,
      refId: invoice._id,
      createdBy: user._id,
    });
  }

  // 7. Gửi email kèm QR cho khách thuê (Lỗi mail vẫn tiếp tục PENDING)
  const recipientEmail = contract.representativeEmail;
  if (recipientEmail) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Thông báo hóa đơn tiền phòng tháng ${invoice.month}</h2>
        <p>Xin chào quý khách,</p>
        <p>Hệ thống Housify xin gửi thông báo hóa đơn tiền phòng chi tiết như sau:</p>
        <ul>
          <li><b>Mã hóa đơn:</b> ${invoice.invoiceCode}</li>
          <li><b>Kỳ thanh toán:</b> Tháng ${invoice.month}</li>
          <li><b>Tổng số tiền:</b> <span style="color: #e53e3e; font-size: 16px; font-weight: bold;">${invoice.totalAmount.toLocaleString("vi-VN")} VNĐ</span></li>
          <li><b>Hạn chót thanh toán:</b> ${dueDate.toLocaleDateString("vi-VN")}</li>
        </ul>
        <p>Quý khách vui lòng quét mã VietQR bên dưới để thanh toán nhanh:</p>
        <div style="margin: 20px 0;">
          <img src="${qrUrl}" alt="Mã VietQR thanh toán" style="max-width: 320px; border: 1px solid #ddd; border-radius: 8px;" />
        </div>
        <p><i>Lưu ý: Giữ nguyên nội dung chuyển khoản để hệ thống tự động gạch nợ.</i></p>
      </div>
    `;

    const mailSent = await sendMail(
      recipientEmail,
      `[Housify] Hóa đơn ${invoice.invoiceCode} tháng ${invoice.month}`,
      emailHtml,
    );
    if (!mailSent) {
      warning =
        "Gửi hóa đơn thành công nhưng gửi email thông báo thất bại. Bạn có thể gửi lại thông báo sau.";
    }
  }

  return { invoice: formatInvoiceData(invoice), warning };
};

/**
 * UC-35: Gửi lại thông báo & email cho hóa đơn PENDING (Nút gửi lại thông báo)
 * POST /api/invoices/:id/resend-notification
 */
export const resendNotification = async (id, user) => {
  const invoice = await Invoice.findById(id).populate({
    path: "contractId",
    populate: { path: "roomId" },
  });

  if (!invoice) {
    throw new AppError("Không tìm thấy hóa đơn", 404);
  }

  if (invoice.status !== INVOICE_STATUS.PENDING) {
    throw new AppError(
      "Chỉ có thể gửi lại thông báo cho hóa đơn đang Chờ thanh toán (PENDING)",
      400,
    );
  }

  const contract = invoice.contractId;
  const representative = await Occupant.findOne({
    contractId: contract._id,
    isRepresentative: true,
  });

  // 1. Gửi lại chuông in-app
  if (representative?.userId) {
    await notify({
      userIds: [representative.userId],
      type: NOTIFICATION_TYPE.INVOICE_SENT,
      title: `[Nhắc lại] Hóa đơn tiền phòng tháng ${invoice.month}`,
      message: `Hóa đơn ${invoice.invoiceCode} cần được thanh toán. Tổng tiền: ${invoice.totalAmount.toLocaleString("vi-VN")} đ. Hạn thanh toán: ${new Date(invoice.dueDate).toLocaleDateString("vi-VN")}.`,
      refId: invoice._id,
      createdBy: user._id,
    });
  }

  // 2. Gửi lại email kèm QR
  let warning = null;
  const recipientEmail = contract?.representativeEmail;
  if (recipientEmail) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>[Nhắc lại] Thông báo hóa đơn tiền phòng tháng ${invoice.month}</h2>
        <p>Xin chào quý khách,</p>
        <p>Hệ thống xin gửi lại thông tin hóa đơn tiền phòng của quý khách:</p>
        <ul>
          <li><b>Mã hóa đơn:</b> ${invoice.invoiceCode}</li>
          <li><b>Tổng tiền:</b> <span style="color: #e53e3e; font-size: 16px; font-weight: bold;">${invoice.totalAmount.toLocaleString("vi-VN")} VNĐ</span></li>
          <li><b>Hạn thanh toán:</b> ${new Date(invoice.dueDate).toLocaleDateString("vi-VN")}</li>
        </ul>
        <p>Quét mã VietQR bên dưới để thanh toán:</p>
        <div style="margin: 20px 0;">
          <img src="${invoice.qrContent}" alt="VietQR" style="max-width: 320px; border: 1px solid #ddd; border-radius: 8px;" />
        </div>
      </div>
    `;

    const mailSent = await sendMail(
      recipientEmail,
      `[Housify - Gửi lại] Hóa đơn ${invoice.invoiceCode}`,
      emailHtml,
    );
    if (!mailSent) {
      warning = "Gửi lại thông báo thất bại: Không thể kết nối dịch vụ email.";
    }
  }

  return { invoice: formatInvoiceData(invoice), warning };
};

/**
 * UC-36: Lấy danh sách hóa đơn
 * GET /api/invoices
 */
export const getInvoices = async (query, user) => {
  const { status, month, roomId, buildingId, page = 1, limit = 10 } = query;
  const filter = {};

  if (month) filter.month = month;
  if (status) {
    const statusList = status.split(",").map((s) => s.trim());
    filter.status = { $in: statusList };
  }

  // Phân quyền dữ liệu theo vai trò
  if (user.roleId === ROLE.CUSTOMER) {
    // Customer: chỉ xem hóa đơn của hợp đồng mình thuê, KHÔNG xem DRAFT
    const repOccupant = await Occupant.findOne({
      userId: user._id,
      isRepresentative: true,
    });
    if (!repOccupant) {
      return { items: [], total: 0, page: Number(page), limit: Number(limit) };
    }
    filter.contractId = repOccupant.contractId;
    filter.status = filter.status || { $ne: INVOICE_STATUS.DRAFT };
  } else if (user.roleId === ROLE.MANAGER) {
    // Manager: chỉ xem các phòng trong tòa mình phụ trách
    const managerBuilding = await getManagerBuilding(user._id);
    const roomsInBuilding = await Room.find({
      buildingId: managerBuilding._id,
    }).select("_id");
    const roomIds = roomsInBuilding.map((r) => r._id);

    const contracts = await Contract.find({ roomId: { $in: roomIds } }).select(
      "_id",
    );
    const contractIds = contracts.map((c) => c._id);
    filter.contractId = { $in: contractIds };

    if (roomId) {
      const roomContracts = await Contract.find({ roomId }).select("_id");
      filter.contractId = { $in: roomContracts.map((c) => c._id) };
    }
  } else if (buildingId) {
    const rooms = await Room.find({ buildingId }).select("_id");
    const contracts = await Contract.find({
      roomId: { $in: rooms.map((r) => r._id) },
    }).select("_id");
    filter.contractId = { $in: contracts.map((c) => c._id) };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate({
        path: "contractId",
        populate: {
          path: "roomId",
          select: "roomNumber buildingId floorNumber",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Invoice.countDocuments(filter),
  ]);

  const formattedItems = invoices.map(formatInvoiceData);

  return {
    items: formattedItems,
    total,
    page: Number(page),
    limit: Number(limit),
  };
};

/**
 * UC-36: Lấy chi tiết một hóa đơn
 * GET /api/invoices/:id
 */
export const getInvoiceById = async (id, user) => {
  const invoice = await Invoice.findById(id).populate({
    path: "contractId",
    populate: { path: "roomId", populate: { path: "buildingId" } },
  });

  if (!invoice) {
    throw new AppError("Không tìm thấy hóa đơn", 404);
  }

  // Customer không được xem hóa đơn Nháp, và chỉ xem hóa đơn của mình
  if (user.roleId === ROLE.CUSTOMER) {
    if (invoice.status === INVOICE_STATUS.DRAFT) {
      throw new AppError("Bạn không có quyền xem hóa đơn nháp", 403);
    }
    const repOccupant = await Occupant.findOne({
      userId: user._id,
      isRepresentative: true,
    });
    if (
      !repOccupant ||
      invoice.contractId._id.toString() !== repOccupant.contractId.toString()
    ) {
      throw new AppError("Bạn không có quyền xem hóa đơn của phòng khác", 403);
    }
  }

  // Manager chỉ xem hóa đơn thuộc tòa mình
  if (user.roleId === ROLE.MANAGER) {
    const managerBuilding = await getManagerBuilding(user._id);
    const roomBuildingId =
      invoice.contractId?.roomId?.buildingId?._id ||
      invoice.contractId?.roomId?.buildingId;
    if (
      roomBuildingId &&
      roomBuildingId.toString() !== managerBuilding._id.toString()
    ) {
      throw new AppError(
        "Bạn không có quyền xem hóa đơn của tòa nhà khác",
        403,
      );
    }
  }

  return formatInvoiceData(invoice);
};

/**
 * UC-37: Hủy hóa đơn
 * POST /api/invoices/:id/cancel
 */
export const cancelInvoice = async (id, data, user) => {
  const { reason } = data;
  const invoice = await Invoice.findById(id).populate({
    path: "contractId",
    populate: { path: "roomId" },
  });

  if (!invoice) {
    throw new AppError("Không tìm thấy hóa đơn", 404);
  }

  // Tuyệt đối không được hủy hóa đơn đã thanh toán (BR-103)
  if (invoice.status === INVOICE_STATUS.PAID) {
    throw new AppError("Không thể hủy hóa đơn đã thanh toán", 400);
  }

  if (invoice.status === INVOICE_STATUS.CANCELLED) {
    throw new AppError("Hóa đơn này đã bị hủy trước đó", 400);
  }

  // Quyền Manager
  if (user.roleId === ROLE.MANAGER) {
    const managerBuilding = await getManagerBuilding(user._id);
    const room = invoice.contractId?.roomId;
    if (room && room.buildingId.toString() !== managerBuilding._id.toString()) {
      throw new AppError("Bạn không có quyền hủy hóa đơn này", 403);
    }
  }

  const previousStatus = invoice.status;
  invoice.status = INVOICE_STATUS.CANCELLED;
  invoice.cancelReason = reason;
  await invoice.save();

  // Nếu hóa đơn đang PENDING, gửi chuông báo cho khách biết đã hủy
  if (previousStatus === INVOICE_STATUS.PENDING) {
    const representative = await Occupant.findOne({
      contractId: invoice.contractId._id,
      isRepresentative: true,
    });

    if (representative && representative.userId) {
      await notify({
        userIds: [representative.userId],
        type: NOTIFICATION_TYPE.INVOICE_CANCELLED,
        title: `Hóa đơn ${invoice.invoiceCode} đã bị hủy`,
        message: `Hóa đơn tháng ${invoice.month} đã được hủy bởi Quản lý. Lý do: ${reason}`,
        refId: invoice._id,
        createdBy: user._id,
      });
    }
  }

  return formatInvoiceData(invoice);
};
