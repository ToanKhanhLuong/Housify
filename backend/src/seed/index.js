// Tạo dữ liệu khởi tạo: 3 vai trò, admin, Manager test, tòa nhà, loại phòng, phòng mẫu, hợp đồng mẫu Iter 2 (ACTIVE + DRAFT, cư dân), thông báo mẫu (UC-41). Chạy: npm run seed
// Chạy lại nhiều lần an toàn, thứ gì đã có thì bỏ qua.
// Quy ước: chỉ leader chạy seed lên DB chung, cả nhóm dùng chung dữ liệu này. Thành viên khác không tự chạy.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { CONNECT_DB, CLOSE_DB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    ROLE,
    USER_STATUS,
    ACTIVATION_TYPE,
    TOKEN_STATUS,
    AUDIT_ACTION,
    NOTIFICATION_TYPE,
    ROOM_STATUS,
    CONTRACT_STATUS,
    CONTRACT_TYPE,
    OCCUPANT_STATUS,
} from '../constants/enums.js';
import { withTransaction } from '../helpers/withTransaction.js';
import { notify } from '../helpers/notify.js';
import { generateActivationToken, ACTIVATION_TOKEN_TTL_MS } from '../helpers/activationToken.js';
import Role from '../models/Role.js';
import User from '../models/User.js';
import Manager from '../models/Manager.js';
import Building from '../models/Building.js';
import ActivationToken from '../models/ActivationToken.js';
import AuditLog from '../models/AuditLog.js';
import Occupant from '../models/Occupant.js';
import Notification from '../models/Notification.js';
import RoomType from '../models/RoomType.js';
import Room from '../models/Room.js';
import Contract from '../models/Contract.js';

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

// Dữ liệu test cho Quản lý Manager (UC-09..11). Email để dạng biến, đổi thành email thật trước khi chạy
const MANAGER2_EMAIL = 'annbhe182167@fpt.edu.vn';
const MANAGER2_PASSWORD = 'Manager123';
const MANAGER2_PHONE = '0912000002';
const PENDING_MANAGER_EMAIL = 'lanphuong104204@gmail.com';
const PENDING_MANAGER_PHONE = '0912000003';
const BUILDING2_NAME = 'Tòa Test 2';

// Manager ACTIVE thứ 2: đã kích hoạt, CHƯA có tòa – để test danh sách chọn và phân công (UC-11)
const seedManager2 = async (admin) => {
    if (await User.exists({ email: MANAGER2_EMAIL })) {
        console.log(`Manager đã tồn tại: ${MANAGER2_EMAIL}, bỏ qua`);
        return;
    }

    await withTransaction(async (session) => {
        const [user] = await User.create(
            [
                {
                    email: MANAGER2_EMAIL,
                    password: await bcrypt.hash(MANAGER2_PASSWORD, 10),
                    roleId: ROLE.MANAGER,
                    status: USER_STATUS.ACTIVE,
                },
            ],
            { session },
        );
        await Manager.create(
            [
                {
                    userId: user._id,
                    name: 'Quản lý Test 2',
                    phone: MANAGER2_PHONE,
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
                    token: generateActivationToken().tokenHash,
                    sentTo: MANAGER2_EMAIL,
                    status: TOKEN_STATUS.USED,
                    expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
                    createdBy: admin._id,
                },
            ],
            { session },
        );
    });
    console.log(`Đã tạo Manager chưa có tòa: ${MANAGER2_EMAIL} / ${MANAGER2_PASSWORD}`);
};

// Manager PENDING: chưa có mật khẩu, link kích hoạt còn hạn – để test gửi lại link, xóa, chặn phân công
const seedPendingManager = async (admin) => {
    if (await User.exists({ email: PENDING_MANAGER_EMAIL })) {
        console.log(`Manager đã tồn tại: ${PENDING_MANAGER_EMAIL}, bỏ qua`);
        return;
    }

    await withTransaction(async (session) => {
        const [user] = await User.create(
            [
                {
                    email: PENDING_MANAGER_EMAIL,
                    roleId: ROLE.MANAGER,
                    status: USER_STATUS.PENDING,
                },
            ],
            { session },
        );
        await Manager.create(
            [
                {
                    userId: user._id,
                    name: 'Quản lý Chưa Kích Hoạt',
                    phone: PENDING_MANAGER_PHONE,
                },
            ],
            { session },
        );
        await ActivationToken.create(
            [
                {
                    type: ACTIVATION_TYPE.MANAGER_ACTIVATION,
                    userId: user._id,
                    token: generateActivationToken().tokenHash,
                    sentTo: PENDING_MANAGER_EMAIL,
                    expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
                    createdBy: admin._id,
                },
            ],
            { session },
        );
    });
    // Token gốc không in ra; cần link thật thì gọi POST /api/managers/:id/resend-activation
    console.log(`Đã tạo Manager chưa kích hoạt: ${PENDING_MANAGER_EMAIL}`);
};

// Tòa thứ 2 chưa có Manager – để test phân công
const seedBuilding2 = async () => {
    if (await Building.exists({ name: BUILDING2_NAME, isDeleted: false })) {
        console.log(`Tòa đã tồn tại: ${BUILDING2_NAME}, bỏ qua`);
        return;
    }

    await Building.create({
        name: BUILDING2_NAME,
        address: 'Hải Phòng',
        floorCount: 3,
    });
    console.log(`Đã tạo tòa chưa có Manager: ${BUILDING2_NAME}`);
};

