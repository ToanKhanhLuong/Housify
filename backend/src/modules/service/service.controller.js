// Controller cho module service (UC-21, UC-22)
import asyncHandler from "../../utils/asyncHandler.js";
import { ok, created } from "../../utils/response.js";
import * as serviceService from "./service.service.js";

// 1. Lấy danh sách dịch vụ (UC-21)
export const getServices = asyncHandler(async (request, response) => {
  const services = await serviceService.getServices();
  return ok(response, services, "Lấy danh sách dịch vụ thành công");
});

// 2. Thêm dịch vụ (UC-21)
export const createService = asyncHandler(async (request, response) => {
  const service = await serviceService.createService(request.body);
  return created(response, service, "Thêm dịch vụ thành công");
});

// 3. Sửa dịch vụ (UC-21)
export const updateService = asyncHandler(async (request, response) => {
  const service = await serviceService.updateService(
    request.params.id,
    request.body,
  );
  return ok(response, service, "Cập nhật dịch vụ thành công");
});

// 4. Xóa mềm dịch vụ (UC-21)
export const deleteService = asyncHandler(async (request, response) => {
  await serviceService.deleteService(request.params.id);
  return ok(response, null, "Xóa dịch vụ thành công");
});

// 5. Lịch sử giá dịch vụ của tòa (UC-22)
export const getServicePrices = asyncHandler(async (request, response) => {
  const prices = await serviceService.getServicePrices(request.params.id);
  return ok(response, prices, "Lấy giá dịch vụ thành công");
});

// 6. Thêm hoặc sửa một mức giá (UC-22)
export const saveServicePrice = asyncHandler(async (request, response) => {
  const { price, isNew } = await serviceService.saveServicePrice(
    request.params.id,
    request.body,
    request.user,
  );

  if (isNew) {
    return created(response, price, "Thêm mức giá thành công");
  }
  return ok(response, price, "Cập nhật mức giá thành công");
});
