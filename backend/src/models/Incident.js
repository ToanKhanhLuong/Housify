// incidents – báo cáo sự cố (UC-43, UC-44)
import mongoose from 'mongoose';
import { INCIDENT_STATUS, INCIDENT_TYPE, values } from '../constants/enums.js';

const { Schema } = mongoose;

const incidentSchema = new Schema(
    {
        incidentCode: {
            type: String,
            required: true,
            unique: true
        }, // BR-117
        contractId: {
            type: Schema.Types.ObjectId,
            ref: 'Contract',
            required: true
        },
        roomId: {
            type: Schema.Types.ObjectId,
            ref: 'Room',
            required: true
        },
        reportedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        type: {
            type: String,
            enum: values(INCIDENT_TYPE),
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        images: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            enum: values(INCIDENT_STATUS),  // [PENDING, IN_PROGRESS, RESOLVED, REJECTED]
            default: INCIDENT_STATUS.PENDING
        },
        handledBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }, // Manager xử lý (BR-120)
        resultNote: {
            type: String,
            trim: true
        }, // kết quả hoặc lý do từ chối
        resolvedAt: {
            type: Date
        }, // lúc RESOLVED (BR-120)
    },
    { timestamps: true },
);

export default mongoose.model('Incident', incidentSchema, 'incidents');