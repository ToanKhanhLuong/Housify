// Controller cho module building
import asyncHandler from "../../utils/asyncHandler.js";
import { ok, created } from "../../utils/response.js";
import * as buildingService from "./building.service.js";

// 1. Tạo tòa nhà
export const createBuilding = asyncHandler(async (req, res) => {
  const building = await buildingService.createBuilding(req.body);
  return created(res, building, "Tạo tòa nhà thành công");
});

// 2. Lấy danh sách tòa nhà
export const getBuildings = asyncHandler(async (req, res) => {
  const buildings = await buildingService.getBuildings(req.user);
  return ok(res, buildings, "Lấy danh sách tòa nhà thành công");
});

// 3. Lấy chi tiết một tòa nhà
export const getBuildingById = asyncHandler(async (req, res) => {
  const building = await buildingService.getBuildingById(
    req.params.id,
    req.user,
  );
  return ok(res, building, "Lấy chi tiết tòa nhà thành công");
});

// 4. Cập nhật tòa nhà
export const updateBuilding = asyncHandler(async (req, res) => {
  const building = await buildingService.updateBuilding(
    req.params.id,
    req.body,
  );
  return ok(res, building, "Cập nhật tòa nhà thành công");
});

// 5. Xóa mềm tòa nhà
export const deleteBuilding = asyncHandler(async (req, res) => {
  await buildingService.deleteBuilding(req.params.id);
  return ok(res, null, "Xóa tòa nhà thành công");
});
