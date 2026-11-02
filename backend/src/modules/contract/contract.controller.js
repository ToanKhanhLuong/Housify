// Controller cho module contract: tạo hợp đồng, gửi lại lời mời (UC-24)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as contractService from './contract.service.js';

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

