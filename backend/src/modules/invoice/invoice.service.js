// Service xử lý nghiệp vụ cho module invoice
import Invoice from "../../models/Invoice.js";
import Contract from "../../models/Contract.js";
import Room from "../../models/Room.js";
import Building from "../../models/Building.js";
import Service from "../../models/Service.js";
import ServicePrice from "../../models/ServicePrice.js";
import Occupant from "../../models/Occupant.js";
import User from "../../models/User.js";
import Manager from "../../models/Manager.js";
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

const DUE_DAYS = 7;
const NOTICE_FAILED_MESSAGE =
  "Gửi thông báo thất bại — Customer chưa nhận được";
const CONCURRENT_CHANGE_MESSAGE =
  "Hóa đơn vừa được thay đổi bởi thao tác khác, vui lòng tải lại trang";

// Lấy _id dù trường đã populate hay chưa
const toId = (value) => (value?._id ?? value)?.toString();

const formatMoney = (amount) => Number(amount || 0).toLocaleString("vi-VN");

const formatDate = (date) =>
  new Date(date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

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
    const exists = await Invoice.exists({ invoiceCode: code });
    if (!exists) return code;
  }
};

// Tòa nhà mà Manager đang phụ trách
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

// Manager chỉ được thao tác trên tòa mình phụ trách. Role khác bỏ qua.
const assertManagerOfBuilding = async (user, buildingId, message) => {
  if (user.role !== ROLE.MANAGER) return;
  const managerBuilding = await getManagerBuilding(user._id);
  if (!buildingId || toId(buildingId) !== managerBuilding._id.toString()) {
    throw new AppError(message, 403);
  }
};

// Danh sách hợp đồng mà Customer là người đại diện (có thể nhiều hợp đồng qua các lần thuê)
const getCustomerContractIds = (userId) =>
  Occupant.distinct("contractId", { userId, isRepresentative: true });

// Hợp đồng ACTIVE thuộc tòa Manager phụ trách – dùng cho prefill và tạo hóa đơn
const getActiveContractForManager = async (contractId, user) => {
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
  await assertManagerOfBuilding(
    user,
    contract.roomId?.buildingId,
    "Bạn không có quyền lập hóa đơn cho phòng thuộc tòa nhà khác",
  );
  return contract;
};

// Hóa đơn (kèm hợp đồng, phòng) thuộc tòa Manager phụ trách
const getInvoiceForManager = async (id, user, forbiddenMessage) => {
  const invoice = await Invoice.findById(id).populate({
    path: "contractId",
    populate: { path: "roomId" },
  });
  if (!invoice) {
    throw new AppError("Không tìm thấy hóa đơn", 404);
  }
  await assertManagerOfBuilding(
    user,
    invoice.contractId?.roomId?.buildingId,
    forbiddenMessage,
  );
  return invoice;
};

// Hóa đơn chưa hủy cùng kỳ của hợp đồng (DRAFT, PENDING, PAID) - chặn trùng kỳ
const findExistingInvoiceInMonth = (contractId, month) =>
  Invoice.findOne({
    contractId,
    month,
    status: { $ne: INVOICE_STATUS.CANCELLED },
  });

const statusLabel = (status) => {
  switch (status) {
    case INVOICE_STATUS.DRAFT:
      return "Nháp";
    case INVOICE_STATUS.PENDING:
      return "Chờ thanh toán";
    case INVOICE_STATUS.PAID:
      return "Đã thanh toán";
    case INVOICE_STATUS.CANCELLED:
      return "Đã hủy";
    default:
      return status;
  }
};

/**
 * Quá hạn / nộp muộn là giá trị tính ra khi trả về, không lưu DB (UC-36)
 */
const formatInvoiceData = (invoiceDoc) => {
  const obj = invoiceDoc.toObject ? invoiceDoc.toObject() : { ...invoiceDoc };

  obj.isOverdue =
    obj.status === INVOICE_STATUS.PENDING && obj.dueDate
      ? new Date() > new Date(obj.dueDate)
      : false;

  if (obj.status === INVOICE_STATUS.PAID && obj.paidAt && obj.dueDate) {
    obj.isPaidLate = new Date(obj.paidAt) > new Date(obj.dueDate);
  }

  return obj;
};

