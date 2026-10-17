import Notification from '../models/Notification.js';

/**
 * Tạo thông báo in-app. Không gửi email — email do service tự gọi sendMail sau khi lưu xong.
 * userIds: một id hoặc mảng id người nhận.
 * session: truyền vào khi gọi bên trong withTransaction.
 */
export const notify = async (
    { userIds, type, title, message, refId, createdBy },
    session,
) => {
    const list = Array.isArray(userIds) ? userIds : [userIds];
    const docs = list
        .filter(Boolean)
        .map((userId) => ({ userId, type, title, message, refId, createdBy, isRead: false }));

    if (docs.length === 0) return [];
    return Notification.insertMany(docs, session ? { session } : {});
};