const seedManagerTestData = async () => {
    const admin = await User.findOne({ roleId: ROLE.ADMIN });
    if (!admin) {
        throw new Error('Chưa có admin để làm người tạo Manager');
    }

    await seedManager2(admin);
    await seedPendingManager(admin);
    await seedBuilding2();
};

// Seed loại phòng: room_types có capacity ≥ 1 (chốt 30/10)
// Chỉ tạo khi chưa có loại cùng tên (chưa xóa), không ghi đè dữ liệu có sẵn
const seedRoomTypes = async () => {
    const roomTypes = [
        { name: 'Phòng đơn', capacity: 1 },
        { name: 'Phòng đôi', capacity: 2 },
        { name: 'Phòng gia đình', capacity: 4 },
    ];

    for (const rt of roomTypes) {
        const existed = await RoomType.findOne({ name: rt.name, isDeleted: false });
        if (existed) {
            console.log(`Loại phòng "${rt.name}" đã tồn tại, bỏ qua`);
            continue;
        }
        await RoomType.create({ name: rt.name, capacity: rt.capacity, isDeleted: false });
        console.log(`Đã tạo loại phòng: ${rt.name} (sức chứa ${rt.capacity})`);
    }
    console.log('Đã hoàn tất kiểm tra/tạo loại phòng mẫu');
};

// Seed phòng mẫu: 25 phòng trải đều 5 tầng (5 phòng/tầng) với đủ các loại phòng (chốt 30/10)
// Chỉ tạo khi phòng chưa tồn tại trong tòa, không ghi đè dữ liệu có sẵn
const seedRooms = async () => {
    const building = await Building.findOne({ name: MANAGER_BUILDING, isDeleted: false });
    if (!building) {
        console.log(`Chưa có ${MANAGER_BUILDING} để tạo phòng mẫu`);
        return;
    }

    const singleType = await RoomType.findOne({ name: 'Phòng đơn', isDeleted: false });
    const doubleType = await RoomType.findOne({ name: 'Phòng đôi', isDeleted: false });
    const familyType = await RoomType.findOne({ name: 'Phòng gia đình', isDeleted: false });

    if (!singleType || !doubleType || !familyType) {
        console.log('Chưa có đủ 3 loại phòng để tạo phòng mẫu');
        return;
    }

    const sampleRooms = [
        // Tầng 1
        { buildingId: building._id, roomNumber: '101', floorNumber: 1, roomTypeId: singleType._id, area: 20, rentPrice: 3500000, deposit: 3500000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '102', floorNumber: 1, roomTypeId: doubleType._id, area: 28, rentPrice: 5000000, deposit: 5000000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '103', floorNumber: 1, roomTypeId: singleType._id, area: 20, rentPrice: 3500000, deposit: 3500000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '104', floorNumber: 1, roomTypeId: doubleType._id, area: 28, rentPrice: 5000000, deposit: 5000000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '105', floorNumber: 1, roomTypeId: familyType._id, area: 45, rentPrice: 7500000, deposit: 7500000, status: ROOM_STATUS.AVAILABLE },

        // Tầng 2
        { buildingId: building._id, roomNumber: '201', floorNumber: 2, roomTypeId: doubleType._id, area: 30, rentPrice: 5500000, deposit: 5500000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '202', floorNumber: 2, roomTypeId: singleType._id, area: 22, rentPrice: 3800000, deposit: 3800000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '203', floorNumber: 2, roomTypeId: doubleType._id, area: 28, rentPrice: 5200000, deposit: 5200000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '204', floorNumber: 2, roomTypeId: familyType._id, area: 48, rentPrice: 7800000, deposit: 7800000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '205', floorNumber: 2, roomTypeId: doubleType._id, area: 30, rentPrice: 5500000, deposit: 5500000, status: ROOM_STATUS.AVAILABLE },

        // Tầng 3
        { buildingId: building._id, roomNumber: '301', floorNumber: 3, roomTypeId: singleType._id, area: 20, rentPrice: 3500000, deposit: 3500000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '302', floorNumber: 3, roomTypeId: doubleType._id, area: 28, rentPrice: 5000000, deposit: 5000000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '303', floorNumber: 3, roomTypeId: familyType._id, area: 45, rentPrice: 7500000, deposit: 7500000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '304', floorNumber: 3, roomTypeId: doubleType._id, area: 28, rentPrice: 5000000, deposit: 5000000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '305', floorNumber: 3, roomTypeId: singleType._id, area: 20, rentPrice: 3500000, deposit: 3500000, status: ROOM_STATUS.AVAILABLE },

        // Tầng 4
        { buildingId: building._id, roomNumber: '401', floorNumber: 4, roomTypeId: doubleType._id, area: 28, rentPrice: 5000000, deposit: 5000000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '402', floorNumber: 4, roomTypeId: singleType._id, area: 20, rentPrice: 3500000, deposit: 3500000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '403', floorNumber: 4, roomTypeId: doubleType._id, area: 28, rentPrice: 5000000, deposit: 5000000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '404', floorNumber: 4, roomTypeId: familyType._id, area: 50, rentPrice: 8000000, deposit: 8000000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '405', floorNumber: 4, roomTypeId: doubleType._id, area: 30, rentPrice: 5200000, deposit: 5200000, status: ROOM_STATUS.AVAILABLE },

        // Tầng 5
        { buildingId: building._id, roomNumber: '501', floorNumber: 5, roomTypeId: familyType._id, area: 50, rentPrice: 8000000, deposit: 8000000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '502', floorNumber: 5, roomTypeId: doubleType._id, area: 30, rentPrice: 5200000, deposit: 5200000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '503', floorNumber: 5, roomTypeId: singleType._id, area: 22, rentPrice: 3800000, deposit: 3800000, status: ROOM_STATUS.AVAILABLE },
        { buildingId: building._id, roomNumber: '504', floorNumber: 5, roomTypeId: doubleType._id, area: 28, rentPrice: 5000000, deposit: 5000000, status: ROOM_STATUS.MAINTENANCE },
        { buildingId: building._id, roomNumber: '505', floorNumber: 5, roomTypeId: familyType._id, area: 45, rentPrice: 7500000, deposit: 7500000, status: ROOM_STATUS.MAINTENANCE },
    ];

    for (const r of sampleRooms) {
        const existed = await Room.findOne({
            buildingId: r.buildingId,
            roomNumber: r.roomNumber,
            isDeleted: false,
        });
        if (existed) {
            continue;
        }
        await Room.create({ ...r, isDeleted: false });
        console.log(`Đã tạo phòng ${r.roomNumber} tòa ${building.name} (${r.status})`);
    }
    console.log('Đã hoàn tất kiểm tra/tạo 25 phòng mẫu');
};

