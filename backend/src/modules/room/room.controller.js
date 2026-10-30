// Controller cho module room (UC-16, UC-17, UC-18, UC-19)
import asyncHandler from "../../utils/asyncHandler.js";
import { ok, created } from "../../utils/response.js";
import * as roomService from "./room.service.js";

// 1. Lấy danh sách phòng của một tòa (UC-19)
export const getRooms = asyncHandler(async (request, response) => {
  const rooms = await roomService.getRooms(
    request.params.buildingId,
    request.query,
    request.user,
  );
  return ok(response, rooms, "Lấy danh sách phòng thành công");
});

// 2. Lấy chi tiết phòng (UC-19)
export const getRoomById = asyncHandler(async (request, response) => {
  const room = await roomService.getRoomById(request.params.id, request.user);
  return ok(response, room, "Lấy chi tiết phòng thành công");
});

// 3. Tạo phòng (UC-16)
export const createRoom = asyncHandler(async (request, response) => {
  const room = await roomService.createRoom(
    request.params.buildingId,
    request.body,
    request.user,
  );
  return created(response, room, "Tạo phòng thành công");
});

// 4. Cập nhật phòng (UC-17)
export const updateRoom = asyncHandler(async (request, response) => {
  const room = await roomService.updateRoom(
    request.params.id,
    request.body,
    request.user,
  );
  return ok(response, room, "Cập nhật phòng thành công");
});

// 5. Xóa mềm phòng (UC-18)
export const deleteRoom = asyncHandler(async (request, response) => {
  await roomService.deleteRoom(request.params.id, request.user);
  return ok(response, null, "Xóa phòng thành công");
});
