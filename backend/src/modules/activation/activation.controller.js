// Controller cho module activation: kích hoạt Manager (UC-08) và kích hoạt Customer (UC-06)
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

export const getContractActivationInfo = asyncHandler(async (request, response) => {
    const data = await activationService.getContractActivationInfo(request.params.token);
    return ok(response, data);
});

export const activateCustomerContract = asyncHandler(async (request, response) => {
    // trả thêm activatedAt để FE in giờ xác nhận điện tử lên hợp đồng
    const { activatedAt, warning } = await activationService.activateCustomerContract(request.body);
    return ok(
        response,
        { activatedAt, warning },
        'Kích hoạt hợp đồng thành công. Vui lòng đăng nhập bằng số CCCD',
    );
});
