// otp_tokens – OTP quên mật khẩu, hiệu lực 5 phút, dùng 1 lần (UC-04, BR-007)
import mongoose from 'mongoose';
import { TOKEN_STATUS, values } from '../constants/enums.js';

const { Schema } = mongoose;

const otpTokenSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        otp: {
            type: String,
            required: true
        }, // lưu bản hash
        status: {
            type: String,
            enum: values(TOKEN_STATUS)  // [USED, EXPIRED]
        }, // trống = chưa dùng
        expiresAt: {
            type: Date,
            required: true
        },
    },
    { timestamps: true },
);

export default mongoose.model('OtpToken', otpTokenSchema, 'otp_tokens');