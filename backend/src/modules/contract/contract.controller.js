// Controller cho module contract: tạo, gửi lại lời mời, xem danh sách/chi tiết, sửa, gia hạn, hủy hợp đồng nháp (UC-24..27, UC-46)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as contractService from './contract.service.js';

export const getContracts = asyncHandler(async (request, response) => {
    const data = await contractService.getContracts({
        userId: request.user.id,
        roleId: request.user.role,
        query: request.query,
    });

    return ok(response, data, 'Lấy danh sách hợp đồng thành công');
});

export const getContractById = asyncHandler(async (request, response) => {
    const data = await contractService.getContractById({
        userId: request.user.id,
        roleId: request.user.role,
        contractId: request.params.id,
    });

    return ok(response, data, 'Lấy chi tiết hợp đồng thành công');
});

export const createContract = asyncHandler(async (request, response) => {
    const { contract, rawToken, warning } = await contractService.createContract({
        managerId: request.user.id,
        data: request.body,
    });

    const responseData = {
        ...contract.toObject(),
        rawToken, // Hỗ trợ test demo
        warning,
    };

    return created(response, responseData, 'Đã gửi lời mời thành công');
});

export const updateContract = asyncHandler(async (request, response) => {
    const { contract, inviteInvalidated } = await contractService.updateContract({
        managerId: request.user.id,
        contractId: request.params.id,
        data: request.body,
    });

    const responseData = {
        ...contract.toObject(),
        ...(inviteInvalidated !== undefined ? { inviteInvalidated } : {}),
    };

    return ok(response, responseData, 'Cập nhật hợp đồng thành công');
});

export const resendInvite = asyncHandler(async (request, response) => {
    const { rawToken, warning } = await contractService.resendInvite({
        managerId: request.user.id,
        contractId: request.params.id,
    });

    return ok(
        response,
        { rawToken, warning },
        'Đã gửi lại lời mời thành công',
    );
});

export const renewContract = asyncHandler(async (request, response) => {
    const { contract, warning } = await contractService.renewContract({
        managerId: request.user.id,
        contractId: request.params.id,
        data: request.body,
    });

    const responseData = {
        ...contract.toObject(),
        warning,
    };

    return ok(response, responseData, 'Gia hạn hợp đồng thành công');
});

export const cancelDraftContract = asyncHandler(async (request, response) => {
    const { contract, warning } = await contractService.cancelDraftContract({
        managerId: request.user.id,
        contractId: request.params.id,
        data: request.body,
    });

    const responseData = {
        ...contract.toObject(),
        warning,
    };

    return ok(response, responseData, 'Đã hủy hợp đồng nháp');
});

export const getRefundPreview = asyncHandler(async (request, response) => {
    const data = await contractService.getRefundPreview({
        managerId: request.user.id,
        contractId: request.params.id,
    });

    return ok(response, data, 'Lấy thông tin xem trước hoàn cọc thành công');
});

export const refundDeposit = asyncHandler(async (request, response) => {
    const { contract, invoiceWarning, warning, ...rest } = await contractService.refundDeposit({
        managerId: request.user.id,
        contractId: request.params.id,
    });

    const responseData = {
        ...contract.toObject(),
        ...rest,
        invoiceWarning,
        warning,
    };

    return ok(response, responseData, 'Ghi nhận hoàn trả tiền đặt cọc thành công');
});
