// activation_tokens – link mời Customer / kích hoạt Manager, 24h, dùng 1 lần (UC-06, UC-08, UC-24)
import mongoose from 'mongoose';
import { ACTIVATION_TYPE, TOKEN_STATUS, values } from '../constants/enums.js';

const { Schema } = mongoose;

const activationTokenSchema = new Schema(
    {
        type: {
            type: String,
            enum: values(ACTIVATION_TYPE),
            required: true
        },
        contractId: {
            type: Schema.Types.ObjectId,
            ref: 'Contract'
        }, // có khi CUSTOMER_INVITE
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }, // có khi MANAGER_ACTIVATION
        token: {
            type: String,
            required: true,
            unique: true
        }, // lưu bản hash
        sentTo: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        status: {
            type: String,
            enum: values(TOKEN_STATUS)  // [USED, EXPIRED]
        }, // trống = còn dùng được
        expiresAt: {
            type: Date,
            required: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
    },
    { timestamps: true },
);

export default mongoose.model('ActivationToken', activationTokenSchema, 'activation_tokens');