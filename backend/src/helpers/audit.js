import AuditLog from '../models/AuditLog.js';

/**
 * Ghi nhật ký thao tác. Bỏ trống actorId khi do hệ thống tự chạy.
 * targetType là tên collection bị tác động, ví dụ 'users', 'contracts'.
 * session: truyền vào khi gọi bên trong withTransaction.
 */
export const audit = async (
    { actorId, action, targetType, targetId, reason, metadata },
    session,
) => {
    const [created] = await AuditLog.create(
        [{ actorId, action, targetType, targetId, reason, metadata }],
        session ? { session } : {},
    );
    return created;
};