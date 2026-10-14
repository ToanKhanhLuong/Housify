// managers – hồ sơ Manager, 1-1 với users (UC-05, UC-08, UC-09)
import mongoose from 'mongoose';

const { Schema } = mongoose;

const managerSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        // Manager tự điền 1 lần (BR-011), sau đó chỉ Admin sửa
        cccd: {
            type: String,
            trim: true
        }, // trống thì KHÔNG ghi field
        cccdFrontImage: {
            type: String
        },
        cccdBackImage: {
            type: String
        },
        dateOfBirth: {
            type: Date
        },
        address: {
            type: String,
            trim: true
        },
    },
    { timestamps: true },
);

// cccd chỉ unique khi đã có giá trị (không dùng sparse: sparse vẫn tính null là trùng)
managerSchema.index(
    {
        cccd: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            cccd: {
                $type: 'string'
            }
        }
    },
);

export default mongoose.model('Manager', managerSchema, 'managers');