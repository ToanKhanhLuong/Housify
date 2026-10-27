// Tạo dữ liệu khởi tạo: 3 vai trò, tài khoản admin và 1 Manager test. Chạy: npm run seed
// Chạy lại nhiều lần an toàn, thứ gì đã có thì bỏ qua.
// Quy ước: chỉ leader chạy seed lên DB chung, cả nhóm dùng chung dữ liệu này. Thành viên khác không tự chạy.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { CONNECT_DB, CLOSE_DB } from '../config/db.js';
import { env } from '../config/env.js';
import { ROLE, USER_STATUS, ACTIVATION_TYPE, TOKEN_STATUS, AUDIT_ACTION } from '../constants/enums.js';
import { withTransaction } from '../helpers/withTransaction.js';
import Role from '../models/Role.js';
import User from '../models/User.js';
import Manager from '../models/Manager.js';
import Building from '../models/Building.js';
import ActivationToken from '../models/ActivationToken.js';
import AuditLog from '../models/AuditLog.js';

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

// Manager test: như đã đi hết luồng UC-08 (Admin tạo, Manager tự kích hoạt) → UC-11 (phân công vào Tòa Test)
const MANAGER_EMAIL = 'khiconst20092004@gmail.com';
const MANAGER_PASSWORD = 'Manager123';
const MANAGER_PHONE = '0912345678';
const MANAGER_CCCD = '001204012345';
const MANAGER_BUILDING = 'Tòa Test';

const seedManager = async () => {
    const existed = await User.findOne({ email: MANAGER_EMAIL });
    if (existed) {
        console.log(`Manager đã tồn tại: ${MANAGER_EMAIL}, bỏ qua`);
        return;
    }

    const admin = await User.findOne({ roleId: ROLE.ADMIN });
    if (!admin) {
        throw new Error('Chưa có admin để làm người tạo Manager');
    }

    await withTransaction(async (session) => {
        // phone và cccd của Manager là unique (BR-010)
        const phoneUsed = await Manager.findOne({ phone: MANAGER_PHONE }).session(session);
        if (phoneUsed) {
            throw new Error(`SĐT ${MANAGER_PHONE} đã thuộc Manager khác`);
        }
        const cccdUsed = await Manager.findOne({ cccd: MANAGER_CCCD }).session(session);
        if (cccdUsed) {
            throw new Error(`CCCD ${MANAGER_CCCD} đã thuộc Manager khác`);
        }

        // Tài khoản đã kích hoạt: có mật khẩu, ACTIVE
        const [user] = await User.create(
            [
                {
                    email: MANAGER_EMAIL,
                    password: await bcrypt.hash(MANAGER_PASSWORD, 10),
                    roleId: ROLE.MANAGER,
                    status: USER_STATUS.ACTIVE,
                },
            ],
            { session },
        );

        // Hồ sơ: Admin nhập name, phone (UC-08); cccd Manager tự điền (BR-011), các field khác để trống điền sau
        await Manager.create(
            [
                {
                    userId: user._id,
                    name: 'Quản lý Test',
                    phone: MANAGER_PHONE,
                    cccd: MANAGER_CCCD,
                },
            ],
            { session },
        );

        // Link kích hoạt đã dùng
        await ActivationToken.create(
            [
                {
                    type: ACTIVATION_TYPE.MANAGER_ACTIVATION,
                    userId: user._id,
                    token: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex'),
                    sentTo: MANAGER_EMAIL,
                    status: TOKEN_STATUS.USED,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tạo + 24h
                    createdBy: admin._id,
                },
            ],
            { session },
        );

        // Phân công vào Tòa Test nếu tòa còn trống Manager (BR-030, BR-031)
        const building = await Building.findOne({ name: MANAGER_BUILDING, isDeleted: false }).session(session);
        if (!building) {
            console.log(`Không có ${MANAGER_BUILDING}, Manager chưa được phân công tòa`);
        } else if (building.managerId) {
            console.log(`${MANAGER_BUILDING} đã có Manager khác, Manager chưa được phân công tòa`);
        } else {
            building.managerId = user._id;
            await building.save({ session });
            await AuditLog.create(
                [
                    {
                        actorId: admin._id,
                        action: AUDIT_ACTION.ASSIGN_MANAGER,
                        targetType: 'buildings',
                        targetId: building._id,
                        metadata: {
                            managerId: user._id,
                        },
                    },
                ],
                { session },
            );
            console.log(`Đã phân công Manager vào ${MANAGER_BUILDING}`);
        }

        console.log(`Đã tạo Manager: ${MANAGER_EMAIL} / ${MANAGER_PASSWORD}`);
    });
};

CONNECT_DB()
    .then(async () => {
        console.log('Connected to MongoDB');
        await seedRoles();
        await seedAdmin();
        await seedManager();
        await CLOSE_DB();
        process.exit(0);
    })
    .catch((error) => {
        console.error('Seed lỗi:', error);
        process.exit(1);
    });