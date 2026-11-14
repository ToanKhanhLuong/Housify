// invoices – hóa đơn tháng, các dòng tiền nhúng trong items (UC-34..37)
import mongoose from 'mongoose';
import { INVOICE_ITEM_TYPE, INVOICE_STATUS, values } from '../constants/enums.js';

const { Schema } = mongoose;

// Một dòng tiền – description, unitPrice chụp lúc lập; amount do server tính
const invoiceItemSchema = new Schema(
    {
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: 'Service'
        }, // trống với RENT, EXTRA
        type: {
            type: String,
            enum: values(INVOICE_ITEM_TYPE),
            required: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        oldReading: {
            type: Number,
            min: 0
        }, // chỉ METERED
        newReading: {
            type: Number,
            min: 0
        }, // chỉ METERED, ≥ oldReading
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
    },
    { _id: false },
);

const invoiceSchema = new Schema(
    {
        invoiceCode: {
            type: String,
            required: true,
            unique: true
        }, // HD + YYMM + 4 ký tự, VD HD2610K7QX
        contractId: {
            type: Schema.Types.ObjectId,
            ref: 'Contract',
            required: true
        },
        month: {
            type: String,
            required: true,
            match: /^\d{4}-(0[1-9]|1[0-2])$/
        }, // "YYYY-MM"
        items: {
            type: [invoiceItemSchema],
            default: []
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        }, // tổng items.amount, server tính (BR-095)
        status: {
            type: String,
            enum: values(INVOICE_STATUS),   // [DRAFT, PENDING, PAID, CANCELLED]
            default: INVOICE_STATUS.DRAFT
        },
        dueDate: {
            type: Date
        }, // = sentAt + 7 ngày, đặt lúc gửi
        qrContent: {
            type: String
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        sentAt: {
            type: Date
        },
        paidAt: {
            type: Date
        },
        cancelReason: {
            type: String,
            trim: true
        },
    },
    { timestamps: true },
);

export default mongoose.model('Invoice', invoiceSchema, 'invoices');