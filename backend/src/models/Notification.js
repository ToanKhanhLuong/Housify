// notifications – thông báo chuông, mỗi người nhận 1 bản ghi; tạo qua helper notify() (UC-40, UC-41)
import mongoose from 'mongoose';
import { NOTIFICATION_TYPE, values } from '../constants/enums.js';

const { Schema } = mongoose;

const notificationSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }, // người nhận
        type: {
            type: String,
            enum: values(NOTIFICATION_TYPE),
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        message: {
            type: String,
            required: true
        },
        refId: {
            type: Schema.Types.ObjectId
        }, // id hóa đơn / hợp đồng / đơn chấm dứt / sự cố – FE mở trang theo type + refId
        isRead: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }, // trống nếu hệ thống tạo
    },
    { timestamps: true },
);

// đếm chưa đọc và lấy danh sách mới nhất của 1 người (UC-41) – không unique
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema, 'notifications');