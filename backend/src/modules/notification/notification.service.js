// Nghiệp vụ cho module notification: xem chuông, đếm chưa đọc, đánh dấu đã đọc (UC-41)
// Chỉ đọc và đánh dấu đã đọc. Tạo thông báo do module khác gọi helper notify(); không có xóa (BR-111)
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { paginate } from '../../utils/pagination.js';
import Notification from '../../models/Notification.js';

const ITEM_FIELDS = 'type title message refId isRead createdAt';

const toItem = (notification) => ({
    _id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    refId: notification.refId || null,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
});

// Chỉ thông báo của chính người đăng nhập, mới nhất trước (BR-112)
export const getMyNotifications = async (userId, { page, limit, unread }) => {
    const filter = { userId };
    if (unread) {
        filter.isRead = false;
    }

    const result = await paginate(Notification, filter, {
        page,
        limit,
        sort: { createdAt: -1 },
        select: ITEM_FIELDS,
    });

    return {
        ...result,
        items: result.items.map(toItem),
    };
};

// Chuông gọi lặp lại nên chỉ đếm
export const getUnreadCount = async (userId) => {
    const count = await Notification.countDocuments({ userId, isRead: false });
    return { count };
};

export const markAsRead = async (userId, notificationId) => {
    // Sai id, không có, hay của người khác đều báo chung một câu để không lộ thông báo người khác
    if (!mongoose.isObjectIdOrHexString(notificationId)) {
        throw new AppError('Không tìm thấy thông báo', 404);
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { returnDocument: 'after' },
    )
        .select(ITEM_FIELDS)
        .lean();

    if (!notification) {
        throw new AppError('Không tìm thấy thông báo', 404);
    }

    return toItem(notification);
};

export const markAllAsRead = async (userId) => {
    const result = await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    return { updated: result.modifiedCount };
};