// Thông báo mẫu cho chuông (UC-41): tạo qua notify(), lần lượt từng cái để createdAt khác nhau (cũ → mới)
// Seed Iter 2: Đầy đủ các loại hợp đồng và cư dân (ACTIVE, DRAFT, ENDED, CANCELLED)
const CUSTOMER_COMMON_PASSWORD = 'Customer123';

const ACTIVE_CONTRACT_DEFS = [
    {
        roomNumber: '102',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Nguyễn Văn Đại Diện', cccd: '031204005476', phone: '0987654321', email: 'customer@housify.vn', dob: '2003-05-15', address: '123 Cầu Giấy, Hà Nội' },
        roommates: [
            { name: 'Trần Thị Bạn Cùng Phòng', cccd: '031204009999', phone: '0988123456', dob: '2003-08-20', address: '456 Giải Phóng, Hà Nội', status: OCCUPANT_STATUS.STAYED },
            { name: 'Lê Văn Cũ', cccd: '031204009998', phone: '0988123999', dob: '2002-04-10', address: '789 Đống Đa, Hà Nội', status: OCCUPANT_STATUS.LEFT, exitDate: new Date('2026-08-15') },
        ],
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-08-31'),
        notes: 'Hợp đồng nhóm mẫu phòng 102',
    },
    {
        roomNumber: '104',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Lê Văn Thành', cccd: '031204000104', phone: '0981000104', email: 'customer104@housify.vn', dob: '2002-11-10', address: 'Thanh Xuân, Hà Nội' },
        roommates: [
            { name: 'Phạm Thị Hoa', cccd: '031204000204', phone: '0982000204', dob: '2003-02-14', address: 'Nam Từ Liêm, Hà Nội', status: OCCUPANT_STATUS.STAYED },
        ],
        startDate: new Date('2026-08-01'),
        endDate: new Date('2027-07-31'),
        notes: 'Hợp đồng nhóm phòng 104',
    },
    {
        roomNumber: '105',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Hoàng Minh Đức', cccd: '031204000105', phone: '0981000105', email: 'customer105@housify.vn', dob: '2001-09-25', address: 'Bắc Từ Liêm, Hà Nội' },
        roommates: [
            { name: 'Bùi Văn Nam', cccd: '031204000205', phone: '0982000205', dob: '2002-07-19', address: 'Hà Đông, Hà Nội', status: OCCUPANT_STATUS.STAYED },
            { name: 'Nguyễn Thị Thúy', cccd: '031204000305', phone: '0983000305', dob: '2003-12-01', address: 'Hai Bà Trưng, Hà Nội', status: OCCUPANT_STATUS.STAYED },
        ],
        startDate: new Date('2026-07-15'),
        endDate: new Date('2027-07-14'),
        notes: 'Hợp đồng gia đình phòng 105',
    },
    {
        roomNumber: '201',
        contractType: CONTRACT_TYPE.SINGLE,
        rep: { name: 'Vũ Thị Hường', cccd: '031204000201', phone: '0981000201', email: 'customer201@housify.vn', dob: '2004-03-30', address: 'Hoàng Mai, Hà Nội' },
        roommates: [],
        startDate: new Date('2026-09-15'),
        endDate: new Date('2027-09-14'),
        notes: 'Hợp đồng đơn phòng 201',
    },
    {
        roomNumber: '203',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Đỗ Quang Huy', cccd: '031204000203', phone: '0981000203', email: 'customer203@housify.vn', dob: '2003-01-12', address: 'Cầu Giấy, Hà Nội' },
        roommates: [
            { name: 'Đặng Thu Trang', cccd: '031204000233', phone: '0982000233', dob: '2003-06-18', address: 'Tây Hồ, Hà Nội', status: OCCUPANT_STATUS.STAYED },
        ],
        startDate: new Date('2026-06-01'),
        endDate: new Date('2027-05-31'),
        notes: 'Hợp đồng đôi phòng 203',
    },
    {
        roomNumber: '204',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Ngô Gia Bảo', cccd: '031204000204', phone: '0981000204', email: 'customer204@housify.vn', dob: '2001-10-05', address: 'Long Biên, Hà Nội' },
        roommates: [
            { name: 'Đinh Văn Long', cccd: '031204000244', phone: '0982000244', dob: '2002-05-22', address: 'Gia Lâm, Hà Nội', status: OCCUPANT_STATUS.STAYED },
            { name: 'Vũ Thu Hà', cccd: '031204000245', phone: '0983000245', dob: '2003-09-09', address: 'Đông Anh, Hà Nội', status: OCCUPANT_STATUS.STAYED },
        ],
        startDate: new Date('2026-05-15'),
        endDate: new Date('2027-05-14'),
        notes: 'Hợp đồng nhóm phòng 204',
    },
    {
        roomNumber: '205',
        contractType: CONTRACT_TYPE.SINGLE,
        rep: { name: 'Bùi Thị Lan', cccd: '031204000205', phone: '0981000205', email: 'customer205@housify.vn', dob: '2004-07-21', address: 'Mê Linh, Hà Nội' },
        roommates: [],
        startDate: new Date('2026-08-10'),
        endDate: new Date('2027-08-09'),
        notes: 'Hợp đồng đơn phòng 205',
    },
    {
        roomNumber: '302',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Đặng Tuấn Anh', cccd: '031204000302', phone: '0981000302', email: 'customer302@housify.vn', dob: '2002-12-08', address: 'Sóc Sơn, Hà Nội' },
        roommates: [
            { name: 'Phạm Thu Hiền', cccd: '031204000322', phone: '0982000322', dob: '2003-04-11', address: 'Thường Tín, Hà Nội', status: OCCUPANT_STATUS.STAYED },
        ],
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        notes: 'Hợp đồng đôi phòng 302',
    },
    {
        roomNumber: '303',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Trịnh Công Sơn', cccd: '031204000303', phone: '0981000303', email: 'customer303@housify.vn', dob: '2001-08-19', address: 'Phú Xuyên, Hà Nội' },
        roommates: [
            { name: 'Đoàn Văn Hậu', cccd: '031204000333', phone: '0982000333', dob: '2002-10-15', address: 'Thái Bình', status: OCCUPANT_STATUS.STAYED },
        ],
        startDate: new Date('2026-07-01'),
        endDate: new Date('2027-06-30'),
        notes: 'Hợp đồng nhóm phòng 303',
    },
    {
        roomNumber: '304',
        contractType: CONTRACT_TYPE.SINGLE,
        rep: { name: 'Dương Mỹ Linh', cccd: '031204000304', phone: '0981000304', email: 'customer304@housify.vn', dob: '2004-01-28', address: 'Nam Định' },
        roommates: [],
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-08-31'),
        notes: 'Hợp đồng đơn phòng 304',
    },
    {
        roomNumber: '401',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Tạ Đình Quang', cccd: '031204000401', phone: '0981000401', email: 'customer401@housify.vn', dob: '2002-06-14', address: 'Hải Dương' },
        roommates: [
            { name: 'Trần Khánh Vy', cccd: '031204000411', phone: '0982000411', dob: '2003-11-20', address: 'Hải Phòng', status: OCCUPANT_STATUS.STAYED },
        ],
        startDate: new Date('2026-03-01'),
        endDate: new Date('2027-02-28'),
        notes: 'Hợp đồng đôi phòng 401',
    },
    {
        roomNumber: '403',
        contractType: CONTRACT_TYPE.SINGLE,
        rep: { name: 'Mai Phương Thảo', cccd: '031204000403', phone: '0981000403', email: 'customer403@housify.vn', dob: '2004-09-03', address: 'Hưng Yên' },
        roommates: [],
        startDate: new Date('2026-08-15'),
        endDate: new Date('2027-08-14'),
        notes: 'Hợp đồng đơn phòng 403',
    },
    {
        roomNumber: '404',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Nguyễn Khắc Tiệp', cccd: '031204000404', phone: '0981000404', email: 'customer404@housify.vn', dob: '2001-05-17', address: 'Bắc Ninh' },
        roommates: [
            { name: 'Lê Thị Bích', cccd: '031204000444', phone: '0982000444', dob: '2002-08-29', address: 'Bắc Giang', status: OCCUPANT_STATUS.STAYED },
            { name: 'Hoàng Văn Quân', cccd: '031204000445', phone: '0983000445', dob: '2003-03-12', address: 'Vĩnh Phúc', status: OCCUPANT_STATUS.STAYED },
        ],
        startDate: new Date('2026-02-01'),
        endDate: new Date('2027-01-31'),
        notes: 'Hợp đồng nhóm phòng 404',
    },
    {
        roomNumber: '502',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Phan Văn Khang', cccd: '031204000502', phone: '0981000502', email: 'customer502@housify.vn', dob: '2003-07-22', address: 'Quảng Ninh' },
        roommates: [
            { name: 'Nguyễn Thanh Tùng', cccd: '031204000522', phone: '0982000522', dob: '2003-12-30', address: 'Lạng Sơn', status: OCCUPANT_STATUS.STAYED },
        ],
        startDate: new Date('2026-06-15'),
        endDate: new Date('2027-06-14'),
        notes: 'Hợp đồng đôi phòng 502',
    },
];

