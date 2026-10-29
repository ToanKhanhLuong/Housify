// Controller cho module activation: kích hoạt tài khoản Manager (UC-08 bước 6–8)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as activationService from './activation.service.js';

export const getManagerActivationInfo = asyncHandler(async (request, response) => {
    const data = await activationService.getManagerActivationInfo(request.params.token);
    return ok(response, data);
});

export const activateManager = asyncHandler(async (request, response) => {
    await activationService.activateManager(request.body);
    return ok(response, null, 'Kích hoạt tài khoản thành công. Vui lòng đăng nhập');
});

