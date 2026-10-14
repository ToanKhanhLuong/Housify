// service_prices – đơn giá dịch vụ theo tòa, có lịch sử theo ngày hiệu lực (UC-22)
import mongoose from 'mongoose';

const { Schema } = mongoose;

const servicePriceSchema = new Schema(
    {
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: 'Service',
            required: true
        },
        buildingId: {
            type: Schema.Types.ObjectId,
            ref: 'Building',
            required: true
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        effectiveFrom: {
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

// cùng dịch vụ, cùng tòa, cùng ngày hiệu lực → sửa bản cũ, không tạo mới (UC-22 A1)
servicePriceSchema.index(
    {
        serviceId: 1,
        buildingId: 1,
        effectiveFrom: 1
    },
    {
        unique: true
    }
);

export default mongoose.model('ServicePrice', servicePriceSchema, 'service_prices');