const DRAFT_CONTRACT_DEFS = [
    { roomNumber: '101', contractType: CONTRACT_TYPE.SINGLE, repCccd: '031204008888', repEmail: 'draft.customer@example.com', notes: 'Hợp đồng nháp phòng 101' },
    { roomNumber: '103', contractType: CONTRACT_TYPE.SINGLE, repCccd: '031204008881', repEmail: 'draft103@example.com', notes: 'Hợp đồng nháp phòng 103' },
    { roomNumber: '202', contractType: CONTRACT_TYPE.SINGLE, repCccd: '031204008882', repEmail: 'draft202@example.com', notes: 'Hợp đồng nháp phòng 202' },
    { roomNumber: '301', contractType: CONTRACT_TYPE.SINGLE, repCccd: '031204008883', repEmail: 'draft301@example.com', notes: 'Hợp đồng nháp phòng 301' },
    { roomNumber: '503', contractType: CONTRACT_TYPE.SINGLE, repCccd: '031204008884', repEmail: 'draft503@example.com', notes: 'Hợp đồng nháp phòng 503' },
];

const ENDED_CONTRACT_DEFS = [
    {
        roomNumber: '305',
        contractType: CONTRACT_TYPE.SINGLE,
        rep: { name: 'Phạm Văn Cường', cccd: '031204007001', phone: '0985007001', email: 'ended305@housify.vn', dob: '2000-01-10', address: 'Hà Nam' },
        roommates: [],
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        refunded: true,
        userStatus: USER_STATUS.INACTIVE,
    },
    {
        roomNumber: '402',
        contractType: CONTRACT_TYPE.SINGLE,
        rep: { name: 'Nguyễn Thị Yến', cccd: '031204007002', phone: '0985007002', email: 'ended402@housify.vn', dob: '2001-04-15', address: 'Ninh Bình' },
        roommates: [],
        startDate: new Date('2025-07-01'),
        endDate: new Date('2026-06-30'),
        refunded: true,
        userStatus: USER_STATUS.INACTIVE,
    },
    {
        roomNumber: '405',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Trần Văn Trường', cccd: '031204007003', phone: '0985007003', email: 'ended405@housify.vn', dob: '2000-09-20', address: 'Thanh Hóa' },
        roommates: [
            { name: 'Nguyễn Văn Đạt', cccd: '031204007033', phone: '0986007033', dob: '2001-08-11', address: 'Nghệ An', status: OCCUPANT_STATUS.LEFT, exitDate: new Date('2026-08-31') },
        ],
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-08-31'),
        refunded: false,
        userStatus: USER_STATUS.INACTIVE,
    },
    {
        roomNumber: '501',
        contractType: CONTRACT_TYPE.GROUP,
        rep: { name: 'Lê Quang Hải', cccd: '031204007004', phone: '0985007004', email: 'ended501@housify.vn', dob: '1999-11-23', address: 'Hà Tĩnh' },
        roommates: [
            { name: 'Phạm Đức Thắng', cccd: '031204007044', phone: '0986007044', dob: '2000-03-05', address: 'Quảng Bình', status: OCCUPANT_STATUS.LEFT, exitDate: new Date('2026-09-30') },
        ],
        startDate: new Date('2025-10-01'),
        endDate: new Date('2026-09-30'),
        refunded: false,
        userStatus: USER_STATUS.LOCKED,
    },
    {
        roomNumber: '101',
        contractType: CONTRACT_TYPE.SINGLE,
        rep: { name: 'Hoàng Thị Nga', cccd: '031204007005', phone: '0985007005', email: 'ended101@housify.vn', dob: '2001-06-18', address: 'Thái Nguyên' },
        roommates: [],
        startDate: new Date('2024-11-01'),
        endDate: new Date('2025-10-31'),
        refunded: true,
        userStatus: USER_STATUS.INACTIVE,
    },
    {
        roomNumber: '201',
        contractType: CONTRACT_TYPE.SINGLE,
        rep: { name: 'Bùi Văn Tuấn', cccd: '031204007006', phone: '0985007006', email: 'ended201@housify.vn', dob: '2000-02-28', address: 'Bắc Kạn' },
        roommates: [],
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-11-30'),
        refunded: true,
        userStatus: USER_STATUS.INACTIVE,
    },
];

