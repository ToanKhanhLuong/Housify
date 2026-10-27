// Controller cho module auth: xử lý đăng nhập và thông tin tài khoản, đổi mật khẩu, quên mật khẩu, hồ sơ cá nhân (UC-01, UC-03, UC-04, UC-05)
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

export const changePassword = asyncHandler(async (request, response) => {
    await authService.changePassword(request.user.id, request.body);
    return ok(response, null, 'Đổi mật khẩu thành công');
});

export const forgotPassword = asyncHandler(async (request, response) => {
    await authService.forgotPassword(request.body);
    return ok(response, null, 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi. Vui lòng kiểm tra hộp thư');
});

export const verifyOtp = asyncHandler(async (request, response) => {
    await authService.verifyOtp(request.body);
    return ok(response, null, 'Mã OTP hợp lệ');
});

export const resetPassword = asyncHandler(async (request, response) => {
    await authService.resetPassword(request.body);
    return ok(response, null, 'Đặt lại mật khẩu thành công');
});

export const getProfile = asyncHandler(async (request, response) => {
    const data = await authService.getProfile(request.user.id);
    return ok(response, data, 'Lấy hồ sơ thành công');
});

export const updateProfile = asyncHandler(async (request, response) => {
    const { changed, profile } = await authService.updateProfile(request.user.id, request.body);
    return ok(response, profile, changed ? 'Cập nhật hồ sơ thành công' : 'Không có thông tin nào thay đổi');
});
