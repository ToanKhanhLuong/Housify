// rooms – phòng (UC-16..19)
import mongoose from 'mongoose';
import { ROOM_STATUS, values } from '../constants/enums.js';

const { Schema } = mongoose;

const roomSchema = new Schema(
    {
        buildingId: {
            type: Schema.Types.ObjectId,
            ref: 'Building',
            required: true
        },
        floorNumber: {
            type: Number,
            required: true,
            min: 1
        }, // 1 → buildings.floorCount
        roomTypeId: {
            type: Schema.Types.ObjectId,
            ref: 'RoomType',
            required: true
        },
        roomNumber: {
            type: String,
            required: true,
            trim: true
        }, // không sửa sau khi tạo (BR-046)
        area: {
            type: Number,
            required: true,
            min: 0
        },
        images: {
            type: [String],
            default: []
        },
        capacity: {
            type: Number,
            required: true,
            min: 1
        },
        rentPrice: {
            type: Number,
            required: true,
            min: 0
        }, // giá niêm yết hiện tại
        deposit: {
            type: Number,
            required: true,
            min: 0
        }, // cọc niêm yết hiện tại
        status: {
            type: String,
            enum: values(ROOM_STATUS),  // [AVAILABLE, OCCUPIED, MAINTENANCE]
            default: ROOM_STATUS.AVAILABLE
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date
        },
    },
    { timestamps: true },
);

// mã phòng duy nhất trong tòa, không tính phòng đã xóa (BR-043, BR-050)
roomSchema.index(
    { buildingId: 1, roomNumber: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } },
);

export default mongoose.model('Room', roomSchema, 'rooms');