// audit_logs – nhật ký thao tác không lưu vết ở collection khác; ghi qua helper audit()
import mongoose from 'mongoose';
import { AUDIT_ACTION, values } from '../constants/enums.js';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
    {
        actorId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }, // trống khi hệ thống tự chạy
        action: {
            type: String,
            enum: values(AUDIT_ACTION),
            required: true
        },
        targetType: {
            type: String,
            required: true
        }, // tên collection: 'users', 'contracts'…
        targetId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        reason: {
            type: String,
            trim: true
        }, // bắt buộc khi LOCK_USER (BR-029) – kiểm ở service
        metadata: {
            type: Schema.Types.Mixed
        }, // giá trị trước / sau
    },
    { timestamps: true },
);

export default mongoose.model('AuditLog', auditLogSchema, 'audit_logs');