// room_types – loại phòng dùng chung toàn hệ thống (UC-20)
import mongoose from 'mongoose';

const { Schema } = mongoose;

const roomTypeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        }, // BR-053 – unique partial ở index bên dưới
        capacity: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: 'Sức chứa phải là số nguyên'
            }
        }, // sức chứa tối đa của mọi phòng thuộc loại này
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true },
);

// tên duy nhất trong các loại chưa xóa, loại đã xóa thì tên dùng lại được (BR-053)
roomTypeSchema.index(
    { name: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } },
);

export default mongoose.model('RoomType', roomTypeSchema, 'room_types');