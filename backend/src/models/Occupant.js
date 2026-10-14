// occupants – cư dân theo hợp đồng, mỗi người 1 hồ sơ; đại diện có userId (UC-06, UC-30..33)
import mongoose from 'mongoose';
import { OCCUPANT_STATUS, values } from '../constants/enums.js';

const { Schema } = mongoose;

const occupantSchema = new Schema(
    {
        contractId: {
            type: Schema.Types.ObjectId,
            ref: 'Contract',
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }, // chỉ người đại diện có (BR-088)
        isRepresentative: {
            type: Boolean,
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        dateOfBirth: {
            type: Date,
            required: true
        },
        address: {
            type: String,
            trim: true
        },
        cccd: {
            type: String,
            required: true,
            trim: true
        }, // đại diện: định danh đăng nhập
        cccdFrontImage: {
            type: String
        },
        cccdBackImage: {
            type: String
        },
        status: {
            type: String,
            enum: values(OCCUPANT_STATUS),  // [STAYED, LEFT]
            default: OCCUPANT_STATUS.STAYED
        },
        joinDate: {
            type: Date,
            required: true
        },
        exitDate: {
            type: Date
        },
    },
    { timestamps: true },
);

// cccd không trùng trong 1 hợp đồng
occupantSchema.index({ contractId: 1, cccd: 1 }, { unique: true });

export default mongoose.model('Occupant', occupantSchema, 'occupants');