// Controller cho module dashboard: tổng quan Admin, tổng quan Manager, báo cáo (UC-07, UC-47, UC-48)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as dashboardService from './dashboard.service.js';

export const getAdminDashboard = asyncHandler(async (request, response) => {
    const data = await dashboardService.getAdminDashboard({ query: request.query });

    return ok(response, data, 'Lấy tổng quan hệ thống thành công');
});

export const getManagerDashboard = asyncHandler(async (request, response) => {
    const data = await dashboardService.getManagerDashboard({ managerId: request.user.id });

    return ok(response, data, 'Lấy tổng quan tòa nhà thành công');
});

export const getReport = asyncHandler(async (request, response) => {
    const data = await dashboardService.getReport({
        userId: request.user.id,
        roleId: request.user.role,
        query: request.query,
    });

    return ok(response, data, 'Lấy báo cáo thành công');
});
