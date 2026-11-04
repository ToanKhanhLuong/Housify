// Controller cho module announcement: Manager gửi thông báo chung (UC-40)
import asyncHandler from '../../utils/asyncHandler.js';
import { created } from '../../utils/response.js';
import * as announcementService from './announcement.service.js';

export const sendAnnouncement = asyncHandler(async (request, response) => {
    const data = await announcementService.sendAnnouncement({
        managerId: request.user.id,
        data: request.body,
    });

    return created(response, data, `Đã gửi thành công đến ${data.sentCount} tài khoản`);
});
