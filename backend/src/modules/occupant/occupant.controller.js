// Controller cho module occupant: xem danh sách/chi tiết cư dân, sửa thông tin, thêm và rút tên người ở cùng (UC-30..33)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as occupantService from './occupant.service.js';

export const getOccupants = asyncHandler(async (request, response) => {
    const data = await occupantService.getOccupants({
        managerId: request.user.id,
        query: request.query,
    });

    return ok(
        response,
        data,
        data.total === 0 ? 'Chưa có cư dân nào' : 'Lấy danh sách cư dân thành công',
    );
});

export const getMyRoomMembers = asyncHandler(async (request, response) => {
    const data = await occupantService.getMyRoomMembers({
        userId: request.user.id,
    });

    return ok(response, data, 'Lấy danh sách thành viên phòng thành công');
});

export const getOccupantById = asyncHandler(async (request, response) => {
    const data = await occupantService.getOccupantById({
        userId: request.user.id,
        roleId: request.user.role,
        occupantId: request.params.id,
    });

    return ok(response, data, 'Lấy chi tiết cư dân thành công');
});

export const updateOccupant = asyncHandler(async (request, response) => {
    const data = await occupantService.updateOccupant({
        userId: request.user.id,
        roleId: request.user.role,
        occupantId: request.params.id,
        data: request.body,
    });

    return ok(response, data, 'Cập nhật thông tin cư dân thành công');
});

export const addOccupant = asyncHandler(async (request, response) => {
    const data = await occupantService.addOccupant({
        managerId: request.user.id,
        contractId: request.params.id,
        data: request.body,
    });

    return created(response, data, 'Thêm người ở cùng thành công');
});

export const leaveOccupant = asyncHandler(async (request, response) => {
    const data = await occupantService.leaveOccupant({
        managerId: request.user.id,
        occupantId: request.params.id,
        data: request.body,
    });

    return ok(
        response,
        data,
        'Đã cập nhật danh sách cư dân. Hợp đồng không thay đổi, người đại diện vẫn giữ nguyên',
    );
});

