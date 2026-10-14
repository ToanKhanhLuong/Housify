// room_types – loại phòng dùng chung toàn hệ thống (UC-20)
import mongoose from 'mongoose';

const { Schema } = mongoose;

const roomTypeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        }, // BR-053
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true },
);

export default mongoose.model('RoomType', roomTypeSchema, 'room_types');