// Dịch vụ mà tòa đã đặt giá (UC-22) – chỉ những dịch vụ này lên hóa đơn
const getBuildingServices = async (buildingId) => {
  const serviceIds = await ServicePrice.distinct("serviceId", { buildingId });
  return Service.find({ _id: { $in: serviceIds }, isDeleted: false }).sort({
    name: 1,
  });
};

// Đơn giá đang hiệu lực tại ngày lập (BR-057). Chưa có thì cảnh báo, dùng giá 0 (UC-34 E03)
const getUnitPriceOrWarn = async (service, buildingId, warnings) => {
  const priceDoc = await getCurrentPrice(service._id, buildingId, new Date());
  if (!priceDoc) {
    warnings.push(`Chưa có đơn giá [${service.name}] cho tòa nhà này`);
    return 0;
  }
  return priceDoc.unitPrice;
};

// Dòng tiền phòng: luôn do server tạo, giá theo hợp đồng
const buildRentItem = (contract, month) => ({
  type: INVOICE_ITEM_TYPE.RENT,
  description: `Tiền thuê phòng tháng ${month}`,
  quantity: 1,
  unitPrice: contract.rentPrice,
  amount: contract.rentPrice,
});

const sumAmount = (items) =>
  items.reduce((total, item) => total + item.amount, 0);

/**
 * Dòng gợi ý cho prefill và tạo hàng loạt: tiền phòng, phí cố định, điện nước kèm chỉ số cũ.
 * fillNewReading = true (tạo hàng loạt): chỉ số mới tạm bằng chỉ số cũ, Manager nhập sau.
 */
const buildSuggestedItems = async ({ contract, month, fillNewReading }) => {
  const buildingId = contract.roomId.buildingId;
  const items = [buildRentItem(contract, month)];
  const warnings = [];

  const previousInvoice = await Invoice.findOne({
    contractId: contract._id,
    month: { $lt: month },
    status: { $ne: INVOICE_STATUS.CANCELLED },
  }).sort({ month: -1, createdAt: -1 });

  const services = await getBuildingServices(buildingId);

  for (const service of services) {
    const unitPrice = await getUnitPriceOrWarn(service, buildingId, warnings);

    if (service.isFixed) {
      items.push({
        serviceId: service._id,
        type: INVOICE_ITEM_TYPE.FIXED,
        description: service.name,
        quantity: 1,
        unitPrice,
        amount: unitPrice,
      });
      continue;
    }

    const previousItem = previousInvoice?.items.find(
      (item) => toId(item.serviceId) === service._id.toString(),
    );
    const oldReading = previousItem?.newReading ?? 0;

    items.push({
      serviceId: service._id,
      type: INVOICE_ITEM_TYPE.METERED,
      description: service.name,
      oldReading,
      newReading: fillNewReading ? oldReading : null,
      quantity: 0,
      unitPrice,
      amount: 0,
    });
  }

  const totalAmount = sumAmount(items);
  if (totalAmount < 0) {
    throw new AppError(
      "Tổng tiền hóa đơn không được nhỏ hơn 0",
      400,
    );
  }

  return { items, warnings, totalAmount };
};

const itemError = (index, field, message) =>
  new AppError(message, 422, [{ field: `items.${index}.${field}`, message }]);

/**
 * Tính lại toàn bộ dòng tiền từ dữ liệu Manager gửi lên (BR-095).
 * - RENT: bỏ dòng client gửi, server tự thêm đúng một dòng theo hợp đồng.
 * - METERED / FIXED: đơn giá và tên do server lấy. Khi sửa nháp, giữ đơn giá đã chụp lúc lập (BR-058).
 * - EXTRA: Manager tự nhập tên và số tiền.
 */
