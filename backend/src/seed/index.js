// Tạo dữ liệu khởi tạo: 3 vai trò, tài khoản admin, Manager test, tòa nhà, loại phòng (có capacity), phòng mẫu (bỏ capacity), thông báo mẫu (UC-41). Chạy: npm run seed
// Chạy lại nhiều lần an toàn, thứ gì đã có thì bỏ qua.
// Quy ước: chỉ leader chạy seed lên DB chung, cả nhóm dùng chung dữ liệu này. Thành viên khác không tự chạy.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { CONNECT_DB, CLOSE_DB } from '../config/db.js';
import { env } from '../config/env.js';
import { ROLE, USER_STATUS, ACTIVATION_TYPE, TOKEN_STATUS, AUDIT_ACTION, NOTIFICATION_TYPE, ROOM_STATUS } from '../constants/enums.js';
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

// Seed phòng mẫu: rooms không còn capacity, sức chứa lấy theo loại phòng (chốt 30/10)
// Chỉ tạo khi phòng chưa tồn tại trong tòa, không ghi đè dữ liệu có sẵn
const seedRooms = async () => {
    const building = await Building.findOne({ name: MANAGER_BUILDING, isDeleted: false });
    if (!building) {
        console.log(`Chưa có ${MANAGER_BUILDING} để tạo phòng mẫu`);
        return;
    }

    const singleType = await RoomType.findOne({ name: 'Phòng đơn', isDeleted: false });
    const doubleType = await RoomType.findOne({ name: 'Phòng đôi', isDeleted: false });

    if (!singleType || !doubleType) {
        console.log('Chưa có loại phòng để tạo phòng mẫu');
        return;
    }

    const sampleRooms = [
        {
            buildingId: building._id,
            roomNumber: '101',
            floorNumber: 1,
            roomTypeId: singleType._id,
            area: 20,
            rentPrice: 3500000,
            deposit: 3500000,
            status: ROOM_STATUS.AVAILABLE,
        },
        {
            buildingId: building._id,
            roomNumber: '102',
            floorNumber: 1,
            roomTypeId: doubleType._id,
            area: 28,
            rentPrice: 5000000,
            deposit: 5000000,
            status: ROOM_STATUS.AVAILABLE,
        },
        {
            buildingId: building._id,
            roomNumber: '201',
            floorNumber: 2,
            roomTypeId: doubleType._id,
            area: 30,
            rentPrice: 5500000,
            deposit: 5500000,
            status: ROOM_STATUS.AVAILABLE,
        },
    ];

    for (const r of sampleRooms) {
        const existed = await Room.findOne({
            buildingId: r.buildingId,
            roomNumber: r.roomNumber,
            isDeleted: false,
        });
        if (existed) {
            console.log(`Phòng ${r.roomNumber} tòa ${building.name} đã tồn tại, bỏ qua`);
            continue;
        }
        await Room.create({ ...r, isDeleted: false });
        console.log(`Đã tạo phòng ${r.roomNumber} tòa ${building.name}`);
    }
    console.log('Đã hoàn tất kiểm tra/tạo phòng mẫu');
};

// Thông báo mẫu cho chuông (UC-41): tạo qua notify(), lần lượt từng cái để createdAt khác nhau (cũ → mới)
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
        await seedNotifications();
        await CLOSE_DB();
        process.exit(0);
    })
    .catch((error) => {
        console.error('Seed lỗi:', error);
        process.exit(1);
    });
