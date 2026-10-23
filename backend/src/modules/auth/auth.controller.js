// Controller cho module auth: xử lý đăng nhập và thông tin tài khoản (UC-01)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { MSG } from '../../constants/messages.js';
import * as authService from './auth.service.js';

export const login = asyncHandler(async (request, response) => {
    const data = await authService.login(request.body);
    return ok(response, data, MSG.LOGIN_SUCCESS);
});

export const getMe = asyncHandler(async (request, response) => {
    const data = await authService.getMe(request.user.id);
    return ok(response, data, 'Lấy thông tin tài khoản thành công');
});
