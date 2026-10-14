// termination_requests – đơn chấm dứt hợp đồng: MUTUAL (UC-28), UNILATERAL (UC-29)
import mongoose from 'mongoose';
import { TERMINATION_STATUS, TERMINATION_TYPE, values } from '../constants/enums.js';

const { Schema } = mongoose;

const terminationRequestSchema = new Schema(
    {
        contractId: {
            type: Schema.Types.ObjectId,
            ref: 'Contract',
            required: true
        },
        type: {
            type: String,
            enum: values(TERMINATION_TYPE),
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true
        },
        effectiveDate: {
            type: Date,
            required: true
        },
        note: {
            type: String,
            trim: true
        }, // ghi chú bàn giao
        status: {
            type: String,
            enum: values(TERMINATION_STATUS),   // [PENDING, CONFIRMED, REJECTED, CANCELLED]
            default: TERMINATION_STATUS.PENDING
        },
        autoConfirmed: {
            type: Boolean,
            default: false
        }, // MUTUAL tự xác nhận sau 7 ngày (tính từ createdAt)
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        // Xác nhận (MUTUAL: Customer) / duyệt (UNILATERAL: Admin)
        handledBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        handledAt: {
            type: Date
        }, // cần để tính lại signatureHash
        handledIp: {
            type: String
        },
        signatureHash: {
            type: String
        }, // hash(nội dung đơn + người xác nhận + handledAt); trống khi tự xác nhận
        rejectReason: {
            type: String,
            trim: true
        },
        cancelledBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        cancelReason: {
            type: String,
            trim: true
        },
    },
    { timestamps: true },
);

export default mongoose.model('TerminationRequest', terminationRequestSchema, 'termination_requests');