const buildInvoiceItems = async ({
  inputItems,
  contract,
  month,
  snapshotItems = [],
}) => {
  const buildingId = contract.roomId.buildingId;
  const items = [buildRentItem(contract, month)];
  const warnings = [];
  const usedServiceIds = new Set();

  for (const [index, item] of inputItems.entries()) {
    if (item.type === INVOICE_ITEM_TYPE.RENT) continue;

    if (item.type === INVOICE_ITEM_TYPE.EXTRA) {
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? 0);
      if (unitPrice <= 0) {
        throw itemError(
          index,
          "unitPrice",
          "Số tiền phát sinh phải lớn hơn 0",
        );
      }
      items.push({
        type: INVOICE_ITEM_TYPE.EXTRA,
        description: item.description,
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
      });
      continue;
    }

    // METERED / FIXED phải gắn với một dịch vụ
    if (!item.serviceId) {
      throw itemError(
        index,
        "serviceId",
        `Dòng [${item.description}] thiếu dịch vụ`,
      );
    }
    const serviceId = item.serviceId.toString();
    if (usedServiceIds.has(serviceId)) {
      throw itemError(
        index,
        "serviceId",
        `Dịch vụ [${item.description}] bị lặp trên hóa đơn`,
      );
    }
    usedServiceIds.add(serviceId);

    let description;
    let unitPrice;
    const snapshot = snapshotItems.find(
      (snapshotItem) => toId(snapshotItem.serviceId) === serviceId,
    );

    if (snapshot) {
      if (snapshot.type !== item.type) {
        throw itemError(
          index,
          "type",
          `Loại dòng của [${snapshot.description}] không hợp lệ`,
        );
      }
      description = snapshot.description;
      unitPrice = snapshot.unitPrice;
    } else {
      const service = await Service.findOne({
        _id: serviceId,
        isDeleted: false,
      });
      const pricedInBuilding =
        service && (await ServicePrice.exists({ serviceId, buildingId }));
      if (!pricedInBuilding) {
        throw itemError(
          index,
          "serviceId",
          `Dịch vụ [${item.description}] không áp dụng cho tòa nhà này`,
        );
      }
      const expectedType = service.isFixed
        ? INVOICE_ITEM_TYPE.FIXED
        : INVOICE_ITEM_TYPE.METERED;
      if (item.type !== expectedType) {
        throw itemError(
          index,
          "type",
          `Loại dòng của [${service.name}] không hợp lệ`,
        );
      }
      description = service.name;
      unitPrice = await getUnitPriceOrWarn(service, buildingId, warnings);
    }

    if (item.type === INVOICE_ITEM_TYPE.FIXED) {
      const quantity = Number(item.quantity ?? 1);
      items.push({
        serviceId,
        type: INVOICE_ITEM_TYPE.FIXED,
        description,
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
      });
      continue;
    }

    // METERED: tiền = (chỉ số mới − chỉ số cũ) × đơn giá
    if (item.oldReading == null) {
      throw itemError(
        index,
        "oldReading",
        `Vui lòng nhập chỉ số cũ của [${description}]`,
      );
    }
    if (item.newReading == null) {
      throw itemError(
        index,
        "newReading",
        `Vui lòng nhập chỉ số mới của [${description}]`,
      );
    }
    const oldReading = Number(item.oldReading);
    const newReading = Number(item.newReading);
    if (newReading < oldReading) {
      throw itemError(
        index,
        "newReading",
        "Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ",
      );
    }
    const quantity = newReading - oldReading;
    items.push({
      serviceId,
      type: INVOICE_ITEM_TYPE.METERED,
      description,
      oldReading,
      newReading,
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
    });
  }

  const totalAmount = sumAmount(items);
  if (totalAmount < 0) {
    throw new AppError(
      "Tổng tiền hóa đơn không được nhỏ hơn 0",
      400,
    );
  }

  return { items, warnings, totalAmount };
};

