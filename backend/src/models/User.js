// users – CHỈ tài khoản đăng nhập, không chứa hồ sơ (hồ sơ ở managers / occupants)
import mongoose from 'mongoose';
import { ROLE, USER_STATUS, values } from '../constants/enums.js';

const { Schema } = mongoose;

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            select: false
        }, // hash; trống khi Manager chưa kích hoạt. Đăng nhập: .select('+password')
        roleId: {
            type: Number,
            ref: 'Role',
            required: true,
            enum: values(ROLE)
        },
        status: {
            type: String,
            enum: values(USER_STATUS),  // [ACTIVE, INACTIVE, PENDING, LOCKED]
            required: true
        },
    },
    { timestamps: true },
);

export default mongoose.model('User', userSchema, 'users');