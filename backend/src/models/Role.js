// roles – vai trò, seed sẵn 3 bản ghi (0 ADMIN, 1 MANAGER, 2 CUSTOMER)
import mongoose from 'mongoose';
import { ROLE, values } from '../constants/enums.js';

const { Schema } = mongoose;

const roleSchema = new Schema(
    {
        _id: {
            type: Number,
            enum: values(ROLE)  // [ADMIN - 0, MANAGER - 1, CUSTOMER - 2]
        }, // _id là số, không tự sinh
        name: {
            type: String,
            required: true,
            trim: true
        },
    },
    { timestamps: true },
);

export default mongoose.model('Role', roleSchema, 'roles');