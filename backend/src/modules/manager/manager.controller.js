// Controller cho module manager: quản lý tài khoản Manager và phân công tòa, chỉ Admin (UC-08, UC-09, UC-10, UC-11)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as managerService from './manager.service.js';

export const createManager = asyncHandler(async (request, response) => {
    const data = await managerService.createManager(request.user.id, request.body);
    return created(response, data, 'Tạo tài khoản Manager thành công');
});

export const listManagers = asyncHandler(async (request, response) => {
    const data = await managerService.listManagers(request.query);
    return ok(response, data, 'Lấy danh sách Manager thành công');
});

export const getManager = asyncHandler(async (request, response) => {
    const data = await managerService.getManager(request.params.id);
    return ok(response, data, 'Lấy thông tin Manager thành công');
});

export const updateManager = asyncHandler(async (request, response) => {
    const { changed, manager } = await managerService.updateManager(request.user.id, request.params.id, request.body);
    return ok(response, manager, changed ? 'Cập nhật thông tin Manager thành công' : 'Không có thay đổi nào');
});

export const deleteManager = asyncHandler(async (request, response) => {
    await managerService.deleteManager(request.user.id, request.params.id);
    return ok(response, null, 'Đã xóa tài khoản Manager');
});

export const resendActivation = asyncHandler(async (request, response) => {
    const data = await managerService.resendActivation(request.user.id, request.params.id);
    return ok(response, data, 'Đã gửi lại link kích hoạt');
});

export const lockManager = asyncHandler(async (request, response) => {
    const data = await managerService.lockManager(request.user.id, request.params.id, request.body);
    return ok(response, data, 'Đã khóa tài khoản Manager');
});

export const unlockManager = asyncHandler(async (request, response) => {
    const data = await managerService.unlockManager(request.user.id, request.params.id);
    return ok(response, data, 'Đã mở khóa tài khoản Manager');
});

export const assignManager = asyncHandler(async (request, response) => {
    const data = await managerService.assignManager(request.user.id, request.params.id, request.body);
    const message = request.body.managerId === null ? 'Đã gỡ phân công Manager' : 'Phân công Manager thành công';
    return ok(response, data, message);
});