const buildInvoiceMail = (invoice, isReminder) => {
  const prefix = isReminder ? "[Nhắc lại] " : "";
  return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>${prefix}Thông báo hóa đơn tiền phòng tháng ${invoice.month}</h2>
        <p>Xin chào quý khách,</p>
        <p>Hệ thống Housify xin gửi thông tin hóa đơn tiền phòng như sau:</p>
        <ul>
          <li><b>Mã hóa đơn:</b> ${invoice.invoiceCode}</li>
          <li><b>Kỳ thanh toán:</b> Tháng ${invoice.month}</li>
          <li><b>Tổng số tiền:</b> <span style="color: #e53e3e; font-size: 16px; font-weight: bold;">${formatMoney(invoice.totalAmount)} VNĐ</span></li>
          <li><b>Hạn thanh toán:</b> ${formatDate(invoice.dueDate)}</li>
        </ul>
        <p>Quý khách vui lòng quét mã VietQR bên dưới để thanh toán:</p>
        <div style="margin: 20px 0;">
          <img src="${invoice.qrContent}" alt="Mã VietQR thanh toán" style="max-width: 320px; border: 1px solid #ddd; border-radius: 8px;" />
        </div>
        <p><i>Lưu ý: Giữ nguyên nội dung chuyển khoản để hệ thống tự động gạch nợ.</i></p>
      </div>
    `;
};

/**
 * Báo chuông + gửi mail kèm QR cho người đại diện.
 * Không ném lỗi: thất bại thì trả câu cảnh báo để Manager gửi lại (UC-35).
 */
const deliverInvoiceNotice = async ({
  invoice,
  contract,
  user,
  isReminder,
}) => {
  const prefix = isReminder ? "[Nhắc lại] " : "";
  let delivered = true;

  let repUserId = null;
  try {
    const representative = await Occupant.findOne({
      contractId: contract._id,
      isRepresentative: true,
    });
    if (!representative?.userId) {
      delivered = false;
    } else {
      repUserId = representative.userId;
      await notify({
        userIds: [representative.userId],
        type: NOTIFICATION_TYPE.INVOICE_SENT,
        title: `${prefix}Hóa đơn tiền phòng tháng ${invoice.month}`,
        message: `Hóa đơn ${invoice.invoiceCode} cần được thanh toán. Tổng tiền: ${formatMoney(invoice.totalAmount)} đ. Hạn thanh toán: ${formatDate(invoice.dueDate)}.`,
        refId: invoice._id,
        createdBy: user._id,
      });
    }
  } catch (error) {
    console.error("Gửi thông báo hóa đơn lỗi:", error.message);
    delivered = false;
  }

  let recipientEmail = contract.representativeEmail;
  if (repUserId) {
    try {
      const repUser = await User.findById(repUserId).select("email").lean();
      if (repUser?.email) recipientEmail = repUser.email;
    } catch {
      // fallback
    }
  }

  if (!recipientEmail) {
    delivered = false;
  } else {
    const mailSent = await sendMail(
      recipientEmail,
      `[Housify] ${prefix}Hóa đơn ${invoice.invoiceCode} tháng ${invoice.month}`,
      buildInvoiceMail(invoice, isReminder),
    );
    if (!mailSent) delivered = false;
  }

  return delivered ? null : NOTICE_FAILED_MESSAGE;
};

/**
 * UC-34: Dữ liệu gợi ý trước khi lập hóa đơn
 * GET /api/invoices/prefill?contractId=&month=
 */
export const getPrefill = async (query, user) => {
  const { contractId, month } = query;
  const contract = await getActiveContractForManager(contractId, user);

  const { items, warnings } = await buildSuggestedItems({
    contract,
    month,
    fillNewReading: false,
  });

  const existingInvoice = await findExistingInvoiceInMonth(contractId, month);
  if (existingInvoice) {
    warnings.unshift(
      `Phòng này đã có hóa đơn [${statusLabel(existingInvoice.status)}] trong tháng ${month}. Vui lòng mở hóa đơn đã có để chỉnh sửa hoặc hủy hóa đơn cũ nếu muốn tạo mới.`,
    );
  }

  return {
    contract: {
      _id: contract._id,
      roomNumber: contract.roomId.roomNumber,
      rentPrice: contract.rentPrice,
      representativeEmail: contract.representativeEmail,
    },
    month,
    hasExistingInvoice: Boolean(existingInvoice),
    existingInvoiceId: existingInvoice ? existingInvoice._id : null,
    existingInvoiceStatus: existingInvoice ? existingInvoice.status : null,
    existingInvoiceCode: existingInvoice ? existingInvoice.invoiceCode : null,
    items,
    warnings,
  };
};

/**
 * UC-34: Tạo hóa đơn đơn lẻ (lưu nháp)
 * POST /api/invoices
 */
export const createInvoice = async (data, user) => {
  const { contractId, month, items } = data;
  const contract = await getActiveContractForManager(contractId, user);

  // Chặn trùng kỳ tuyệt đối: mỗi phòng trong một tháng chỉ có 1 hóa đơn hiệu lực (Nháp / Chờ thanh toán / Đã thanh toán)
  const existing = await findExistingInvoiceInMonth(contractId, month);
  if (existing) {
    throw new AppError(
      `Phòng này đã có hóa đơn [${statusLabel(existing.status)}] trong tháng ${month}. Vui lòng mở hóa đơn đã có để chỉnh sửa hoặc hủy hóa đơn cũ nếu muốn tạo mới.`,
      400,
    );
  }

  const built = await buildInvoiceItems({ inputItems: items, contract, month });

  const invoice = await Invoice.create({
    invoiceCode: await generateInvoiceCode(month),
    contractId,
    month,
    items: built.items,
    totalAmount: built.totalAmount,
    status: INVOICE_STATUS.DRAFT,
    createdBy: user._id,
  });

  return { ...formatInvoiceData(invoice), warnings: built.warnings };
};

/**
 * UC-34: Tạo hóa đơn nháp hàng loạt, chỉ số điện nước nhập sau
 * POST /api/invoices/bulk
 */
export const createBulkInvoices = async (data, user) => {
  const { contractIds, month } = data;
  const managerBuilding = await getManagerBuilding(user._id);

  const invoices = [];
  const errors = [];
  const warnings = [];

  for (const contractId of [...new Set(contractIds)]) {
    try {
      const contract = await Contract.findById(contractId).populate("roomId");
      if (!contract || contract.status !== CONTRACT_STATUS.ACTIVE) {
        errors.push({
          contractId,
          message: "Hợp đồng không tồn tại hoặc không còn hiệu lực",
        });
        continue;
      }

      const room = contract.roomId;
      if (toId(room?.buildingId) !== managerBuilding._id.toString()) {
        errors.push({
          contractId,
          message: "Phòng không thuộc tòa nhà bạn phụ trách",
        });
        continue;
      }

      // Không tạo trùng kỳ khi lập hàng loạt
      const existing = await findExistingInvoiceInMonth(contractId, month);
      if (existing) {
        errors.push({
          contractId,
          roomNumber: room.roomNumber,
          message: `Phòng ${room.roomNumber} đã có hóa đơn [${statusLabel(existing.status)}] trong tháng ${month}, bỏ qua`,
        });
        continue;
      }

      const built = await buildSuggestedItems({
        contract,
        month,
        fillNewReading: true,
      });

      const invoice = await Invoice.create({
        invoiceCode: await generateInvoiceCode(month),
        contractId,
        month,
        items: built.items,
        totalAmount: built.totalAmount,
        status: INVOICE_STATUS.DRAFT,
        createdBy: user._id,
      });

      invoices.push(formatInvoiceData(invoice));
      for (const message of built.warnings) {
        warnings.push({ contractId, roomNumber: room.roomNumber, message });
      }
    } catch (error) {
      errors.push({ contractId, message: error.message });
    }
  }

  return { totalCreated: invoices.length, invoices, errors, warnings };
};

/**
 * UC-34: Sửa hóa đơn nháp
 * PUT /api/invoices/:id
 */
export const updateInvoice = async (id, data, user) => {
  const invoice = await getInvoiceForManager(
    id,
    user,
    "Bạn không có quyền sửa hóa đơn này",
  );

  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new AppError(
      "Chỉ có thể chỉnh sửa hóa đơn khi đang ở trạng thái Nháp (DRAFT)",
      400,
    );
  }

  const built = await buildInvoiceItems({
    inputItems: data.items,
    contract: invoice.contractId,
    month: invoice.month,
    snapshotItems: invoice.items,
  });

  // Chỉ ghi khi hóa đơn vẫn còn nháp (tránh sửa đè lúc vừa được gửi)
  const updated = await Invoice.findOneAndUpdate(
    { _id: invoice._id, status: INVOICE_STATUS.DRAFT },
    { $set: { items: built.items, totalAmount: built.totalAmount } },
    { new: true, runValidators: true },
  );
  if (!updated) {
    throw new AppError(CONCURRENT_CHANGE_MESSAGE, 409);
  }

  return { ...formatInvoiceData(updated), warnings: built.warnings };
};

/**
 * UC-35: Gửi hóa đơn – sinh VietQR, chuyển PENDING, báo chuông + mail
 * POST /api/invoices/:id/send
 */
export const sendInvoice = async (id, user) => {
  const invoice = await getInvoiceForManager(
    id,
    user,
    "Bạn không có quyền gửi hóa đơn của tòa nhà khác",
  );

  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new AppError(
      "Chỉ có thể gửi hóa đơn đang ở trạng thái Nháp (DRAFT)",
      400,
    );
  }

  const contract = invoice.contractId;
  if (contract?.status !== CONTRACT_STATUS.ACTIVE) {
    throw new AppError(
      "Hợp đồng của hóa đơn này không còn hiệu lực (phải ACTIVE)",
      400,
    );
  }

  // QR phải đúng số tài khoản Admin – thiếu cấu hình thì không cho gửi
  if (!env.BANK_ID || !env.BANK_ACCOUNT_NO) {
    throw new AppError(
      "Chưa cấu hình tài khoản ngân hàng nhận tiền, vui lòng liên hệ Admin",
      500,
    );
  }
  const qrContent = `https://img.vietqr.io/image/${env.BANK_ID}-${env.BANK_ACCOUNT_NO}-compact2.png?amount=${invoice.totalAmount}&addInfo=${encodeURIComponent(invoice.invoiceCode)}&accountName=${encodeURIComponent(env.BANK_ACCOUNT_NAME)}`;

  const sentAt = new Date();
  const dueDate = new Date(sentAt.getTime() + DUE_DAYS * 24 * 60 * 60 * 1000);

  // Chỉ chuyển khi hóa đơn chưa bị sửa / gửi bởi thao tác khác (số tiền trên QR luôn khớp)
  const sentInvoice = await Invoice.findOneAndUpdate(
    {
      _id: invoice._id,
      status: INVOICE_STATUS.DRAFT,
      updatedAt: invoice.updatedAt,
    },
    {
      $set: {
        status: INVOICE_STATUS.PENDING,
        qrContent,
        sentAt,
        dueDate,
      },
    },
    { new: true },
  );
  if (!sentInvoice) {
    throw new AppError(CONCURRENT_CHANGE_MESSAGE, 409);
  }

  // Lỗi thông báo / mail không làm hỏng việc gửi: hóa đơn vẫn PENDING, trả cảnh báo
  const warning = await deliverInvoiceNotice({
    invoice: sentInvoice,
    contract,
    user,
    isReminder: false,
  });

  return { invoice: formatInvoiceData(sentInvoice), warning };
};

