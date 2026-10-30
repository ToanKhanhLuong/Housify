// Controller cho module roomType (UC-20)
import asyncHandler from "../../utils/asyncHandler.js";
import { ok, created } from "../../utils/response.js";
import * as roomTypeService from "./roomType.service.js";

// 1. Lấy danh sách loại phòng (UC-20)
export const getRoomTypes = asyncHandler(async (request, response) => {
  const roomTypes = await roomTypeService.getRoomTypes();
  return ok(response, roomTypes, "Lấy danh sách loại phòng thành công");
});

// 2. Lấy chi tiết một loại phòng (UC-20)
export const getRoomTypeById = asyncHandler(async (request, response) => {
  const roomType = await roomTypeService.getRoomTypeById(request.params.id);
  return ok(response, roomType, "Lấy chi tiết loại phòng thành công");
});

// 3. Tạo loại phòng mới (UC-20)
export const createRoomType = asyncHandler(async (request, response) => {
  const roomType = await roomTypeService.createRoomType(request.body);
  return created(response, roomType, "Tạo loại phòng thành công");
});

// 4. Cập nhật tên loại phòng (UC-20)
export const updateRoomType = asyncHandler(async (request, response) => {
  const roomType = await roomTypeService.updateRoomType(
    request.params.id,
    request.body,
  );
  return ok(response, roomType, "Cập nhật loại phòng thành công");
});

// 5. Xóa mềm loại phòng (UC-20)
export const deleteRoomType = asyncHandler(async (request, response) => {
  await roomTypeService.deleteRoomType(request.params.id);
  return ok(response, null, "Xóa loại phòng thành công");
});