const CANCELLED_CONTRACT_DEFS = [
    { roomNumber: '305', repCccd: '031204006001', repEmail: 'cancel305@example.com', notes: 'Khách đổi kế hoạch nên hủy nháp' },
    { roomNumber: '402', repCccd: '031204006002', repEmail: 'cancel402@example.com', notes: 'Trùng lịch thực tập hủy nháp' },
    {
        roomNumber: '405',
        repCccd: '031204006003',
        repEmail: 'cancel405@example.com',
        notes: 'Hủy hợp đồng nháp nhóm',
        roommates: [
            { name: 'Nguyễn Văn Bình', cccd: '031204006033', phone: '0984006033', dob: '2003-05-05', address: 'Cao Bằng', status: OCCUPANT_STATUS.LEFT },
        ],
    },
    { roomNumber: '501', repCccd: '031204006004', repEmail: 'cancel501@example.com', notes: 'Khách chuyển chỗ làm nên hủy' },
];

const seedContractsAndOccupants = async () => {
    const building = await Building.findOne({ name: MANAGER_BUILDING, isDeleted: false });
    if (!building) {
        console.warn(`Cảnh báo: không tìm thấy tòa ${MANAGER_BUILDING}, bỏ qua seed hợp đồng`);
        return;
    }

    const managerUser = await User.findOne({ email: MANAGER_EMAIL, roleId: ROLE.MANAGER });
    if (!managerUser) {
        console.warn(`Cảnh báo: không tìm thấy Manager ${MANAGER_EMAIL}, bỏ qua seed hợp đồng`);
        return;
    }

    const commonHashedPassword = await bcrypt.hash(CUSTOMER_COMMON_PASSWORD, 10);

    // 1. Seed 14 hợp đồng ACTIVE
    for (const def of ACTIVE_CONTRACT_DEFS) {
        const room = await Room.findOne({ buildingId: building._id, roomNumber: def.roomNumber, isDeleted: false });
        if (!room) continue;

        const existed = await Contract.findOne({ roomId: room._id, status: CONTRACT_STATUS.ACTIVE });
        if (existed) {
            if (room.status !== ROOM_STATUS.OCCUPIED) {
                room.status = ROOM_STATUS.OCCUPIED;
                await room.save();
            }
            continue;
        }

        await withTransaction(async (session) => {
            let customerUser = await User.findOne({ email: def.rep.email }).session(session);
            if (!customerUser) {
                [customerUser] = await User.create(
                    [
                        {
                            email: def.rep.email,
                            password: commonHashedPassword,
                            roleId: ROLE.CUSTOMER,
                            status: USER_STATUS.ACTIVE,
                        },
                    ],
                    { session },
                );
            }

            const [contract] = await Contract.create(
                [
                    {
                        roomId: room._id,
                        contractType: def.contractType,
                        representativeCccd: def.rep.cccd,
                        representativeEmail: def.rep.email,
                        startDate: def.startDate,
                        endDate: def.endDate,
                        rentPrice: room.rentPrice,
                        deposit: room.deposit,
                        status: CONTRACT_STATUS.ACTIVE,
                        activatedAt: def.startDate,
                        notes: def.notes,
                        createdBy: managerUser._id,
                        depositReceiverId: managerUser._id,
                    },
                ],
                { session },
            );

            // Cư dân đại diện
            await Occupant.create(
                [
                    {
                        contractId: contract._id,
                        userId: customerUser._id,
                        isRepresentative: true,
                        name: def.rep.name,
                        phone: def.rep.phone,
                        dateOfBirth: new Date(def.rep.dob),
                        address: def.rep.address,
                        cccd: def.rep.cccd,
                        status: OCCUPANT_STATUS.STAYED,
                        joinDate: def.startDate,
                    },
                ],
                { session },
            );

            // Người ở cùng
            for (const rm of def.roommates) {
                await Occupant.create(
                    [
                        {
                            contractId: contract._id,
                            isRepresentative: false,
                            name: rm.name,
                            phone: rm.phone,
                            dateOfBirth: new Date(rm.dob),
                            address: rm.address,
                            cccd: rm.cccd,
                            status: rm.status || OCCUPANT_STATUS.STAYED,
                            joinDate: def.startDate,
                            exitDate: rm.exitDate,
                        },
                    ],
                    { session },
                );
            }

            await Room.findByIdAndUpdate(room._id, { status: ROOM_STATUS.OCCUPIED }, { session });

            await ActivationToken.create(
                [
                    {
                        type: ACTIVATION_TYPE.CUSTOMER_INVITE,
                        contractId: contract._id,
                        token: generateActivationToken().tokenHash,
                        sentTo: def.rep.email,
                        status: TOKEN_STATUS.USED,
                        expiresAt: new Date(def.startDate.getTime() + ACTIVATION_TOKEN_TTL_MS),
                        createdBy: managerUser._id,
                    },
                ],
                { session },
            );
            console.log(`Đã tạo HĐ ACTIVE phòng ${def.roomNumber} (Đại diện: ${def.rep.name} - CCCD: ${def.rep.cccd})`);
        });
    }

    // 2. Seed 5 hợp đồng DRAFT
    for (const def of DRAFT_CONTRACT_DEFS) {
        const room = await Room.findOne({ buildingId: building._id, roomNumber: def.roomNumber, isDeleted: false });
        if (!room) continue;

        const existed = await Contract.findOne({ roomId: room._id, status: CONTRACT_STATUS.DRAFT });
        if (existed) continue;

        await withTransaction(async (session) => {
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);

            const [draftContract] = await Contract.create(
                [
                    {
                        roomId: room._id,
                        contractType: def.contractType,
                        representativeCccd: def.repCccd,
                        representativeEmail: def.repEmail,
                        startDate,
                        endDate,
                        rentPrice: room.rentPrice,
                        deposit: room.deposit,
                        status: CONTRACT_STATUS.DRAFT,
                        notes: def.notes,
                        createdBy: managerUser._id,
                    },
                ],
                { session },
            );

            const { token: rawToken, tokenHash } = generateActivationToken();
            await ActivationToken.create(
                [
                    {
                        type: ACTIVATION_TYPE.CUSTOMER_INVITE,
                        contractId: draftContract._id,
                        token: tokenHash,
                        sentTo: def.repEmail,
                        expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
                        createdBy: managerUser._id,
                    },
                ],
                { session },
            );
            console.log(`Đã tạo HĐ DRAFT phòng ${def.roomNumber} (CCCD: ${def.repCccd}) - Token: ${rawToken}`);
        });
    }

    // 3. Seed 6 hợp đồng ENDED
    for (const def of ENDED_CONTRACT_DEFS) {
        const room = await Room.findOne({ buildingId: building._id, roomNumber: def.roomNumber, isDeleted: false });
        if (!room) continue;

        const existed = await Contract.findOne({ roomId: room._id, representativeCccd: def.rep.cccd, status: CONTRACT_STATUS.ENDED });
        if (existed) continue;

        await withTransaction(async (session) => {
            let customerUser = await User.findOne({ email: def.rep.email }).session(session);
            if (!customerUser) {
                [customerUser] = await User.create(
                    [
                        {
                            email: def.rep.email,
                            password: commonHashedPassword,
                            roleId: ROLE.CUSTOMER,
                            status: def.userStatus || USER_STATUS.INACTIVE,
                        },
                    ],
                    { session },
                );
            }

            const contractData = {
                roomId: room._id,
                contractType: def.contractType,
                representativeCccd: def.rep.cccd,
                representativeEmail: def.rep.email,
                startDate: def.startDate,
                endDate: def.endDate,
                rentPrice: room.rentPrice,
                deposit: room.deposit,
                status: CONTRACT_STATUS.ENDED,
                activatedAt: def.startDate,
                notes: `Hợp đồng đã kết thúc phòng ${def.roomNumber}`,
                createdBy: managerUser._id,
                depositReceiverId: managerUser._id,
            };

            if (def.refunded) {
                contractData.depositRefundedAt = new Date(def.endDate.getTime() + 2 * 24 * 60 * 60 * 1000);
                contractData.depositRefundedBy = managerUser._id;
            }

            const [contract] = await Contract.create([contractData], { session });

            // Đại diện LEFT
            await Occupant.create(
                [
                    {
                        contractId: contract._id,
                        userId: customerUser._id,
                        isRepresentative: true,
                        name: def.rep.name,
                        phone: def.rep.phone,
                        dateOfBirth: new Date(def.rep.dob),
                        address: def.rep.address,
                        cccd: def.rep.cccd,
                        status: OCCUPANT_STATUS.LEFT,
                        joinDate: def.startDate,
                        exitDate: def.endDate,
                    },
                ],
                { session },
            );

            // Roommates LEFT
            for (const rm of def.roommates) {
                await Occupant.create(
                    [
                        {
                            contractId: contract._id,
                            isRepresentative: false,
                            name: rm.name,
                            phone: rm.phone,
                            dateOfBirth: new Date(rm.dob),
                            address: rm.address,
                            cccd: rm.cccd,
                            status: OCCUPANT_STATUS.LEFT,
                            joinDate: def.startDate,
                            exitDate: rm.exitDate || def.endDate,
                        },
                    ],
                    { session },
                );
            }

            console.log(`Đã tạo HĐ ENDED phòng ${def.roomNumber} (Đại diện: ${def.rep.name} - Hoàn cọc: ${def.refunded ? 'Đã hoàn' : 'Chưa'})`);
        });
    }

    // 4. Seed 4 hợp đồng CANCELLED
    for (const def of CANCELLED_CONTRACT_DEFS) {
        const room = await Room.findOne({ buildingId: building._id, roomNumber: def.roomNumber, isDeleted: false });
        if (!room) continue;

        const existed = await Contract.findOne({ roomId: room._id, representativeCccd: def.repCccd, status: CONTRACT_STATUS.CANCELLED });
        if (existed) continue;

        await withTransaction(async (session) => {
            const startDate = new Date('2026-02-01');
            const endDate = new Date('2027-01-31');

            const [cancelledContract] = await Contract.create(
                [
                    {
                        roomId: room._id,
                        contractType: def.roommates?.length ? CONTRACT_TYPE.GROUP : CONTRACT_TYPE.SINGLE,
                        representativeCccd: def.repCccd,
                        representativeEmail: def.repEmail,
                        startDate,
                        endDate,
                        rentPrice: room.rentPrice,
                        deposit: room.deposit,
                        status: CONTRACT_STATUS.CANCELLED,
                        notes: def.notes,
                        createdBy: managerUser._id,
                    },
                ],
                { session },
            );

            if (def.roommates?.length) {
                for (const rm of def.roommates) {
                    await Occupant.create(
                        [
                            {
                                contractId: cancelledContract._id,
                                isRepresentative: false,
                                name: rm.name,
                                phone: rm.phone,
                                dateOfBirth: new Date(rm.dob),
                                address: rm.address,
                                cccd: rm.cccd,
                                status: OCCUPANT_STATUS.LEFT,
                                joinDate: startDate,
                            },
                        ],
                        { session },
                    );
                }
            }

            await ActivationToken.create(
                [
                    {
                        type: ACTIVATION_TYPE.CUSTOMER_INVITE,
                        contractId: cancelledContract._id,
                        token: generateActivationToken().tokenHash,
                        sentTo: def.repEmail,
                        status: TOKEN_STATUS.EXPIRED,
                        expiresAt: new Date(startDate.getTime() + ACTIVATION_TOKEN_TTL_MS),
                        createdBy: managerUser._id,
                    },
                ],
                { session },
            );

            console.log(`Đã tạo HĐ CANCELLED phòng ${def.roomNumber} (CCCD: ${def.repCccd})`);
        });
    }

    console.log('Đã hoàn tất kiểm tra/tạo 29 hợp đồng và cư dân mẫu Iter 2');
};