/**
 * UC-35: Gửi lại chuông + mail cho hóa đơn PENDING
 * POST /api/invoices/:id/resend-notification
 */
export const resendNotification = async (id, user) => {
  const invoice = await getInvoiceForManager(
    id,
    user,
    "Bạn không có quyền gửi thông báo cho hóa đơn của tòa nhà khác",
  );

  if (invoice.status !== INVOICE_STATUS.PENDING) {
    throw new AppError(
      "Chỉ có thể gửi lại thông báo cho hóa đơn đang Chờ thanh toán (PENDING)",
      400,
    );
  }

  const warning = await deliverInvoiceNotice({
    invoice,
    contract: invoice.contractId,
    user,
    isReminder: true,
  });

  return { invoice: formatInvoiceData(invoice), warning };
};

/**
 * UC-36: Danh sách hóa đơn
 * GET /api/invoices
 */
export const getInvoices = async (query, user) => {
  const { status, month, roomId, buildingId } = query;
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const filter = {};

  if (month) filter.month = month;
  if (status) {
    // validate (commaSeparatedEnum) đã đổi "PAID,PENDING" thành mảng; vẫn nhận chuỗi phòng khi gọi không qua validate
    const statusList = Array.isArray(status)
      ? status
      : status.split(",").map((item) => item.trim()).filter(Boolean);
    filter.status = { $in: statusList };
  }

  if (user.role === ROLE.CUSTOMER) {
    // Customer: hóa đơn các hợp đồng mình đại diện, chỉ những hóa đơn đã từng gửi
    // (ẩn DRAFT và hóa đơn bị hủy khi còn nháp)
    filter.contractId = { $in: await getCustomerContractIds(user._id) };
    filter.sentAt = { $ne: null };
  } else if (user.role === ROLE.MANAGER) {
    // Manager: chỉ các phòng trong tòa mình phụ trách
    const managerBuilding = await getManagerBuilding(user._id);
    let roomFilter;
    if (roomId) {
      const room = await Room.exists({
        _id: roomId,
        buildingId: managerBuilding._id,
      });
      if (!room) {
        throw new AppError(
          "Bạn không có quyền xem hóa đơn của phòng thuộc tòa nhà khác",
          403,
        );
      }
      roomFilter = roomId;
    } else {
      roomFilter = {
        $in: await Room.distinct("_id", { buildingId: managerBuilding._id }),
      };
    }
    filter.contractId = {
      $in: await Contract.distinct("_id", { roomId: roomFilter }),
    };
  } else if (buildingId) {
    const roomIds = await Room.distinct("_id", { buildingId });
    filter.contractId = {
      $in: await Contract.distinct("_id", { roomId: { $in: roomIds } }),
    };
  }

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
      .skip((page - 1) * limit)
      .limit(limit),
    Invoice.countDocuments(filter),
  ]);

  return {
    items: invoices.map(formatInvoiceData),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * UC-36: Chi tiết một hóa đơn
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

  if (user.role === ROLE.CUSTOMER) {
    const contractIds = await getCustomerContractIds(user._id);
    const isOwner = contractIds.some(
      (contractId) => contractId.toString() === toId(invoice.contractId),
    );
    if (!isOwner) {
      throw new AppError("Bạn không có quyền xem hóa đơn của phòng khác", 403);
    }
    // Chưa từng gửi (nháp, hoặc bị hủy khi còn nháp) thì Customer không thấy
    if (!invoice.sentAt) {
      throw new AppError("Bạn không có quyền xem hóa đơn nháp", 403);
    }
  }

  await assertManagerOfBuilding(
    user,
    invoice.contractId?.roomId?.buildingId,
    "Bạn không có quyền xem hóa đơn của tòa nhà khác",
  );

  const formatted = formatInvoiceData(invoice);

  // Lấy thông tin đại diện (Occupant) và Manager của tòa
  const contractId = invoice.contractId?._id;
  const rep = contractId
    ? await Occupant.findOne({ contractId, isRepresentative: true }).select("name phone cccd")
    : null;
  const userRep = !rep && invoice.contractId?.representativeCccd
    ? await User.findOne({ cccd: invoice.contractId.representativeCccd }).select("name phone cccd email")
    : null;

  const building = invoice.contractId?.roomId?.buildingId;
  const bManager = building?.managerId
    ? await Manager.findOne({ userId: building.managerId }).select("name phone")
    : null;

  formatted.representative = {
    name: rep?.name || userRep?.name || "",
    phone: rep?.phone || userRep?.phone || "",
    email: invoice.contractId?.representativeEmail || userRep?.email || "",
    cccd: invoice.contractId?.representativeCccd || rep?.cccd || userRep?.cccd || "",
  };
  formatted.representativeName = formatted.representative.name;
  formatted.representativePhone = formatted.representative.phone;

  if (building) {
    formatted.building = {
      _id: building._id,
      name: building.name,
      address: building.address,
      managerName: bManager?.name || "",
      managerPhone: bManager?.phone || "",
    };
  }

  return formatted;
};

