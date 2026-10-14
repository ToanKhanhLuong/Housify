// payments – giao dịch SePay đã khớp hóa đơn (UC-38, UC-39)
import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentSchema = new Schema(
    {
        sepayTxnId: {
            type: String,
            required: true,
            unique: true
        }, // chống xử lý webhook trùng (BR-105)
        invoiceId: {
            type: Schema.Types.ObjectId,
            ref: 'Invoice',
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        transferContent: {
            type: String,
            required: true
        },
        bankName: {
            type: String,
            required: true
        },
        paidAt: {
            type: Date,
            required: true
        },
    },
    { timestamps: true },
);

export default mongoose.model('Payment', paymentSchema, 'payments');