const NOTIFY_ADMIN_EMAIL = 'admin@housify.vn';
const NOTIFY_CUSTOMER_CCCD = '031204005476';

const CUSTOMER_NOTIFICATIONS = [
    {
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
        title: 'Chào mừng đến Tòa Test',
        message: 'Chào mừng bạn nhận phòng 101. Vui lòng đọc kỹ nội quy tòa nhà trước khi vào ở.',
    },
    {
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
        title: 'Lịch thu gom rác',
        message: 'Rác sinh hoạt được thu gom lúc 19h hằng ngày tại khu vực tầng 1. Vui lòng phân loại rác trước khi bỏ.',
    },
    {
        type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
        title: 'Sự cố đã được tiếp nhận',
        message: 'Báo cáo "Vòi nước bồn rửa bị rò rỉ" của phòng 101 đã được quản lý tiếp nhận.',
    },
    {
        type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
        title: 'Sự cố đang được xử lý',
        message: 'Kỹ thuật viên sẽ đến kiểm tra vòi nước phòng 101 trong hôm nay.',
    },
    {
        type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
        title: 'Sự cố đã được giải quyết',
        message: 'Sự cố "Vòi nước bồn rửa bị rò rỉ" của phòng 101 đã được giải quyết. Nếu còn vấn đề, vui lòng báo lại.',
    },
    {
        type: NOTIFICATION_TYPE.INVOICE_SENT,
        title: 'Có hóa đơn mới',
        message: 'Hóa đơn tiền phòng và dịch vụ của phòng 101 đã được gửi. Vui lòng thanh toán trước hạn.',
    },
    {
        type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
        title: 'Nhắc thanh toán hóa đơn',
        message: 'Hóa đơn của phòng 101 còn 3 ngày nữa là đến hạn thanh toán.',
    },
    {
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
        title: 'Tạm ngưng cấp nước',
        message: 'Tòa Test tạm ngưng cấp nước từ 8h đến 11h sáng Chủ nhật để vệ sinh bể chứa.',
    },
    {
        type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
        title: 'Hóa đơn sắp đến hạn',
        message: 'Hóa đơn của phòng 101 sẽ đến hạn thanh toán vào ngày mai.',
    },
    {
        type: NOTIFICATION_TYPE.CONTRACT_RENEWED,
        title: 'Hợp đồng đã được gia hạn',
        message: 'Hợp đồng thuê phòng 101 của bạn đã được gia hạn. Xem chi tiết trong mục Hợp đồng.',
    },
    {
        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
        title: 'Phun thuốc diệt muỗi',
        message: 'Tòa Test phun thuốc diệt muỗi vào chiều thứ Bảy. Vui lòng đóng cửa sổ và cất đồ ăn.',
    },
    {
        type: NOTIFICATION_TYPE.INVOICE_SENT,
        title: 'Có hóa đơn mới',
        message: 'Hóa đơn phát sinh sửa chữa của phòng 101 đã được gửi. Vui lòng thanh toán trước hạn.',
    },
];

