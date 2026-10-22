// Controller cho module auth: xử lý đăng nhập và thông tin tài khoản (UC-01)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { MSG } from '../../constants/messages.js';
import * as authService from './auth.service.js';

export const login = asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    return ok(res, data, MSG.LOGIN_SUCCESS);
});

export const getMe = asyncHandler(async (req, res) => {
    const data = await authService.getMe(req.user.id);
    return ok(res, data, 'Lấy thông tin tài khoản thành công');
});
