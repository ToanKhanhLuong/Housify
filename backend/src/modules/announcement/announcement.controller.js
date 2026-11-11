// Controller cho module announcement: Manager gửi thông báo chung và xem lịch sử thông báo (UC-40)
import asyncHandler from '../../utils/asyncHandler.js';
import { created, ok } from '../../utils/response.js';
import * as announcementService from './announcement.service.js';

export const sendAnnouncement = asyncHandler(async (request, response) => {
    const data = await announcementService.sendAnnouncement({
        managerId: request.user.id,
        data: request.body,
    });

    return created(response, data, `Đã gửi thành công đến ${data.sentCount} tài khoản`);
});

export const listAnnouncements = asyncHandler(async (request, response) => {
    const data = await announcementService.listAnnouncements({
        managerId: request.user.id,
        query: request.query,
    });

    return ok(response, data, 'Lấy lịch sử thông báo thành công');
});