const seedNotificationsFor = async (label, userId, notifications) => {
    if (!userId) {
        console.warn(`Cảnh báo: không tìm thấy ${label}, bỏ qua thông báo mẫu`);
        return false;
    }

    const existed = await Notification.exists({ userId });
    if (existed) {
        console.log(`${label} đã có thông báo, bỏ qua`);
        return false;
    }

    for (const notification of notifications) {
        await notify({ userIds: userId, ...notification });
    }
    console.log(`Đã tạo ${notifications.length} thông báo cho ${label}`);
    return true;
};

const seedNotifications = async () => {
    const admin = await User.findOne({ email: NOTIFY_ADMIN_EMAIL, roleId: ROLE.ADMIN });
    const manager = await User.findOne({ email: MANAGER_EMAIL, roleId: ROLE.MANAGER });
    const representative = await Occupant.findOne({ cccd: NOTIFY_CUSTOMER_CCCD, isRepresentative: true }).sort({ createdAt: -1 });
    const building = await Building.findOne({ name: MANAGER_BUILDING, isDeleted: false });
    if (!building) {
        console.warn(`Cảnh báo: không tìm thấy ${MANAGER_BUILDING}, thông báo của Manager để trống refId`);
    }

    // Customer: 12 cái để test trang 2, sau đó 4 cái cũ nhất là đã đọc
    const customerCreated = await seedNotificationsFor(
        `Customer (CCCD ${NOTIFY_CUSTOMER_CCCD})`,
        representative?.userId,
        CUSTOMER_NOTIFICATIONS,
    );
    if (customerCreated) {
        const oldest = await Notification.find({ userId: representative.userId })
            .sort({ createdAt: 1 })
            .limit(4)
            .select('_id');
        await Notification.updateMany({ _id: { $in: oldest.map((item) => item._id) } }, { isRead: true });
        console.log('Đã đánh dấu 4 thông báo cũ nhất của Customer là đã đọc');
    }

    await seedNotificationsFor(`Manager (${MANAGER_EMAIL})`, manager?._id, [
        {
            type: NOTIFICATION_TYPE.MANAGER_ASSIGNED,
            title: 'Bạn được phân công quản lý tòa',
            message: `Admin đã phân công bạn quản lý ${MANAGER_BUILDING}.`,
            refId: building?._id,
        },
        {
            type: NOTIFICATION_TYPE.ANNOUNCEMENT,
            title: 'Nội quy mới',
            message: `Tòa ${MANAGER_BUILDING} vừa cập nhật nội quy`,
            refId: building?._id,
        },
        {
            type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
            title: 'Có sự cố mới',
            message: 'Phòng 101 vừa báo sự cố "Vòi nước bồn rửa bị rò rỉ".',
        },
    ]);

    await seedNotificationsFor(`Admin (${NOTIFY_ADMIN_EMAIL})`, admin?._id, [
        {
            type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
            title: 'Thanh toán thành công',
            message: `Phòng 101 - ${MANAGER_BUILDING} vừa thanh toán hóa đơn qua chuyển khoản.`,
        },
        {
            type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
            title: 'Có đơn chấm dứt hợp đồng chờ duyệt',
            message: 'Có một đơn chấm dứt hợp đồng đơn phương đang chờ bạn duyệt.',
        },
    ]);
};

CONNECT_DB()
    .then(async () => {
        console.log('Connected to MongoDB');
        await seedRoles();
        await seedAdmin();
        await seedManager();
        await seedManagerTestData();
        await seedRoomTypes();
        await seedRooms();
        await seedContractsAndOccupants();
        await seedNotifications();
        await CLOSE_DB();
        process.exit(0);
    })
    .catch((error) => {
        console.error('Seed lỗi:', error);
        process.exit(1);
    });
