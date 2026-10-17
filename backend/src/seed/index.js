// Tạo dữ liệu khởi tạo: 3 vai trò và tài khoản admin. Chạy: npm run seed
// Chạy lại nhiều lần an toàn, thứ gì đã có thì bỏ qua.
import 'dotenv/config';
import bcrypt from 'bcryptjs';

import { CONNECT_DB, CLOSE_DB } from '../config/db.js';
import { env } from '../config/env.js';
import { ROLE, USER_STATUS } from '../constants/enums.js';
import Role from '../models/Role.js';
import User from '../models/User.js';

const seedRoles = async () => {
    const roles = [
        { _id: ROLE.ADMIN, name: 'ADMIN' },
        { _id: ROLE.MANAGER, name: 'MANAGER' },
        { _id: ROLE.CUSTOMER, name: 'CUSTOMER' },
    ];

    // upsert + $setOnInsert: có rồi thì không ghi đè
    for (const role of roles) {
        await Role.updateOne({ _id: role._id }, { $setOnInsert: role }, { upsert: true });
    }
    console.log('Đã có đủ 3 vai trò');
};

const seedAdmin = async () => {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
        throw new Error('Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong .env');
    }

    const existed = await User.findOne({ email: env.ADMIN_EMAIL });
    if (existed) {
        console.log(`Admin đã tồn tại: ${env.ADMIN_EMAIL}`);
        return;
    }

    // User model không tự hash nên seed phải hash
    const password = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    await User.create({
        email: env.ADMIN_EMAIL,
        password,
        roleId: ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
    });
    console.log(`Đã tạo admin: ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}`);
};

CONNECT_DB()
    .then(async () => {
        console.log('Connected to MongoDB');
        await seedRoles();
        await seedAdmin();
        await CLOSE_DB();
        process.exit(0);
    })
    .catch((error) => {
        console.error('Seed lỗi:', error);
        process.exit(1);
    });