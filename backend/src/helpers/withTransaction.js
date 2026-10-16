import mongoose from 'mongoose';

// Chạy fn trong 1 transaction: commit nếu ok, rollback nếu lỗi.
// fn nhận session, dùng: await Model.create([doc], { session })
export const withTransaction = async (fn) => {
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await fn(session);
        });
        return result;
    } finally {
        await session.endSession();
    }
};