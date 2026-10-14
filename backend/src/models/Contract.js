// contracts – hợp đồng thuê (UC-06, UC-24..27, UC-45, UC-46)
import mongoose from 'mongoose';
import { CONTRACT_STATUS, CONTRACT_TYPE, values } from '../constants/enums.js';

const { Schema } = mongoose;

const contractSchema = new Schema(
    {
        roomId: {
            type: Schema.Types.ObjectId,
            ref: 'Room',
            required: true
        },
        contractType: {
            type: String,
            enum: values(CONTRACT_TYPE),    // [SINGLE, GROUP]
            required: true
        },
        representativeCccd: {
            type: String,
            required: true,
            trim: true
        }, // khóa sau ACTIVE
        representativeEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        startDate: {
            type: Date,
            required: true
        }, // khóa sau ACTIVE (BR-067)
        endDate: {
            type: Date,
            required: true
        }, // gia hạn chỉ dời ngày này (BR-070)
        rentPrice: {
            type: Number,
            required: true,
            min: 0
        }, // snapshot từ phòng lúc tạo (BR-062)
        deposit: {
            type: Number,
            required: true,
            min: 0
        }, // snapshot từ phòng lúc tạo
        status: {
            type: String,
            enum: values(CONTRACT_STATUS),  // [DRAFT, ACTIVE, ENDED, CANCELLED]
            default: CONTRACT_STATUS.DRAFT
        }, // có đơn chấm dứt vẫn ACTIVE
        activatedAt: {
            type: Date
        }, // lúc khách tích đồng ý điều khoản – bằng chứng BR-014
        notes: {
            type: String
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        depositReceiverId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }, // = createdBy lúc kích hoạt
        // Hoàn cọc (UC-45): chỉ khi KHÔNG có đơn chấm dứt CONFIRMED, chỉ 1 lần
        depositRefundedAt: {
            type: Date
        },
        depositRefundedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
    },
    { timestamps: true },
);

export default mongoose.model('Contract', contractSchema, 'contracts');