/**
 * UC-37: Hủy hóa đơn DRAFT/PENDING, lý do bắt buộc
 * POST /api/invoices/:id/cancel
 */
export const cancelInvoice = async (id, data, user) => {
  const { reason } = data;
  const invoice = await getInvoiceForManager(
    id,
    user,
    "Bạn không có quyền hủy hóa đơn này",
  );

  // Không bao giờ hủy hóa đơn đã thanh toán (BR-103)
  if (invoice.status === INVOICE_STATUS.PAID) {
    throw new AppError("Không thể hủy hóa đơn đã thanh toán", 400);
  }
  if (invoice.status === INVOICE_STATUS.CANCELLED) {
    throw new AppError("Hóa đơn này đã bị hủy trước đó", 400);
  }

  // Chỉ hủy khi trạng thái chưa đổi – tránh ghi đè PAID nếu webhook SePay về cùng lúc
  const previousStatus = invoice.status;
  const cancelled = await Invoice.findOneAndUpdate(
    { _id: invoice._id, status: previousStatus },
    { $set: { status: INVOICE_STATUS.CANCELLED, cancelReason: reason } },
    { new: true },
  );
  if (!cancelled) {
    throw new AppError(CONCURRENT_CHANGE_MESSAGE, 409);
  }

  // Đang PENDING thì báo cho khách biết hóa đơn đã hủy
  if (previousStatus === INVOICE_STATUS.PENDING) {
    const representative = await Occupant.findOne({
      contractId: toId(invoice.contractId),
      isRepresentative: true,
    });

    if (representative?.userId) {
      await notify({
        userIds: [representative.userId],
        type: NOTIFICATION_TYPE.INVOICE_CANCELLED,
        title: `Hóa đơn ${cancelled.invoiceCode} đã bị hủy`,
        message: `Hóa đơn ${cancelled.invoiceCode} đã được hủy bởi Manager. Lý do: ${reason}`,
        refId: cancelled._id,
        createdBy: user._id,
      });
    }
  }

  return formatInvoiceData(cancelled);
};
