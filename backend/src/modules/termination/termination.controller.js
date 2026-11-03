// Controller cho module termination: chấm dứt thỏa thuận (UC-28) và đơn phương (UC-29)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as terminationService from './termination.service.js';

export const createTermination = asyncHandler(async (request, response) => {
    const { termination, warning } = await terminationService.createTermination({
        managerId: request.user.id,
        contractId: request.params.id,
        data: request.body,
    });

    const responseData = {
        ...termination.toObject(),
        ...(warning ? { warning } : {}),
    };

    return created(response, responseData, 'Đã gửi đơn chấm dứt hợp đồng');
});

export const getTerminations = asyncHandler(async (request, response) => {
    const data = await terminationService.getTerminations({
        userId: request.user.id,
        roleId: request.user.role,
        query: request.query,
    });

    return ok(response, data, 'Lấy danh sách đơn chấm dứt hợp đồng thành công');
});

export const getTerminationById = asyncHandler(async (request, response) => {
    const data = await terminationService.getTerminationById({
        userId: request.user.id,
        roleId: request.user.role,
        terminationId: request.params.id,
    });

    return ok(response, data, 'Lấy chi tiết đơn chấm dứt hợp đồng thành công');
});

export const confirmTermination = asyncHandler(async (request, response) => {
    const clientIp =
        request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.ip ||
        request.socket?.remoteAddress ||
        '127.0.0.1';

    const { termination, warning, ...confirmationInfo } = await terminationService.confirmTermination({
        customerId: request.user.id,
        terminationId: request.params.id,
        clientIp,
    });

    const responseData = {
        ...termination.toObject(),
        ...confirmationInfo,
        ...(warning ? { warning } : {}),
    };

    return ok(response, responseData, 'Đã xác nhận điện tử đơn chấm dứt hợp đồng');
});

export const approveTermination = asyncHandler(async (request, response) => {
    const { termination, contractEndedImmediately, warning } = await terminationService.approveTermination({
        adminId: request.user.id,
        terminationId: request.params.id,
    });

    const responseData = {
        ...termination.toObject(),
        contractEndedImmediately,
        ...(warning ? { warning } : {}),
    };

    return ok(response, responseData, 'Đã phê duyệt đơn chấm dứt hợp đồng đơn phương');
});

export const rejectTermination = asyncHandler(async (request, response) => {
    const { termination } = await terminationService.rejectTermination({
        adminId: request.user.id,
        terminationId: request.params.id,
        data: request.body,
    });

    return ok(response, termination, 'Đã từ chối đơn chấm dứt hợp đồng đơn phương');
});

export const cancelTermination = asyncHandler(async (request, response) => {
    const { termination } = await terminationService.cancelTermination({
        managerId: request.user.id,
        terminationId: request.params.id,
        data: request.body,
    });

    return ok(response, termination, 'Đã hủy đơn chấm dứt hợp đồng');
});

