// Controller cho module incident: gửi, xem và xử lý báo cáo sự cố (UC-43, UC-44)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as incidentService from './incident.service.js';

export const createIncident = asyncHandler(async (request, response) => {
    const data = await incidentService.createIncident({
        customerId: request.user.id,
        data: request.body,
    });

    return created(response, data, 'Đã gửi báo cáo sự cố');
});

export const getIncidents = asyncHandler(async (request, response) => {
    const data = await incidentService.getIncidents({
        userId: request.user.id,
        roleId: request.user.role,
        query: request.query,
    });

    return ok(response, data, 'Lấy danh sách đơn sự cố thành công');
});

export const getIncidentById = asyncHandler(async (request, response) => {
    const data = await incidentService.getIncidentById({
        userId: request.user.id,
        roleId: request.user.role,
        incidentId: request.params.id,
    });

    return ok(response, data, 'Lấy chi tiết đơn sự cố thành công');
});

export const acceptIncident = asyncHandler(async (request, response) => {
    const data = await incidentService.acceptIncident({
        managerId: request.user.id,
        incidentId: request.params.id,
    });

    return ok(response, data, 'Đã tiếp nhận đơn sự cố');
});

export const resolveIncident = asyncHandler(async (request, response) => {
    const data = await incidentService.resolveIncident({
        managerId: request.user.id,
        incidentId: request.params.id,
        data: request.body,
    });

    return ok(response, data, 'Đã đánh dấu đơn sự cố là đã giải quyết');
});

export const rejectIncident = asyncHandler(async (request, response) => {
    const data = await incidentService.rejectIncident({
        managerId: request.user.id,
        incidentId: request.params.id,
        data: request.body,
    });

    return ok(response, data, 'Đã từ chối đơn sự cố');
});
