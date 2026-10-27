// Controller cho module notification: chuông thông báo của chính mình (UC-41)
import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as notificationService from './notification.service.js';

export const getMyNotifications = asyncHandler(async (request, response) => {
    const data = await notificationService.getMyNotifications(request.user.id, request.query);
    return ok(response, data, 'Lấy danh sách thông báo thành công');
});

export const getUnreadCount = asyncHandler(async (request, response) => {
    const data = await notificationService.getUnreadCount(request.user.id);
    return ok(response, data, 'Lấy số thông báo chưa đọc thành công');
});

export const markAsRead = asyncHandler(async (request, response) => {
    const data = await notificationService.markAsRead(request.user.id, request.params.id);
    return ok(response, data, 'Đã đánh dấu đã đọc');
});

export const markAllAsRead = asyncHandler(async (request, response) => {
    const data = await notificationService.markAllAsRead(request.user.id);
    return ok(response, data, 'Đã đánh dấu tất cả là đã đọc');
});
