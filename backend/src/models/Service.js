// services – danh mục dịch vụ dùng chung (UC-21)
import mongoose from 'mongoose';

const { Schema } = mongoose;

const serviceSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        }, // BR-055
        unit: {
            type: String,
            required: true,
            trim: true
        }, // chỉ để hiển thị: kWh, m³, tháng, người…
        isFixed: {
            type: Boolean,
            required: true
        }, // true: phí cố định → dòng FIXED; false: theo chỉ số → dòng METERED
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true },
);

export default mongoose.model('Service', serviceSchema, 'services');