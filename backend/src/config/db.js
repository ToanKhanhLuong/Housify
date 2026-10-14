// Kết nối MongoDB Atlas (cần replica set để dùng transaction)
import mongoose from 'mongoose';
import { env } from './env.js';

export const CONNECT_DB = async () => {
    await mongoose.connect(env.MONGO_URI);
};

export const CLOSE_DB = async () => {
    await mongoose.connection.close();
};