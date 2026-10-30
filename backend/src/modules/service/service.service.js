// Service cho module service (UC-21, UC-22)
import Service from '../../models/Service.js';
import ServicePrice from '../../models/ServicePrice.js';
import Building from '../../models/Building.js';
import { AppError } from '../../utils/AppError.js';
import { startOfVietnamDay } from '../../helpers/date.js';
import { escapeRegex } from '../../helpers/filter.js';

// So tên không phân biệt hoa thường, khớp nguyên chuỗi (BR-055)
const sameNameFilter = (name) => ({
  $regex: new RegExp(`^${escapeRegex(name)}$`, 'i'),
});

// Tìm dịch vụ chưa xóa
const findService = async (id) => {
  const service = await Service.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!service) {
    throw new AppError('Dịch vụ không tồn tại', 404);
  }

  return service;
};

// Tìm tòa chưa xóa
const findBuilding = async (id) => {
  const building = await Building.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!building) {
    throw new AppError('Tòa nhà không tồn tại', 404);
  }

  return building;
};

// Tên dịch vụ không trùng trong các dịch vụ chưa xóa (BR-055)
const ensureNameAvailable = async (name, exceptId) => {
  const filter = {
    name: sameNameFilter(name),
    isDeleted: false,
  };

  if (exceptId) {
    filter._id = { $ne: exceptId };
  }

  const existing = await Service.findOne(filter);

  if (existing) {
    throw new AppError('Tên dịch vụ đã tồn tại', 409);
  }
};

// ===== UC-21: danh mục dịch vụ =====

// 1. Lấy danh sách dịch vụ, sắp xếp theo tên tăng dần
export const getServices = async (query = {}) => {
  const filter = { isDeleted: false };

  if (query.q) {
    filter.name = { $regex: new RegExp(escapeRegex(query.q), 'i') };
  }

  if (query.isFixed === 'true') {
    filter.isFixed = true;
  } else if (query.isFixed === 'false') {
    filter.isFixed = false;
  }

  const services = await Service.find(filter).sort({ name: 1 });
  return services;
};

// 2. Thêm dịch vụ
export const createService = async (data) => {
  const name = data.name.trim();
  await ensureNameAvailable(name);

  const service = await Service.create({
    name,
    unit: data.unit.trim(),
    isFixed: data.isFixed,
  });

  return service;
};

// 3. Sửa dịch vụ – chỉ ảnh hưởng hóa đơn lập sau này (hóa đơn cũ đã chép tên, đơn giá)
export const updateService = async (id, data) => {
  const service = await findService(id);

  if (data.name !== undefined) {
    const name = data.name.trim();

    if (name.toLowerCase() !== service.name.toLowerCase()) {
      await ensureNameAvailable(name, id);
    }

    service.name = name;
  }

  if (data.unit !== undefined) {
    service.unit = data.unit.trim();
  }

  if (data.isFixed !== undefined) {
    service.isFixed = data.isFixed;
  }

  await service.save();

  return service;
};

// 4. Xóa dịch vụ – luôn xóa mềm, kể cả khi đã có trong hóa đơn (BR-056)
export const deleteService = async (id) => {
  const service = await findService(id);

  service.isDeleted = true;
  await service.save();

  return { message: 'Xóa dịch vụ thành công' };
};

// ===== UC-22: giá dịch vụ theo tòa =====

// 5. Lịch sử giá của mọi dịch vụ ở một tòa, mới nhất trước
export const getServicePrices = async (buildingId) => {
  await findBuilding(buildingId);

  const prices = await ServicePrice.find({ buildingId }).sort({
    effectiveFrom: -1,
  });

  return prices;
};

// 6. Đặt giá: trùng ngày bắt đầu với mức đã có thì sửa mức đó (UC-22 A1), không thì thêm mức mới
export const saveServicePrice = async (buildingId, data, user) => {
  await findBuilding(buildingId);
  await findService(data.serviceId);

  // Lưu ngày bắt đầu là 00:00 giờ Việt Nam: giá có hiệu lực ngay đầu ngày,
  // và gửi kèm giờ phút thì vẫn tính là cùng một ngày, không sinh mức giá trùng
  const effectiveFrom = startOfVietnamDay(data.effectiveFrom);

  const existing = await ServicePrice.findOne({
    serviceId: data.serviceId,
    buildingId,
    effectiveFrom,
  });

  if (existing) {
    existing.unitPrice = data.unitPrice;
    existing.createdBy = user.id;
    await existing.save();

    return { price: existing, isNew: false };
  }

  const price = await ServicePrice.create({
    serviceId: data.serviceId,
    buildingId,
    unitPrice: data.unitPrice,
    effectiveFrom,
    createdBy: user.id,
  });

  return { price, isNew: true };
};
