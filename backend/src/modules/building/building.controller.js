// Controller cho module building (UC-12, UC-13, UC-14, UC-15, UC-23)
import asyncHandler from "../../utils/asyncHandler.js";
import { ok, created } from "../../utils/response.js";
import * as buildingService from "./building.service.js";

// 1. Tạo tòa nhà (UC-12)
export const createBuilding = asyncHandler(async (request, response) => {
  const building = await buildingService.createBuilding(request.body);
  return created(response, building, "Tạo tòa nhà thành công");
});

// 2. Lấy danh sách tòa nhà (UC-13)
export const getBuildings = asyncHandler(async (request, response) => {
  const buildings = await buildingService.getBuildings(request.user);
  return ok(response, buildings, "Lấy danh sách tòa nhà thành công");
});

// 3. Lấy chi tiết một tòa nhà (UC-13)
export const getBuildingById = asyncHandler(async (request, response) => {
  const building = await buildingService.getBuildingById(
    request.params.id,
    request.user,
  );
  return ok(response, building, "Lấy chi tiết tòa nhà thành công");
});

// 4. Cập nhật tòa nhà (UC-13)
export const updateBuilding = asyncHandler(async (request, response) => {
  const building = await buildingService.updateBuilding(
    request.params.id,
    request.body,
  );
  return ok(response, building, "Cập nhật tòa nhà thành công");
});

// 5. Xóa mềm tòa nhà (UC-14)
export const deleteBuilding = asyncHandler(async (request, response) => {
  await buildingService.deleteBuilding(request.params.id);
  return ok(response, null, "Xóa tòa nhà thành công");
});

// 6. Lấy danh sách tầng và thống kê phòng (UC-15)
export const getBuildingFloors = asyncHandler(async (request, response) => {
  const floors = await buildingService.getBuildingFloors(
    request.params.id,
    request.user,
  );
  return ok(response, floors, "Lấy danh sách tầng thành công");
});

// 7. Cập nhật số tầng / xóa tầng trên cùng (UC-15)
export const updateFloorCount = asyncHandler(async (request, response) => {
  const building = await buildingService.updateFloorCount(
    request.params.id,
    request.body.floorCount,
  );
  return ok(response, building, "Cập nhật số tầng thành công");
});

// 8. Lấy nội quy tòa nhà (UC-23)
export const getBuildingRules = asyncHandler(async (request, response) => {
  const data = await buildingService.getBuildingRules(
    request.params.id,
    request.user,
  );
  return ok(response, data, "Lấy nội quy tòa nhà thành công");
});

// 9. Cập nhật / Ghi đè nội quy tòa nhà (UC-23)
export const updateBuildingRules = asyncHandler(async (request, response) => {
  const data = await buildingService.updateBuildingRules(
    request.params.id,
    request.body.rules,
    request.user,
  );
  return ok(response, data, "Lưu nội quy thành công");
});
