// Seed dữ liệu toàn diện cho hệ thống Housify – làm sạch dữ liệu cũ và khởi tạo đầy đủ 18 collection + toàn bộ luồng chính & ngoại lệ
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { CONNECT_DB, CLOSE_DB } from '../config/db.js';
import {
    ROLE,
    USER_STATUS,
    ROOM_STATUS,
    CONTRACT_TYPE,
    CONTRACT_STATUS,
    OCCUPANT_STATUS,
    TERMINATION_TYPE,
    TERMINATION_STATUS,
    INVOICE_ITEM_TYPE,
    INVOICE_STATUS,
    NOTIFICATION_TYPE,
    INCIDENT_TYPE,
    INCIDENT_STATUS,
    AUDIT_ACTION,
    ACTIVATION_TYPE,
    TOKEN_STATUS,
} from '../constants/enums.js';
import { generateActivationToken, ACTIVATION_TOKEN_TTL_MS } from '../helpers/activationToken.js';
import { computeTerminationHash } from '../modules/termination/termination.service.js';

import Role from '../models/Role.js';
import User from '../models/User.js';
import Manager from '../models/Manager.js';
import Building from '../models/Building.js';
import RoomType from '../models/RoomType.js';
import Room from '../models/Room.js';
import Service from '../models/Service.js';
import ServicePrice from '../models/ServicePrice.js';
import Contract from '../models/Contract.js';
import Occupant from '../models/Occupant.js';
import ActivationToken from '../models/ActivationToken.js';
import OtpToken from '../models/OtpToken.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import TerminationRequest from '../models/TerminationRequest.js';
import Incident from '../models/Incident.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

// ===== CẤU HÌNH TÀI KHOẢN & MẬT KHẨU CHUẨN =====
const ADMIN_EMAIL = 'admin@housify.com';
const ADMIN_PASS = 'Admin123';

// 2 Manager email thật (test gửi mail) + các Manager email seed
const MANAGER1_EMAIL = 'khiconst4@gmail.com';
const MANAGER2_EMAIL = 'khiconst20092004@gmail.com';
const MANAGER3_EMAIL = 'manager.thanhxuan@housify.vn';
const MANAGER4_EMAIL = 'manager.dongda@housify.vn';
const MANAGER_PASS = 'Manager123';

const CUSTOMER_PASS = 'Customer123';

// Người đại diện (Customer) của các case chính. Chỉ 4 email thật (index 0, 3, 4, 10), còn lại email seed @housify.vn
// để nhóm giữ email thật khác cho demo tạo hợp đồng mới
const REAL_CUSTOMERS = [
    {
        email: 'annbhe182167@fpt.edu.vn',
        cccd: '031204005476',
        name: 'Nguyễn Bình An',
        phone: '0981000001',
        dob: '2004-09-20',
        address: 'Hải An, Hải Phòng',
        note: '[EMAIL THẬT 1] Khách lâu năm: ACTIVE GROUP P101 Tòa 1 + 2 HĐ cũ ENDED + đủ bộ hóa đơn (PAID, trễ hạn, PENDING) + sự cố đủ trạng thái',
    },
    {
        email: 'customer.thieutien@housify.vn',
        cccd: '031204000002',
        name: 'Trần Minh Quân',
        phone: '0981000002',
        dob: '2004-03-15',
        address: 'TP. Hạ Long, Quảng Ninh',
        note: 'ACTIVE GROUP P102 Tòa 1 – Hóa đơn PENDING chuyển thiếu (PAYMENT_UNDERPAID) + 1 HĐ cũ ENDED',
    },
    {
        email: 'customer.thuatien@housify.vn',
        cccd: '031204000003',
        name: 'Lê Hoàng Nam',
        phone: '0981000003',
        dob: '2003-11-08',
        address: 'Đông Anh, Hà Nội',
        note: 'ACTIVE SINGLE P103 Tòa 1 – Hóa đơn chuyển thừa (PAYMENT_OVERPAID) + Hóa đơn đã hủy',
    },
    {
        email: 'nguyenan182167@gmail.com',
        cccd: '031204000004',
        name: 'Nguyễn Hoàng An',
        phone: '0981000004',
        dob: '2004-05-12',
        address: 'TP. Hà Giang, Hà Giang',
        note: '[EMAIL THẬT 2] Đang chuyển phòng: ACTIVE P201 Tòa 1 còn 15 ngày (hóa đơn QUÁ HẠN + đến hạn hôm nay) + đã ký UPCOMING P401 Tòa 1 (gia hạn P201 bị chặn)',
    },
    {
        email: 'cocainit123788@gmail.com',
        cccd: '031204000005',
        name: 'Hoàng Đức Toàn',
        phone: '0981000005',
        dob: '2004-02-28',
        address: 'TP. Vinh, Nghệ An',
        note: '[EMAIL THẬT 4] Đang trả phòng: ACTIVE GROUP P202 Tòa 1 có Đơn chấm dứt 2 bên (MUTUAL PENDING) chờ khách Xác nhận điện tử + hóa đơn còn 1 ngày đến hạn',
    },
    {
        email: 'customer.donphuong@housify.vn',
        cccd: '031204000006',
        name: 'Đỗ Việt Hưng',
        phone: '0981000006',
        dob: '2004-09-13',
        address: 'TP. Nam Định, Nam Định',
        note: 'ACTIVE P203 Tòa 1 còn 25 ngày + Đơn đơn phương PENDING chờ Admin duyệt + UPCOMING P501 Tòa 1 (Admin duyệt -> UPCOMING tự hủy, được hoàn cọc)',
    },
    {
        email: 'customer.dachot@housify.vn',
        cccd: '031204000007',
        name: 'Nguyễn Tuấn Hưng',
        phone: '0981000007',
        dob: '2004-07-19',
        address: 'Ninh Kiều, Cần Thơ',
        note: 'ACTIVE GROUP P101 Tòa 2 – Đơn MUTUAL đã CONFIRMED (chờ 3 ngày tới ngày hiệu lực) + 1 HĐ cũ ENDED ở Tòa 1',
    },
    {
        email: 'customer.vuaketthuc@housify.vn',
        cccd: '031204000008',
        name: 'Đinh Quốc Bảo',
        phone: '0981000008',
        dob: '2004-02-18',
        address: 'TP. Thanh Hóa, Thanh Hóa',
        note: 'HĐ P102 Tòa 2 vừa ENDED < 24h, User còn ACTIVE (hồ sơ chỉ xem, chờ Manager 2 hoàn cọc sạch)',
    },
    {
        email: 'customer.draftmoi@housify.vn',
        cccd: '031204000009',
        name: 'Nguyễn Thế Mạnh',
        phone: '0981000009',
        dob: '2004-10-10',
        address: 'Vị Xuyên, Hà Giang',
        note: 'HĐ DRAFT P301 Tòa 1 chờ kích hoạt lần đầu (chưa có tài khoản – dùng link in bên dưới)',
    },
    {
        email: 'customer.thuelai@housify.vn',
        cccd: '031204000010',
        name: 'Trương Thế Mạnh',
        phone: '0981000010',
        dob: '2004-01-01',
        address: 'Bắc Quang, Hà Giang',
        note: 'Khách cũ INACTIVE (HĐ cũ ENDED còn nợ hóa đơn) + HĐ DRAFT thuê lại P202 Tòa 2 (kích hoạt -> mở lại tài khoản)',
    },
    {
        email: 'nguyenkhanhhung2005nk@gmail.com',
        cccd: '031205000021',
        name: 'Nguyễn Khánh Hưng',
        phone: '0981000021',
        dob: '2005-03-11',
        address: 'Hoàng Mai, Hà Nội',
        note: '[EMAIL THẬT 3] Khách mới chờ vào ở: chỉ có HĐ UPCOMING P303 Tòa 1 (sau HĐ có đơn chấm dứt hiệu lực hôm nay – chạy job terminationEffective là thành ACTIVE)',
    },
];

// Helper thời gian
const now = new Date();
const daysFromNow = (days, hour = 9, minute = 0) => {
    const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    d.setHours(hour, minute, 0, 0);
    return d;
};
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000);
// Ngày kết thúc theo chu kỳ tháng: bắt đầu + số tháng - 1 ngày (giống calculateEndDate của module contract)
const endAfterMonths = (startDate, months) => {
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + months);
    end.setDate(end.getDate() - 1);
    return end;
};

const formatMonth = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const currentMonth = formatMonth(now);
const prevMonth1 = formatMonth(daysFromNow(-30));
const prevMonth2 = formatMonth(daysFromNow(-60));
const prevMonth3 = formatMonth(daysFromNow(-90));

// Helper tạo URL VietQR thật
const buildVietQrUrl = (amount, invoiceCode) => {
    const bankId = env.BANK_ID || 'MB';
    const accountNo = env.BANK_ACCOUNT_NO || '0365123456';
    const accountName = env.BANK_ACCOUNT_NAME || 'HOUSIFY ADMIN';
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(invoiceCode)}&accountName=${encodeURIComponent(accountName)}`;
};

// Helper tạo ảnh CCCD mẫu sắc nét (hiển thị trực tiếp qua getSignedUrl)
const cccdFrontUrl = (code, label) =>
    `https://placehold.co/800x500/0f172a/f8fafc.png?text=${encodeURIComponent(`CCCD MAT TRUOC\nSo: ${code}\n${label}`)}`;
const cccdBackUrl = (code) =>
    `https://placehold.co/800x500/1e293b/e2e8f0.png?text=${encodeURIComponent(`CCCD MAT SAU\nDac diem nhan dang & Chip dien tu\nID: ${code}`)}`;

// Bộ ảnh công khai cho tòa nhà, phòng, sự cố
const BUILDING_IMAGES = {
    b1: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    ],
    b2: [
        'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80',
    ],
    b3: [
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    ],
    b4: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    ],
};

const ROOM_IMAGE_SETS = [
    [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80',
    ],
    [
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1000&q=80',
    ],
    [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1000&q=80',
    ],
    [
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
    ],
];

const INCIDENT_IMAGES = [
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80',
];

const BUILDING_RULES_1 = `NỘI QUY TÒA NHÀ HOUSIFY HÒA LẠC PLAZA

1. GIỜ GIẤC & AN NINH RA VÀO:
- Cổng vân tay hoạt động 24/7 cho cư dân đã đăng ký sinh trắc học.
- Từ 23:00 đến 05:30 sáng hôm sau: Cư dân đi lại nhẹ nhàng, tuyệt đối không tụ tập ăn nhậu, mở nhạc to hoặc gây tiếng ồn tại hành lang và trong phòng.
- Không cho người lạ mượn thẻ thang máy hoặc mở cổng hộ người không rõ danh tính.

2. KHÁCH ĐẾN CHƠI & LƯU TRÚ QUA ĐÊM:
- Khách đến thăm phải rời tòa nhà trước 22:30.
- Trường hợp người thân ở lại qua đêm: Người đại diện phòng bắt buộc báo trước cho Quản lý tòa nhà qua hệ thống hoặc trực tiếp kèm ảnh chụp CCCD để khai báo tạm trú theo quy định Công an xã Thạch Hòa.

3. PHÒNG CHÁY CHỮA CHÁY (PCCC) & AN TOÀN ĐIỆN:
- Nghiêm cấm đun nấu bằng bếp gas, bếp than tổ ong hoặc tích trữ chất dễ cháy nổ trong phòng và ban công (chỉ sử dụng bếp từ/hồng ngoại).
- Sạc xe điện tại khu vực tầng hầm chỉ được cắm từ 06:00 đến 22:30 tại các ổ cắm chuyên dụng có aptomat tự ngắt; tuyệt đối không sạc xe điện qua đêm hoặc mang pin lên phòng sạc.

4. VỆ SINH MÔI TRƯỜNG & PHÂN LOẠI RÁC:
- Rác sinh hoạt phải buộc kín miệng túi và bỏ vào thùng rác tập trung tại đầu cầu thang bộ từ 18:00 – 21:00 hàng ngày.
- Không để giày dép, đồ dùng cá nhân, túi rác ngoài hành lang chung.

5. THÚ CƯNG & TÀI SẢN CHUNG:
- Không nuôi chó, mèo hoặc thú cưng gây mùi và tiếng ồn trong tòa nhà nếu chưa có sự đồng ý bằng văn bản của Quản lý.
- Không tự ý khoan đục tường, thay đổi kết cấu phòng hoặc tháo dỡ thiết bị nội thất bàn giao.

6. THANH TOÁN HÓA ĐƠN & HỢP ĐỒNG:
- Hóa đơn tiền phòng và dịch vụ được chốt vào đầu mỗi tháng; hạn thanh toán trong vòng 07 ngày kể từ ngày phát hành hóa đơn qua mã QR VietQR (SePay tự động gạch nợ).
- Vi phạm nghiêm trọng nội quy từ 02 lần trở lên hoặc nợ tiền phòng quá hạn kéo dài sẽ bị lập biên bản chấm dứt hợp đồng đơn phương và không hoàn trả tiền đặt cọc.`;

const BUILDING_RULES_2 = `NỘI QUY TÒA NHÀ HOUSIFY CẦU GIẤY CENTER

1. AN NINH & KIỂM SOÁT RA VÀO:
- Hệ thống cửa khóa khuôn mặt FaceID và camera giám sát hoạt động 24/24 tại toàn bộ sảnh, thang máy và hành lang các tầng.
- Cư dân tự bảo quản tài sản cá nhân trong phòng, khóa cửa cẩn thận khi ra ngoài.

2. TRẬT TỰ & VĂN HÓA CHUNG CƯ MINI:
- Giữ yên tĩnh tuyệt đối sau 22:30 đêm. Không tổ chức tiệc tùng ồn ào ảnh hưởng các phòng xung quanh.
- Cấm hút thuốc lá tại thang máy, tầng hầm để xe và hành lang kín.

3. QUY ĐỊNH ĐỂ XE TẦNG 1:
- Mỗi phòng được đăng ký tối đa 02 xe máy theo đúng biển số đã khai báo với Quản lý.
- Xếp xe gọn gàng theo vạch kẻ, khóa cổ xe và tắt máy khi dắt xe trong hầm.

4. ĐIỆN NƯỚC, INTERNET & BÁO CÁO SỰ CỐ:
- Khi phát hiện rò rỉ nước, chập điện, hỏng điều hòa/bình nóng lạnh, người đại diện phòng gửi ngay Báo cáo sự cố trên hệ thống Housify kèm hình ảnh thực tế để Quản lý tiếp nhận xử lý trong vòng 24h.

5. NGHĨA VỤ TÀI CHÍNH & BÀN GIAO PHÒNG:
- Thanh toán đúng số tiền và đúng mã hóa đơn (HD...) hiển thị trên mã QR VietQR để hệ thống tự động xác nhận.
- Khi kết thúc hợp đồng hoặc chuyển đi, phòng phải được dọn vệ sinh sạch sẽ và bàn giao đầy đủ trang thiết bị nguyên trạng cho Quản lý tòa nhà.`;

const BUILDING_RULES_3 = `NỘI QUY TÒA NHÀ HOUSIFY THANH XUÂN RESIDENCE

1. Giờ giấc tự do 24/7 bằng vân tay; giữ trật tự chung sau 23:00.
2. Đăng ký tạm trú đầy đủ cho toàn bộ thành viên đang ở trong vòng 03 ngày kể từ khi nhận phòng.
3. Tuân thủ nghiêm ngặt quy định PCCC: trang bị mặt nạ phòng khói và bình chữa cháy mini tại mỗi tầng, không che chắn lối thoát hiểm.
4. Bỏ rác đúng giờ (19:00 – 21:30), giữ vệ sinh khu vực sân phơi và máy giặt chung tầng thượng.
5. Thanh toán hóa đơn đúng hạn trong vòng 07 ngày kể từ ngày nhận thông báo.`;

async function seed() {
    await CONNECT_DB();
    console.log('\n============================================================');
    console.log('🧹 ĐANG DỌN SẠCH TOÀN BỘ DỮ LIỆU CŨ TRONG 18 COLLECTION...');
    console.log('============================================================');

    await Promise.all([
        Payment.deleteMany({}),
        Invoice.deleteMany({}),
        TerminationRequest.deleteMany({}),
        Incident.deleteMany({}),
        Notification.deleteMany({}),
        AuditLog.deleteMany({}),
        ActivationToken.deleteMany({}),
        OtpToken.deleteMany({}),
        Occupant.deleteMany({}),
        Contract.deleteMany({}),
        Room.deleteMany({}),
        ServicePrice.deleteMany({}),
        Service.deleteMany({}),
        RoomType.deleteMany({}),
        Building.deleteMany({}),
        Manager.deleteMany({}),
        User.deleteMany({}),
        Role.deleteMany({}),
    ]);
    console.log('✔ Đã xóa sạch toàn bộ dữ liệu cũ.\n');

    // Hash mật khẩu dùng chung
    const [adminHash, managerHash, customerHash] = await Promise.all([
        bcrypt.hash(ADMIN_PASS, 10),
        bcrypt.hash(MANAGER_PASS, 10),
        bcrypt.hash(CUSTOMER_PASS, 10),
    ]);

    // =========================================================================
    // 1. ROLES (3 vai trò chuẩn)
    // =========================================================================
    await Role.insertMany([
        { _id: ROLE.ADMIN, name: 'ADMIN' },
        { _id: ROLE.MANAGER, name: 'MANAGER' },
        { _id: ROLE.CUSTOMER, name: 'CUSTOMER' },
    ]);
    console.log('✔ [1/16] Đã tạo 3 vai trò (ADMIN, MANAGER, CUSTOMER).');

    // =========================================================================
    // 2. ADMIN & MANAGERS (users + managers + activation_tokens)
    // =========================================================================
    const adminUser = await User.create({
        email: ADMIN_EMAIL,
        password: adminHash,
        roleId: ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
    });

    const createManagerAccount = async ({
        email,
        name,
        phone,
        status = USER_STATUS.ACTIVE,
        dob = '1995-06-15',
        address = 'Cầu Giấy, Hà Nội',
        withCccdImages = true,
    }) => {
        const user = await User.create({
            email,
            password: status === USER_STATUS.PENDING ? undefined : managerHash,
            roleId: ROLE.MANAGER,
            status,
        });
        const profile = await Manager.create({
            userId: user._id,
            name,
            phone,
            dateOfBirth: status === USER_STATUS.PENDING ? undefined : new Date(dob),
            address: status === USER_STATUS.PENDING ? undefined : address,
            cccdFrontImage: withCccdImages && status !== USER_STATUS.PENDING ? cccdFrontUrl(phone, name) : undefined,
            cccdBackImage: withCccdImages && status !== USER_STATUS.PENDING ? cccdBackUrl(phone) : undefined,
        });
        return { user, profile };
    };

    // 3 Manager đang phụ trách 3 tòa (2 email thật + 1 email demo)
    const manager1 = await createManagerAccount({
        email: MANAGER1_EMAIL,
        name: 'Nguyễn Văn Quản',
        phone: '0971000001',
        status: USER_STATUS.ACTIVE,
        dob: '1994-04-12',
        address: 'Thạch Hòa, Thạch Thất, Hà Nội',
    });

    const manager2 = await createManagerAccount({
        email: MANAGER2_EMAIL,
        name: 'Trần Thị Lý',
        phone: '0971000002',
        status: USER_STATUS.ACTIVE,
        dob: '1996-08-22',
        address: 'Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    });

    const manager3 = await createManagerAccount({
        email: MANAGER3_EMAIL,
        name: 'Lê Minh Quang',
        phone: '0971000003',
        status: USER_STATUS.ACTIVE,
        dob: '1993-12-05',
        address: 'Thượng Đình, Thanh Xuân, Hà Nội',
    });

    const manager4 = await createManagerAccount({
        email: MANAGER4_EMAIL,
        name: 'Phan Thị Quỳnh',
        phone: '0971000013',
        status: USER_STATUS.ACTIVE,
        dob: '1992-03-27',
        address: 'Láng Thượng, Đống Đa, Hà Nội',
    });

    // 3 Manager ACTIVE chưa phân công tòa (để Admin test gán/đổi Manager cho tòa nhà)
    const managerFree1 = await createManagerAccount({
        email: 'manager.free1@housify.vn',
        name: 'Phạm Quốc Bảo',
        phone: '0971000004',
        status: USER_STATUS.ACTIVE,
        dob: '1995-02-14',
        address: 'Đống Đa, Hà Nội',
    });
    const managerFree2 = await createManagerAccount({
        email: 'manager.free2@housify.vn',
        name: 'Hoàng Thanh Tùng',
        phone: '0971000005',
        status: USER_STATUS.ACTIVE,
        dob: '1997-07-09',
        address: 'Ba Đình, Hà Nội',
    });
    const managerFree3 = await createManagerAccount({
        email: 'manager.free3@housify.vn',
        name: 'Đặng Thu Hà',
        phone: '0971000006',
        status: USER_STATUS.ACTIVE,
        dob: '1998-11-19',
        address: 'Tây Hồ, Hà Nội',
    });

    // 3 Manager PENDING chờ kích hoạt (2 còn hạn 24h, 1 đã hết hạn để test Gửi lại link / Xóa Manager)
    const managerPending1 = await createManagerAccount({
        email: 'manager.pending1@housify.vn',
        name: 'Võ Thành Đạt',
        phone: '0971000007',
        status: USER_STATUS.PENDING,
        withCccdImages: false,
    });
    const mgrToken1 = generateActivationToken();
    await ActivationToken.create({
        type: ACTIVATION_TYPE.MANAGER_ACTIVATION,
        userId: managerPending1.user._id,
        token: mgrToken1.tokenHash,
        sentTo: managerPending1.user.email,
        expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
        createdBy: adminUser._id,
    });

    const managerPending2 = await createManagerAccount({
        email: 'manager.pending2@housify.vn',
        name: 'Bùi Ngọc Ánh',
        phone: '0971000008',
        status: USER_STATUS.PENDING,
        withCccdImages: false,
    });
    const mgrToken2 = generateActivationToken();
    await ActivationToken.create({
        type: ACTIVATION_TYPE.MANAGER_ACTIVATION,
        userId: managerPending2.user._id,
        token: mgrToken2.tokenHash,
        sentTo: managerPending2.user.email,
        expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
        createdBy: adminUser._id,
    });

    const managerPending3 = await createManagerAccount({
        email: 'manager.pending3@housify.vn',
        name: 'Ngô Gia Huy',
        phone: '0971000009',
        status: USER_STATUS.PENDING,
        withCccdImages: false,
    });
    const mgrToken3 = generateActivationToken();
    await ActivationToken.create({
        type: ACTIVATION_TYPE.MANAGER_ACTIVATION,
        userId: managerPending3.user._id,
        token: mgrToken3.tokenHash,
        sentTo: managerPending3.user.email,
        expiresAt: daysFromNow(-2), // Đã hết hạn 2 ngày trước
        createdBy: adminUser._id,
    });

    // 3 Manager INACTIVE (Đã ngưng hoạt động để Admin test Mở khóa Manager)
    const managerLocked1 = await createManagerAccount({
        email: 'manager.locked1@housify.vn',
        name: 'Đinh Văn Khôi',
        phone: '0971000010',
        status: USER_STATUS.INACTIVE,
    });
    const managerLocked2 = await createManagerAccount({
        email: 'manager.locked2@housify.vn',
        name: 'Lý Thị Mai',
        phone: '0971000011',
        status: USER_STATUS.INACTIVE,
    });
    const managerLocked3 = await createManagerAccount({
        email: 'manager.locked3@housify.vn',
        name: 'Trịnh Quốc Khánh',
        phone: '0971000012',
        status: USER_STATUS.INACTIVE,
    });

    console.log(`✔ [2/16] Đã tạo Admin (${ADMIN_EMAIL}) và 13 tài khoản Manager đủ trạng thái.`);

    // =========================================================================
    // 3. BUILDINGS (4 tòa nhà với nội quy, mô tả, hình ảnh đầy đủ)
    // =========================================================================
    const building1 = await Building.create({
        name: 'Housify Hòa Lạc Plaza',
        address: 'Thôn 3, Xã Thạch Hòa, Huyện Thạch Thất, Hà Nội (Cách ĐH FPT 800m)',
        description:
            'Tòa căn hộ dịch vụ sinh viên & chuyên gia cao cấp 5 tầng tại Khu Công nghệ cao Hòa Lạc. Trang bị thang máy tốc độ cao, khóa vân tay 24/7, hệ thống PCCC tự động đạt chuẩn, hầm để xe rộng rãi có trạm sạc xe điện thông minh và sân phơi tầng thượng.',
        images: BUILDING_IMAGES.b1,
        floorCount: 5,
        rules: BUILDING_RULES_1,
        managerId: manager1.user._id,
    });

    const building2 = await Building.create({
        name: 'Housify Cầu Giấy Center',
        address: 'Số 68 Ngõ 165 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
        description:
            'Tòa nhà CCMN trung tâm Quận Cầu Giấy, gần ĐH Quốc Gia, ĐH Sư Phạm và Học viện Báo chí. Nội thất full đồ điều hòa Inverter, bình nóng lạnh, tủ lạnh, giường tủ gỗ công nghiệp chống ẩm, ban công thoáng mát mọi phòng.',
        images: BUILDING_IMAGES.b2,
        floorCount: 5,
        rules: BUILDING_RULES_2,
        managerId: manager2.user._id,
    });

    const building3 = await Building.create({
        name: 'Housify Thanh Xuân Residence',
        address: 'Số 124 Nguyễn Trãi, Phường Thượng Đình, Quận Thanh Xuân, Hà Nội',
        description:
            'Tòa nhà 4 tầng yên tĩnh ngay cạnh ga tàu điện Cát Linh – Hà Đông, thuận tiện di chuyển. Phòng ốc mới xây, hành lang rộng, có khu giặt sấy chung và bảo vệ trực đêm.',
        images: BUILDING_IMAGES.b3,
        floorCount: 4,
        rules: BUILDING_RULES_3,
        managerId: manager3.user._id,
    });

    const building4 = await Building.create({
        name: 'Housify Đống Đa Boutique',
        address: 'Số 45 Chùa Láng, Phường Láng Thượng, Quận Đống Đa, Hà Nội',
        description:
            'Tòa nhà 4 tầng gần ĐH Ngoại Thương và Học viện Ngoại giao, nhiều phòng đang cho thuê với hóa đơn nhiều kỳ – dùng để xem báo cáo, dashboard và case đặt thuê nối tiếp chờ 2 hợp đồng kết thúc.',
        images: BUILDING_IMAGES.b4,
        floorCount: 4,
        rules: BUILDING_RULES_2,
        managerId: manager4.user._id,
    });

    const building5 = await Building.create({
        name: 'Housify Hà Đông Garden',
        address: 'Số 18 Tô Hiệu, Phường Nguyễn Trãi, Quận Hà Đông, Hà Nội',
        description:
            'Tòa nhà mới hoàn thiện, chưa có hợp đồng và chưa phân công Manager – dùng để Admin test Gán Manager, sửa tòa hoặc Xóa mềm tòa nhà (UC-11, UC-14).',
        images: BUILDING_IMAGES.b3,
        floorCount: 3,
        rules: BUILDING_RULES_3,
        managerId: null,
    });

    console.log('✔ [3/16] Đã tạo 5 Tòa nhà (kèm mô tả, nhiều ảnh và Nội quy chi tiết).');

    // =========================================================================
    // 4. ROOM TYPES (5 loại phòng)
    // =========================================================================
    const [rtSingle, rtStudio, rtTwin, rtDuplex, rtLoftUnused] = await RoomType.insertMany([
        { name: 'Phòng Đơn Tiêu Chuẩn (1 người)', capacity: 1 },
        { name: 'Phòng Studio Ban Công (2 người)', capacity: 2 },
        { name: 'Phòng Đôi Cao Cấp Twin (3 người)', capacity: 3 },
        { name: 'Căn Hộ Mini Duplex (4 người)', capacity: 4 },
        { name: 'Phòng Gác Xép Sinh Viên (Chưa gắn phòng)', capacity: 2 }, // Để Admin test sửa/xóa loại phòng
    ]);
    console.log('✔ [4/16] Đã tạo 5 Loại phòng (RoomType).');

    // =========================================================================
    // 5. SERVICES & SERVICE PRICES (7 dịch vụ + lịch sử đơn giá theo từng tòa)
    // =========================================================================
    const [svcElec, svcWater, svcWifi, svcTrash, svcParking, svcSecurity, svcUnused] = await Service.insertMany([
        { name: 'Điện sinh hoạt', unit: 'kWh', isFixed: false },
        { name: 'Nước sạch sinh hoạt', unit: 'm³', isFixed: false },
        { name: 'Internet Cáp Quang Wifi 6', unit: 'phòng/tháng', isFixed: true },
        { name: 'Vệ sinh & Thu gom rác', unit: 'phòng/tháng', isFixed: true },
        { name: 'Gửi xe máy / Xe điện', unit: 'phòng/tháng', isFixed: true },
        { name: 'Dịch vụ Quản lý & An ninh 24/7', unit: 'phòng/tháng', isFixed: true },
        { name: 'Thẻ từ thang máy phụ (Chưa đặt giá)', unit: 'thẻ/tháng', isFixed: true }, // Để Admin test xóa dịch vụ
    ]);

    const priceDateOld = new Date('2025-01-01T00:00:00.000Z');
    const priceDateCurrent = new Date('2025-09-01T00:00:00.000Z');
    const priceDateFuture = daysFromNow(30); // Giá tương lai để thấy lịch sử giá

    await ServicePrice.insertMany([
        // Tòa 1 (Hòa Lạc Plaza): có cả lịch sử giá cũ, giá hiện tại và 1 mức giá tương lai
        { serviceId: svcElec._id, buildingId: building1._id, unitPrice: 3500, effectiveFrom: priceDateOld, createdBy: adminUser._id },
        { serviceId: svcElec._id, buildingId: building1._id, unitPrice: 3800, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcWater._id, buildingId: building1._id, unitPrice: 22000, effectiveFrom: priceDateOld, createdBy: adminUser._id },
        { serviceId: svcWater._id, buildingId: building1._id, unitPrice: 25000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcWifi._id, buildingId: building1._id, unitPrice: 100000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcTrash._id, buildingId: building1._id, unitPrice: 40000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcParking._id, buildingId: building1._id, unitPrice: 100000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcSecurity._id, buildingId: building1._id, unitPrice: 50000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },

        // Tòa 2 (Cầu Giấy Center)
        { serviceId: svcElec._id, buildingId: building2._id, unitPrice: 3800, effectiveFrom: priceDateOld, createdBy: adminUser._id },
        { serviceId: svcElec._id, buildingId: building2._id, unitPrice: 4000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcWater._id, buildingId: building2._id, unitPrice: 28000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcWifi._id, buildingId: building2._id, unitPrice: 100000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcTrash._id, buildingId: building2._id, unitPrice: 50000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcParking._id, buildingId: building2._id, unitPrice: 120000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcSecurity._id, buildingId: building2._id, unitPrice: 60000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },

        // Tòa 3 (Thanh Xuân Residence)
        { serviceId: svcElec._id, buildingId: building3._id, unitPrice: 3900, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcWater._id, buildingId: building3._id, unitPrice: 26000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcWifi._id, buildingId: building3._id, unitPrice: 100000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcTrash._id, buildingId: building3._id, unitPrice: 40000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcParking._id, buildingId: building3._id, unitPrice: 100000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },

        // Tòa 4 (Đống Đa Boutique): đủ giá + 1 giá điện tương lai để thấy lịch sử
        { serviceId: svcElec._id, buildingId: building4._id, unitPrice: 4000, effectiveFrom: priceDateOld, createdBy: adminUser._id },
        { serviceId: svcElec._id, buildingId: building4._id, unitPrice: 4200, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcElec._id, buildingId: building4._id, unitPrice: 4400, effectiveFrom: priceDateFuture, createdBy: adminUser._id },
        { serviceId: svcWater._id, buildingId: building4._id, unitPrice: 30000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcWifi._id, buildingId: building4._id, unitPrice: 120000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcTrash._id, buildingId: building4._id, unitPrice: 50000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcParking._id, buildingId: building4._id, unitPrice: 150000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcSecurity._id, buildingId: building4._id, unitPrice: 70000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },

        // Tòa 5 (Hà Đông Garden): mới có giá điện, nước – thiếu giá dịch vụ cố định để test cảnh báo thiếu đơn giá
        { serviceId: svcElec._id, buildingId: building5._id, unitPrice: 3700, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
        { serviceId: svcWater._id, buildingId: building5._id, unitPrice: 24000, effectiveFrom: priceDateCurrent, createdBy: adminUser._id },
    ]);
    console.log('✔ [5/16] Đã tạo 7 Dịch vụ & Bảng lịch sử đơn giá (ServicePrice) cho 5 tòa.');

    // =========================================================================
    // 6. ROOMS (34 phòng trải đều 4 tòa: OCCUPIED, AVAILABLE, MAINTENANCE)
    // =========================================================================
    const createRoomDoc = (buildingId, floorNumber, roomNumber, roomTypeId, area, rentPrice, deposit, status, imgIdx = 0) => ({
        buildingId,
        floorNumber,
        roomNumber,
        roomTypeId,
        area,
        rentPrice,
        deposit,
        status,
        images: ROOM_IMAGE_SETS[imgIdx % ROOM_IMAGE_SETS.length],
    });

    // --- TÒA 1: Hòa Lạc Plaza (15 phòng từ tầng 1 -> 5) ---
    const b1RoomsList = await Room.insertMany([
        createRoomDoc(building1._id, 1, 'P101', rtDuplex._id, 38, 4200000, 4200000, ROOM_STATUS.OCCUPIED, 0), // Customer 1 (annbhe182167)
        createRoomDoc(building1._id, 1, 'P102', rtTwin._id, 32, 3600000, 3600000, ROOM_STATUS.OCCUPIED, 1),   // Customer 2 (customer.thieutien)
        createRoomDoc(building1._id, 1, 'P103', rtSingle._id, 24, 3000000, 3000000, ROOM_STATUS.OCCUPIED, 2), // Customer 3 (customer.thuatien)
        createRoomDoc(building1._id, 2, 'P201', rtTwin._id, 32, 3700000, 3700000, ROOM_STATUS.OCCUPIED, 3),   // Customer 4 (nguyenan182167)
        createRoomDoc(building1._id, 2, 'P202', rtStudio._id, 28, 3400000, 3400000, ROOM_STATUS.OCCUPIED, 0), // Customer 5 (cocainit123788)
        createRoomDoc(building1._id, 2, 'P203', rtSingle._id, 25, 3100000, 3100000, ROOM_STATUS.OCCUPIED, 1), // Customer 6 (customer.donphuong)
        createRoomDoc(building1._id, 3, 'P301', rtStudio._id, 28, 3500000, 3500000, ROOM_STATUS.AVAILABLE, 2), // Customer 9 (customer.draftmoi) đang DRAFT nên phòng vẫn AVAILABLE!
        createRoomDoc(building1._id, 3, 'P302', rtStudio._id, 28, 3500000, 3500000, ROOM_STATUS.OCCUPIED, 3), // Demo 13 (autoConfirm >= 7 ngày)
        createRoomDoc(building1._id, 3, 'P303', rtSingle._id, 24, 3100000, 3100000, ROOM_STATUS.OCCUPIED, 0), // Demo 14 (effectiveDate <= hôm nay)
        createRoomDoc(building1._id, 4, 'P401', rtDuplex._id, 40, 4500000, 4500000, ROOM_STATUS.AVAILABLE, 1), // Trống nhưng đã giữ chỗ cho UPCOMING của Customer 4 (chuyển từ P201)
        createRoomDoc(building1._id, 4, 'P402', rtTwin._id, 34, 3800000, 3800000, ROOM_STATUS.AVAILABLE, 2),   // Trống (từng có HĐ ENDED/CANCELLED)
        createRoomDoc(building1._id, 4, 'P403', rtStudio._id, 28, 3400000, 3400000, ROOM_STATUS.MAINTENANCE, 3), // Đang bảo trì
        createRoomDoc(building1._id, 5, 'P501', rtDuplex._id, 42, 4600000, 4600000, ROOM_STATUS.AVAILABLE, 0), // Trống, giữ chỗ cho UPCOMING của Customer 6 (đang có đơn đơn phương)
        createRoomDoc(building1._id, 5, 'P502', rtStudio._id, 28, 3400000, 3400000, ROOM_STATUS.AVAILABLE, 1), // Trống
        createRoomDoc(building1._id, 5, 'P503', rtSingle._id, 22, 2900000, 2900000, ROOM_STATUS.MAINTENANCE, 2), // Đang bảo trì
    ]);
    const b1Rooms = Object.fromEntries(b1RoomsList.map((r) => [r.roomNumber, r]));

    // --- TÒA 2: Cầu Giấy Center (10 phòng) ---
    const b2RoomsList = await Room.insertMany([
        createRoomDoc(building2._id, 1, 'P101', rtTwin._id, 32, 4500000, 4500000, ROOM_STATUS.OCCUPIED, 0),   // Customer 7 (customer.dachot)
        createRoomDoc(building2._id, 1, 'P102', rtStudio._id, 28, 4000000, 4000000, ROOM_STATUS.AVAILABLE, 1), // Customer 8 (customer.vuaketthuc) vừa ENDED < 24h nên phòng đã về AVAILABLE
        createRoomDoc(building2._id, 2, 'P201', rtStudio._id, 28, 4100000, 4100000, ROOM_STATUS.AVAILABLE, 2), // Customer 10 (customer.thuelai) HĐ cũ đã ENDED
        createRoomDoc(building2._id, 2, 'P202', rtTwin._id, 34, 4600000, 4600000, ROOM_STATUS.AVAILABLE, 3),   // Customer 10 đang có HĐ mới DRAFT (Thuê lại)
        createRoomDoc(building2._id, 2, 'P203', rtSingle._id, 24, 3700000, 3700000, ROOM_STATUS.OCCUPIED, 0), // Demo 15 (endDate = hôm qua, test job contractEnd)
        createRoomDoc(building2._id, 3, 'P301', rtDuplex._id, 42, 5200000, 5200000, ROOM_STATUS.AVAILABLE, 1), // Trống
        createRoomDoc(building2._id, 3, 'P302', rtStudio._id, 28, 4100000, 4100000, ROOM_STATUS.AVAILABLE, 2), // Trống
        createRoomDoc(building2._id, 4, 'P401', rtTwin._id, 35, 4700000, 4700000, ROOM_STATUS.MAINTENANCE, 3), // Đang bảo trì
        createRoomDoc(building2._id, 4, 'P402', rtSingle._id, 24, 3800000, 3800000, ROOM_STATUS.OCCUPIED, 0), // ACTIVE còn 20 ngày + UPCOMING đang có đơn hủy chờ xác nhận
        createRoomDoc(building2._id, 5, 'P501', rtDuplex._id, 45, 5500000, 5500000, ROOM_STATUS.AVAILABLE, 1), // Trống
    ]);
    const b2Rooms = Object.fromEntries(b2RoomsList.map((r) => [r.roomNumber, r]));

    // --- TÒA 3: Thanh Xuân Residence (6 phòng) ---
    const b3RoomsList = await Room.insertMany([
        createRoomDoc(building3._id, 1, 'P101', rtStudio._id, 28, 3800000, 3800000, ROOM_STATUS.OCCUPIED, 0), // Demo 17
        createRoomDoc(building3._id, 1, 'P102', rtTwin._id, 32, 4200000, 4200000, ROOM_STATUS.OCCUPIED, 1),   // Demo 18
        createRoomDoc(building3._id, 2, 'P201', rtSingle._id, 24, 3300000, 3300000, ROOM_STATUS.AVAILABLE, 2),
        createRoomDoc(building3._id, 2, 'P202', rtStudio._id, 28, 3800000, 3800000, ROOM_STATUS.AVAILABLE, 3),
        createRoomDoc(building3._id, 3, 'P301', rtDuplex._id, 40, 4800000, 4800000, ROOM_STATUS.AVAILABLE, 0),
        createRoomDoc(building3._id, 4, 'P401', rtSingle._id, 24, 3200000, 3200000, ROOM_STATUS.MAINTENANCE, 1),
    ]);
    const b3Rooms = Object.fromEntries(b3RoomsList.map((r) => [r.roomNumber, r]));

    // --- TÒA 4: Đống Đa Boutique (10 phòng, đa số đang cho thuê để có dữ liệu báo cáo) ---
    const b4RoomsList = await Room.insertMany([
        createRoomDoc(building4._id, 1, 'P101', rtStudio._id, 26, 3900000, 3900000, ROOM_STATUS.OCCUPIED, 0), // ACTIVE còn 10 ngày + UPCOMING chờ 2 HĐ kết thúc
        createRoomDoc(building4._id, 1, 'P102', rtSingle._id, 22, 3300000, 3300000, ROOM_STATUS.OCCUPIED, 1),
        createRoomDoc(building4._id, 1, 'P103', rtStudio._id, 27, 3950000, 3950000, ROOM_STATUS.OCCUPIED, 2),
        createRoomDoc(building4._id, 2, 'P201', rtTwin._id, 32, 4400000, 4400000, ROOM_STATUS.OCCUPIED, 3), // Khách W còn 12 ngày (đã ký UPCOMING P101)
        createRoomDoc(building4._id, 2, 'P202', rtTwin._id, 33, 4450000, 4450000, ROOM_STATUS.OCCUPIED, 0),
        createRoomDoc(building4._id, 2, 'P203', rtDuplex._id, 40, 5200000, 5200000, ROOM_STATUS.OCCUPIED, 1),
        createRoomDoc(building4._id, 3, 'P301', rtSingle._id, 22, 3400000, 3400000, ROOM_STATUS.MAINTENANCE, 2),
        createRoomDoc(building4._id, 3, 'P302', rtStudio._id, 26, 3900000, 3900000, ROOM_STATUS.OCCUPIED, 3),
        createRoomDoc(building4._id, 4, 'P401', rtDuplex._id, 42, 5400000, 5400000, ROOM_STATUS.OCCUPIED, 0),
        createRoomDoc(building4._id, 4, 'P402', rtStudio._id, 26, 3900000, 3900000, ROOM_STATUS.AVAILABLE, 1),
    ]);
    const b4Rooms = Object.fromEntries(b4RoomsList.map((r) => [r.roomNumber, r]));

    // --- TÒA 5: Hà Đông Garden (4 phòng, chưa có hợp đồng, chưa có Manager) ---
    await Room.insertMany([
        createRoomDoc(building5._id, 1, 'P101', rtStudio._id, 26, 3600000, 3600000, ROOM_STATUS.AVAILABLE, 2),
        createRoomDoc(building5._id, 1, 'P102', rtSingle._id, 20, 2900000, 2900000, ROOM_STATUS.AVAILABLE, 3),
        createRoomDoc(building5._id, 2, 'P201', rtTwin._id, 31, 4000000, 4000000, ROOM_STATUS.AVAILABLE, 0),
        createRoomDoc(building5._id, 3, 'P301', rtDuplex._id, 40, 4900000, 4900000, ROOM_STATUS.MAINTENANCE, 1),
    ]);

    console.log('✔ [6/16] Đã tạo 45 Phòng ở 5 tòa nhà (OCCUPIED, AVAILABLE, MAINTENANCE).');

    // =========================================================================
    // 7. CUSTOMER ACCOUNTS & CONTRACTS & OCCUPANTS
    // =========================================================================
    // Tạo User cho các Customer đã kích hoạt (Customer 1..8 và Customer 10; riêng Customer 9 đang là HĐ DRAFT lần đầu nên chưa có User để khi bấm kích hoạt sẽ tạo mới!)
    const customerUsers = {};
    for (let i = 0; i < REAL_CUSTOMERS.length; i++) {
        const c = REAL_CUSTOMERS[i];
        if (i === 8) continue; // Customer 9 (customer.draftmoi@housify.vn) để dành cho case kích hoạt HĐ DRAFT mới tinh!
        const status = i === 9 ? USER_STATUS.INACTIVE : USER_STATUS.ACTIVE; // Customer 10 đang INACTIVE chờ kích hoạt HĐ thuê lại
        customerUsers[c.cccd] = await User.create({
            email: c.email,
            password: customerHash,
            roleId: ROLE.CUSTOMER,
            status,
        });
    }

    // Thêm các tài khoản Customer demo phục vụ các case LOCKED, Auto-confirm job, Effective-today job, End-today job, Tòa 3
    const demoCustomers = {
        locked1: {
            email: 'customer.locked1@housify.vn',
            cccd: '031204000011',
            name: 'Phan Văn Phạm',
            phone: '0981000011',
            dob: '2003-04-11',
            address: 'Thanh Trì, Hà Nội',
            status: USER_STATUS.LOCKED,
        },
        locked2: {
            email: 'customer.locked2@housify.vn',
            cccd: '031204000012',
            name: 'Trần Quốc Phong',
            phone: '0981000012',
            dob: '2002-08-15',
            address: 'Hoàng Mai, Hà Nội',
            status: USER_STATUS.LOCKED,
        },
        autoConfirm: {
            email: 'customer.autoconfirm@housify.vn',
            cccd: '031204000013',
            name: 'Lương Thế Vinh',
            phone: '0981000013',
            dob: '2004-06-20',
            address: 'Sóc Sơn, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
        effectiveToday: {
            email: 'customer.effectivetoday@housify.vn',
            cccd: '031204000014',
            name: 'Mạc Đăng Dung',
            phone: '0981000014',
            dob: '2004-12-01',
            address: 'Chương Mỹ, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
        endToday: {
            email: 'customer.endtoday@housify.vn',
            cccd: '031204000015',
            name: 'Đoàn Dự',
            phone: '0981000015',
            dob: '2003-09-09',
            address: 'Quốc Oai, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
        tx1: {
            email: 'customer.thanhxuan1@housify.vn',
            cccd: '031204000017',
            name: 'Nguyễn Khánh Linh',
            phone: '0981000017',
            dob: '2004-05-05',
            address: 'Thanh Xuân, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
        tx2: {
            email: 'customer.thanhxuan2@housify.vn',
            cccd: '031204000018',
            name: 'Bùi Tiến Dũng',
            phone: '0981000018',
            dob: '2004-11-11',
            address: 'Hà Đông, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
        refundDebtExceed: {
            email: 'customer.noquacoc@housify.vn',
            cccd: '031204000019',
            name: 'Ngô Văn Nợ Quá Cọc',
            phone: '0981000019',
            dob: '2003-03-19',
            address: 'Thạch Thất, Hà Nội',
            status: USER_STATUS.INACTIVE,
        },
        refundOffsetPartial: {
            email: 'customer.cantrucoc@housify.vn',
            cccd: '031204000020',
            name: 'Đào Minh Cấn Trừ Cọc',
            phone: '0981000020',
            dob: '2004-04-20',
            address: 'Sơn Tây, Hà Nội',
            status: USER_STATUS.INACTIVE,
        },
        // ===== Các case đặt thuê nối tiếp (UPCOMING) =====
        expirySuccessor: {
            email: 'customer.cholich@housify.vn',
            cccd: '031204000022',
            name: 'Vương Thị Chờ Lịch',
            phone: '0981000022',
            dob: '2004-08-08',
            address: 'Gia Lâm, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
        cgP402Tenant: {
            email: 'customer.p402cg@housify.vn',
            cccd: '031204000023',
            name: 'Lý Văn Sắp Trả',
            phone: '0981000023',
            dob: '2003-06-06',
            address: 'Long Biên, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
        changeMind: {
            email: 'customer.doiy@housify.vn',
            cccd: '031204000024',
            name: 'Kiều Minh Đổi Ý',
            phone: '0981000024',
            dob: '2004-02-02',
            address: 'Mê Linh, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
        cancelledUpcoming: {
            email: 'customer.dahuy@housify.vn',
            cccd: '031204000025',
            name: 'Tạ Quang Đã Hủy',
            phone: '0981000025',
            dob: '2003-12-12',
            address: 'Ba Vì, Hà Nội',
            status: USER_STATUS.INACTIVE,
        },
        ddTenantA: {
            email: 'customer.dongda.a@housify.vn',
            cccd: '031204000026',
            name: 'Lâm Thị Sắp Đi',
            phone: '0981000026',
            dob: '2004-01-26',
            address: 'Đống Đa, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
        ddMoverW: {
            email: 'customer.chuyenphong@housify.vn',
            cccd: '031204000027',
            name: 'Mai Văn Chuyển Phòng',
            phone: '0981000027',
            dob: '2003-07-27',
            address: 'Cầu Giấy, Hà Nội',
            status: USER_STATUS.ACTIVE,
        },
    };

    // Khách đặt thuê nối tiếp bản nháp (chưa có tài khoản): kích hoạt xong sẽ thành UPCOMING
    const draftSuccessorCustomer = {
        email: 'customer.noitiep.draft@housify.vn',
        cccd: '031204000028',
        name: 'Phùng Thị Nối Tiếp',
    };

    for (const key of Object.keys(demoCustomers)) {
        const dc = demoCustomers[key];
        customerUsers[dc.cccd] = await User.create({
            email: dc.email,
            password: customerHash,
            roleId: ROLE.CUSTOMER,
            status: dc.status,
        });
    }

    // Helper tạo Occupant đại diện
    const createRepOccupant = async ({
        contractId,
        customerInfo,
        status = OCCUPANT_STATUS.STAYED,
        joinDate,
        exitDate,
    }) => {
        const user = customerUsers[customerInfo.cccd];
        return Occupant.create({
            contractId,
            userId: user ? user._id : undefined,
            isRepresentative: true,
            name: customerInfo.name,
            phone: customerInfo.phone,
            dateOfBirth: new Date(customerInfo.dob),
            address: customerInfo.address,
            cccd: customerInfo.cccd,
            cccdFrontImage: cccdFrontUrl(customerInfo.cccd, customerInfo.name),
            cccdBackImage: cccdBackUrl(customerInfo.cccd),
            relationship: 'Bản thân (Người đại diện)',
            status,
            joinDate,
            exitDate,
        });
    };

    // Helper tạo người ở cùng (Co-occupant)
    const createRoommate = async ({
        contractId,
        name,
        phone,
        dob = '2004-07-15',
        address = 'Hà Nội',
        cccd,
        relationship = 'Bạn cùng phòng',
        status = OCCUPANT_STATUS.STAYED,
        joinDate,
        exitDate,
    }) =>
        Occupant.create({
            contractId,
            isRepresentative: false,
            name,
            phone,
            dateOfBirth: new Date(dob),
            address,
            cccd,
            cccdFrontImage: cccdFrontUrl(cccd, name),
            cccdBackImage: cccdBackUrl(cccd),
            relationship,
            status,
            joinDate,
            exitDate,
        });

    // Helper tạo hợp đồng Sắp hiệu lực (khách đã kích hoạt, đã cọc, đang chờ hợp đồng trước kết thúc).
    // Cư dân lưu sẵn mang STAYED nhưng chỉ tính là đang ở khi hợp đồng chuyển ACTIVE
    const createUpcomingContract = async ({
        room,
        customerInfo,
        startDate,
        months = 12,
        manager,
        notes,
        contractType = CONTRACT_TYPE.SINGLE,
        activatedDaysAgo = 2,
    }) => {
        const contract = await Contract.create({
            roomId: room._id,
            contractType,
            representativeCccd: customerInfo.cccd,
            representativeEmail: customerInfo.email,
            startDate,
            endDate: endAfterMonths(startDate, months),
            rentPrice: room.rentPrice,
            deposit: room.deposit,
            status: CONTRACT_STATUS.UPCOMING,
            activatedAt: daysFromNow(-activatedDaysAgo, 20, 15),
            notes,
            createdBy: manager.user._id,
            depositReceiverId: manager.user._id,
        });
        await createRepOccupant({
            contractId: contract._id,
            customerInfo,
            status: OCCUPANT_STATUS.STAYED,
            joinDate: startDate,
        });
        return contract;
    };

    // -------------------------------------------------------------------------
    // CASE KHÁCH 1: annbhe182167@fpt.edu.vn (CCCD: 031204005476)
    // - 2 Hợp đồng cũ ENDED (2024–2025 và 2025–2026) để test Lịch sử hợp đồng cũ + bộ lọc ngày
    // - 1 Hợp đồng hiện tại ACTIVE (GROUP) tại P101 – Tòa 1
    // -------------------------------------------------------------------------
    const c1 = REAL_CUSTOMERS[0];

    // Hợp đồng cũ 1 của c1 (ENDED năm 2024–2025 tại P401 Tòa 1, đã hoàn cọc)
    const c1OldContract1 = await Contract.create({
        roomId: b1Rooms.P401._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: c1.cccd,
        representativeEmail: c1.email,
        startDate: new Date('2024-09-01T00:00:00.000Z'),
        endDate: new Date('2025-03-01T00:00:00.000Z'),
        rentPrice: 3800000,
        deposit: 3800000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: new Date('2024-09-01T08:30:00.000Z'),
        notes: 'Hợp đồng kỳ đầu năm nhất tại Hòa Lạc Plaza – đã thanh lý đúng hạn và hoàn trả 100% tiền cọc.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
        depositRefundedAt: new Date('2025-03-02T10:00:00.000Z'),
        depositRefundedBy: manager1.user._id,
    });
    await createRepOccupant({
        contractId: c1OldContract1._id,
        customerInfo: c1,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: new Date('2024-09-01T00:00:00.000Z'),
        exitDate: new Date('2025-03-01T00:00:00.000Z'),
    });

    // Hợp đồng cũ 2 của c1 (ENDED năm 2025–2026 tại P301 Tòa 2 Cầu Giấy, kết thúc thỏa thuận 2 bên)
    const c1OldContract2 = await Contract.create({
        roomId: b2Rooms.P301._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: c1.cccd,
        representativeEmail: c1.email,
        startDate: new Date('2025-03-05T00:00:00.000Z'),
        endDate: new Date('2025-12-05T00:00:00.000Z'),
        rentPrice: 4800000,
        deposit: 4800000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: new Date('2025-03-05T09:00:00.000Z'),
        notes: 'Hợp đồng kỳ thực tập tại Cầu Giấy – kết thúc thỏa thuận để chuyển về Hòa Lạc học kỳ chuyên ngành.',
        createdBy: manager2.user._id,
        depositReceiverId: manager2.user._id,
    });
    await createRepOccupant({
        contractId: c1OldContract2._id,
        customerInfo: c1,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: new Date('2025-03-05T00:00:00.000Z'),
        exitDate: new Date('2025-11-01T00:00:00.000Z'),
    });
    await createRoommate({
        contractId: c1OldContract2._id,
        name: 'Nguyễn Văn Bạn Cũ',
        phone: '0982100001',
        cccd: '031204900001',
        relationship: 'Bạn cùng lớp',
        status: OCCUPANT_STATUS.LEFT,
        joinDate: new Date('2025-03-05T00:00:00.000Z'),
        exitDate: new Date('2025-11-01T00:00:00.000Z'),
    });

    // Hợp đồng hiện tại ACTIVE của c1 tại P101 – Tòa 1 (GROUP: 1 đại diện + 2 người ở cùng STAYED + 1 người ở cùng đã LEFT)
    const c1ActiveContract = await Contract.create({
        roomId: b1Rooms.P101._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: c1.cccd,
        representativeEmail: c1.email,
        startDate: daysFromNow(-120),
        endDate: daysFromNow(245),
        rentPrice: 4200000,
        deposit: 4200000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-120, 10, 15),
        notes: 'Ưu đãi sinh viên FPT: miễn phí lắp đặt router Wifi 6 riêng, đăng ký 02 vé xe máy tháng.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: c1ActiveContract._id,
        customerInfo: c1,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-120),
    });
    await createRoommate({
        contractId: c1ActiveContract._id,
        name: 'Đặng Hoàng Phúc',
        phone: '0982100002',
        cccd: '031204900002',
        relationship: 'Bạn cùng nhóm đồ án',
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-120),
    });
    await createRoommate({
        contractId: c1ActiveContract._id,
        name: 'Lê Minh Khang',
        phone: '0982100003',
        cccd: '031204900003',
        relationship: 'Em họ',
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-60),
    });
    await createRoommate({
        contractId: c1ActiveContract._id,
        name: 'Trần Quốc Tuấn',
        phone: '0982100004',
        cccd: '031204900004',
        relationship: 'Bạn cùng lớp',
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-120),
        exitDate: daysFromNow(-65),
    });

    // -------------------------------------------------------------------------
    // CASE KHÁCH 2: customer.thieutien@housify.vn (CCCD: 031204000002)
    // - 1 HĐ cũ ENDED (đã hoàn cọc)
    // - 1 HĐ hiện tại ACTIVE tại P102 – Tòa 1 (Case hóa đơn chuyển thiếu PAYMENT_UNDERPAID)
    // -------------------------------------------------------------------------
    const c2 = REAL_CUSTOMERS[1];
    const c2OldContract = await Contract.create({
        roomId: b1Rooms.P402._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: c2.cccd,
        representativeEmail: c2.email,
        startDate: daysFromNow(-300),
        endDate: daysFromNow(-120),
        rentPrice: 3500000,
        deposit: 3500000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: daysFromNow(-300),
        notes: 'Hợp đồng cũ đã kết thúc đúng hạn và hoàn trả tiền cọc.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
        depositRefundedAt: daysFromNow(-118),
        depositRefundedBy: manager1.user._id,
    });
    await createRepOccupant({
        contractId: c2OldContract._id,
        customerInfo: c2,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-300),
        exitDate: daysFromNow(-120),
    });

    const c2ActiveContract = await Contract.create({
        roomId: b1Rooms.P102._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: c2.cccd,
        representativeEmail: c2.email,
        startDate: daysFromNow(-95),
        endDate: daysFromNow(270),
        rentPrice: 3600000,
        deposit: 3600000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-95),
        notes: 'Hợp đồng nhóm 2 người tại P102 Tòa 1.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: c2ActiveContract._id,
        customerInfo: c2,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-95),
    });
    await createRoommate({
        contractId: c2ActiveContract._id,
        name: 'Phạm Gia Bảo',
        phone: '0982100005',
        cccd: '031204900005',
        relationship: 'Bạn học',
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-95),
    });

    // -------------------------------------------------------------------------
    // CASE KHÁCH 3: customer.thuatien@housify.vn (CCCD: 031204000003)
    // - HĐ ACTIVE (SINGLE) tại P103 – Tòa 1 (Case hóa đơn chuyển thừa PAYMENT_OVERPAID)
    // -------------------------------------------------------------------------
    const c3 = REAL_CUSTOMERS[2];
    const c3ActiveContract = await Contract.create({
        roomId: b1Rooms.P103._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: c3.cccd,
        representativeEmail: c3.email,
        startDate: daysFromNow(-85),
        endDate: daysFromNow(185),
        rentPrice: 3000000,
        deposit: 3000000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-85),
        notes: 'Hợp đồng cá nhân P103 Tòa 1.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: c3ActiveContract._id,
        customerInfo: c3,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-85),
    });

    // -------------------------------------------------------------------------
    // CASE KHÁCH 4: nguyenan182167@gmail.com (CCCD: 031204000004)
    // - HĐ ACTIVE (GROUP) tại P201 – Tòa 1: Sắp hết hạn trong 15 ngày (test Gia hạn UC-27) + Hóa đơn QUÁ HẠN & Đến hạn hôm nay
    // -------------------------------------------------------------------------
    const c4 = REAL_CUSTOMERS[3];
    const c4ActiveContract = await Contract.create({
        roomId: b1Rooms.P201._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: c4.cccd,
        representativeEmail: c4.email,
        startDate: daysFromNow(-165),
        endDate: daysFromNow(15), // Sắp hết hạn trong 15 ngày – rất tiện để Manager 1 bấm Gia hạn!
        rentPrice: 3700000,
        deposit: 3700000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-165),
        notes: 'Hợp đồng còn 15 ngày. Khách đã ký trước P401 (UPCOMING) nên Gia hạn P201 bị chặn; phòng P201 nhận đặt thuê nối tiếp cho khách mới.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: c4ActiveContract._id,
        customerInfo: c4,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-165),
    });
    await createRoommate({
        contractId: c4ActiveContract._id,
        name: 'Hoàng Minh Đức',
        phone: '0982100006',
        cccd: '031204900006',
        relationship: 'Anh ruột',
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-165),
    });

    // Khách đang chuyển phòng: đã ký P401 (đang trống, được giữ chỗ) bắt đầu ngay sau ngày trả P201
    const c4UpcomingContract = await createUpcomingContract({
        room: b1Rooms.P401,
        customerInfo: c4,
        startDate: daysFromNow(16),
        manager: manager1,
        notes: 'Khách chuyển từ P201 sang P401 – tự chuyển Đang hiệu lực khi HĐ P201 kết thúc. P401 đang Trống nhưng đã giữ chỗ (không tạo HĐ khác, không chuyển Bảo trì).',
    });

    // -------------------------------------------------------------------------
    // CASE KHÁCH 5: cocainit123788@gmail.com (CCCD: 031204000005)
    // - HĐ ACTIVE (GROUP) tại P202 – Tòa 1: Đang có Đơn chấm dứt 2 bên (MUTUAL - PENDING) chờ khách bấm "Xác nhận điện tử"
    // -------------------------------------------------------------------------
    const c5 = REAL_CUSTOMERS[4];
    const c5ActiveContract = await Contract.create({
        roomId: b1Rooms.P202._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: c5.cccd,
        representativeEmail: c5.email,
        startDate: daysFromNow(-110),
        endDate: daysFromNow(160),
        rentPrice: 3400000,
        deposit: 3400000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-110),
        notes: 'Đang có đơn chấm dứt thỏa thuận chờ khách Xác nhận điện tử (đã chặn nút Gia hạn).',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: c5ActiveContract._id,
        customerInfo: c5,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-110),
    });
    await createRoommate({
        contractId: c5ActiveContract._id,
        name: 'Vũ Đình Trọng',
        phone: '0982100007',
        cccd: '031204900007',
        relationship: 'Bạn cùng quê',
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-110),
    });

    // -------------------------------------------------------------------------
    // CASE KHÁCH 6: customer.donphuong@housify.vn (CCCD: 031204000006)
    // - HĐ ACTIVE (SINGLE) tại P203 – Tòa 1: Đang có Đơn chấm dứt đơn phương (UNILATERAL - PENDING) chờ Admin duyệt
    // -------------------------------------------------------------------------
    const c6 = REAL_CUSTOMERS[5];
    const c6ActiveContract = await Contract.create({
        roomId: b1Rooms.P203._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: c6.cccd,
        representativeEmail: c6.email,
        startDate: daysFromNow(-340),
        endDate: daysFromNow(25),
        rentPrice: 3100000,
        deposit: 3100000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-340),
        notes: 'Phòng có biên bản nhắc nhở vi phạm nội quy & đang chờ Admin duyệt đơn chấm dứt đơn phương. Khách đã ký trước P501 (UPCOMING).',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: c6ActiveContract._id,
        customerInfo: c6,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-340),
    });

    // Admin duyệt đơn đơn phương ở P203 -> hợp đồng P501 này tự hủy, khách được hoàn cọc tiền mặt
    const c6UpcomingContract = await createUpcomingContract({
        room: b1Rooms.P501,
        customerInfo: c6,
        startDate: daysFromNow(26),
        manager: manager1,
        notes: 'Khách đang có đơn chấm dứt đơn phương PENDING ở P203. Admin duyệt đơn đó thì hợp đồng này tự hủy và được hoàn cọc.',
        activatedDaysAgo: 3,
    });

    // -------------------------------------------------------------------------
    // CASE KHÁCH 7: customer.dachot@housify.vn (CCCD: 031204000007)
    // - 1 HĐ cũ ENDED ở Tòa 1
    // - 1 HĐ ACTIVE tại P101 – Tòa 2 (đã có đơn MUTUAL CONFIRMED kèm signatureHash, chờ 3 ngày nữa tới ngày hiệu lực)
    // -------------------------------------------------------------------------
    const c7 = REAL_CUSTOMERS[6];
    const c7OldContract = await Contract.create({
        roomId: b1Rooms.P501._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: c7.cccd,
        representativeEmail: c7.email,
        startDate: daysFromNow(-320),
        endDate: daysFromNow(-140),
        rentPrice: 4400000,
        deposit: 4400000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: daysFromNow(-320),
        notes: 'Hợp đồng cũ tại Tòa Hòa Lạc trước khi chuyển sang Tòa Cầu Giấy.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
        depositRefundedAt: daysFromNow(-138),
        depositRefundedBy: manager1.user._id,
    });
    await createRepOccupant({
        contractId: c7OldContract._id,
        customerInfo: c7,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-320),
        exitDate: daysFromNow(-140),
    });

    const c7ActiveContract = await Contract.create({
        roomId: b2Rooms.P101._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: c7.cccd,
        representativeEmail: c7.email,
        startDate: daysFromNow(-130),
        endDate: daysFromNow(140),
        rentPrice: 4500000,
        deposit: 4500000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-130),
        notes: 'Hợp đồng tại Tòa 2 Cầu Giấy – đã Xác nhận điện tử đơn chấm dứt thỏa thuận, chờ ngày bàn giao phòng.',
        createdBy: manager2.user._id,
        depositReceiverId: manager2.user._id,
    });
    await createRepOccupant({
        contractId: c7ActiveContract._id,
        customerInfo: c7,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-130),
    });
    await createRoommate({
        contractId: c7ActiveContract._id,
        name: 'Ngô Minh Nhật',
        phone: '0982100008',
        cccd: '031204900008',
        relationship: 'Bạn cùng phòng',
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-130),
    });

    // -------------------------------------------------------------------------
    // CASE KHÁCH 8: customer.vuaketthuc@housify.vn (CCCD: 031204000008)
    // - Case ngoại lệ 0h–23h59: Hợp đồng vừa ENDED < 24h (hết hạn tự nhiên hôm qua), User.status vẫn ACTIVE!
    //   + Đăng nhập vào xem được hợp đồng cũ, nhưng Hồ sơ cá nhân ở chế độ Read-only (canEdit = false)
    //   + Đồng thời hợp đồng ENDED này CHƯA HOÀN CỌC (canRefund = true, không nợ hóa đơn) để Manager 2 bấm Hoàn cọc sạch!
    // -------------------------------------------------------------------------
    const c8 = REAL_CUSTOMERS[7];
    const c8EndedRecentContract = await Contract.create({
        roomId: b2Rooms.P102._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: c8.cccd,
        representativeEmail: c8.email,
        startDate: daysFromNow(-185),
        endDate: daysFromNow(-1), // Hết hạn hôm qua (< 24h)
        rentPrice: 4000000,
        deposit: 4000000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: daysFromNow(-185),
        notes: 'Hợp đồng vừa kết thúc tự nhiên < 24h (khoảng 0h–23h59): User vẫn ACTIVE nhưng chỉ được xem lại lịch sử, khóa sửa hồ sơ; chờ Manager 2 bấm Ghi nhận hoàn cọc!',
        createdBy: manager2.user._id,
        depositReceiverId: manager2.user._id,
    });
    // Chỉnh updatedAt cách đây 6 tiếng (< 24h) để chưa bị job accountAfterEnd chuyển sang INACTIVE ngay
    await Contract.updateOne(
        { _id: c8EndedRecentContract._id },
        { $set: { updatedAt: hoursFromNow(-6) } },
        { timestamps: false },
    );
    await createRepOccupant({
        contractId: c8EndedRecentContract._id,
        customerInfo: c8,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-185),
        exitDate: daysFromNow(-1),
    });

    // -------------------------------------------------------------------------
    // CASE KHÁCH 9: customer.draftmoi@housify.vn (CCCD: 031204000009)
    // - Hợp đồng DRAFT tại P301 – Tòa 1 (chờ khách mở link kích hoạt để tự đặt mật khẩu & điền hồ sơ UC-06)
    // -------------------------------------------------------------------------
    const c9 = REAL_CUSTOMERS[8];
    const c9DraftContract = await Contract.create({
        roomId: b1Rooms.P301._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: c9.cccd,
        representativeEmail: c9.email,
        startDate: daysFromNow(2),
        endDate: daysFromNow(182),
        rentPrice: 3500000,
        deposit: 3500000,
        status: CONTRACT_STATUS.DRAFT,
        notes: 'Hợp đồng nháp đang chờ Nguyễn Thế Mạnh mở link kích hoạt (hoặc Manager 1 gửi lại mail thật / sửa nháp / hủy nháp).',
        createdBy: manager1.user._id,
    });
    await createRoommate({
        contractId: c9DraftContract._id,
        name: 'Lê Văn Thành',
        phone: '0982100009',
        cccd: '031204900009',
        relationship: 'Bạn cùng lớp',
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(2),
    });
    const c9InviteToken = generateActivationToken();
    await ActivationToken.create({
        type: ACTIVATION_TYPE.CUSTOMER_INVITE,
        contractId: c9DraftContract._id,
        token: c9InviteToken.tokenHash,
        sentTo: c9.email,
        expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
        createdBy: manager1.user._id,
    });

    // -------------------------------------------------------------------------
    // CASE KHÁCH 10: customer.thuelai@housify.vn (CCCD: 031204000010)
    // - 1 HĐ cũ ENDED tại P201 – Tòa 2 (đã kết thúc > 24h nên User.status = INACTIVE, chưa hoàn cọc VÀ CÒN NỢ 1 HÓA ĐƠN PENDING để test cảnh báo cấn trừ nợ khi hoàn cọc!)
    // - 1 HĐ mới DRAFT tại P202 – Tòa 2 (đang chờ khách kích hoạt Thuê lại -> tự động mở lại User INACTIVE -> ACTIVE!)
    // -------------------------------------------------------------------------
    const c10 = REAL_CUSTOMERS[9];
    const c10OldEndedContract = await Contract.create({
        roomId: b2Rooms.P201._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: c10.cccd,
        representativeEmail: c10.email,
        startDate: daysFromNow(-210),
        endDate: daysFromNow(-10),
        rentPrice: 4100000,
        deposit: 4100000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: daysFromNow(-210),
        notes: 'Hợp đồng cũ hết hạn tự nhiên nhưng còn 01 hóa đơn tháng cuối chưa thanh toán – dùng để test Cảnh báo cấn trừ nợ khi hoàn cọc (UC-45)!',
        createdBy: manager2.user._id,
        depositReceiverId: manager2.user._id,
    });
    await createRepOccupant({
        contractId: c10OldEndedContract._id,
        customerInfo: c10,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-210),
        exitDate: daysFromNow(-10),
    });

    const c10ReRentDraftContract = await Contract.create({
        roomId: b2Rooms.P202._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: c10.cccd,
        representativeEmail: c10.email,
        startDate: daysFromNow(3),
        endDate: daysFromNow(183),
        rentPrice: 4600000,
        deposit: 4600000,
        status: CONTRACT_STATUS.DRAFT,
        notes: 'Hợp đồng nháp cho khách cũ (INACTIVE) thuê lại phòng P202 Tòa 2 – kích hoạt link này sẽ mở lại tài khoản ACTIVE và giữ nguyên lịch sử HĐ cũ!',
        createdBy: manager2.user._id,
    });
    const c10InviteToken = generateActivationToken();
    await ActivationToken.create({
        type: ACTIVATION_TYPE.CUSTOMER_INVITE,
        contractId: c10ReRentDraftContract._id,
        token: c10InviteToken.tokenHash,
        sentTo: c10.email,
        expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
        createdBy: manager2.user._id,
    });

    // -------------------------------------------------------------------------
    // CÁC CASE DEMO BỔ TRỢ (Khách bị khóa LOCKED, Job tự động, HĐ nháp đã hủy, Tòa 3)
    // -------------------------------------------------------------------------
    // Demo 11 & 12: 2 khách hàng đã bị chấm dứt đơn phương và khóa tài khoản (LOCKED)
    const lockedContract1 = await Contract.create({
        roomId: b1Rooms.P502._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.locked1.cccd,
        representativeEmail: demoCustomers.locked1.email,
        startDate: daysFromNow(-150),
        endDate: daysFromNow(30),
        rentPrice: 3400000,
        deposit: 3400000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: daysFromNow(-150),
        notes: 'Hợp đồng đã chấm dứt đơn phương do vi phạm PCCC và nợ tiền phòng kéo dài.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: lockedContract1._id,
        customerInfo: demoCustomers.locked1,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-150),
        exitDate: daysFromNow(-15),
    });

    const lockedContract2 = await Contract.create({
        roomId: b2Rooms.P302._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.locked2.cccd,
        representativeEmail: demoCustomers.locked2.email,
        startDate: daysFromNow(-140),
        endDate: daysFromNow(40),
        rentPrice: 4100000,
        deposit: 4100000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: daysFromNow(-140),
        notes: 'Hợp đồng đã chấm dứt đơn phương do tự ý cho người lạ ở qua đêm nhiều lần không khai báo.',
        createdBy: manager2.user._id,
        depositReceiverId: manager2.user._id,
    });
    await createRepOccupant({
        contractId: lockedContract2._id,
        customerInfo: demoCustomers.locked2,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-140),
        exitDate: daysFromNow(-12),
    });

    // Demo 13: Hợp đồng ACTIVE tại P302 – Tòa 1 (có đơn MUTUAL PENDING đã quá 7 ngày để test job terminationReminder tự xác nhận)
    const autoConfirmContract = await Contract.create({
        roomId: b1Rooms.P302._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.autoConfirm.cccd,
        representativeEmail: demoCustomers.autoConfirm.email,
        startDate: daysFromNow(-90),
        endDate: daysFromNow(90),
        rentPrice: 3500000,
        deposit: 3500000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-90),
        notes: 'Hợp đồng có đơn chấm dứt MUTUAL PENDING đã tạo 8 ngày trước (dùng để test job tự động xác nhận sau 7 ngày).',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: autoConfirmContract._id,
        customerInfo: demoCustomers.autoConfirm,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-90),
    });

    // Demo 14: Hợp đồng ACTIVE tại P303 – Tòa 1 (có đơn MUTUAL CONFIRMED với effectiveDate = hôm nay để test job terminationEffective)
    const effectiveTodayContract = await Contract.create({
        roomId: b1Rooms.P303._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.effectiveToday.cccd,
        representativeEmail: demoCustomers.effectiveToday.email,
        startDate: daysFromNow(-100),
        endDate: daysFromNow(80),
        rentPrice: 3100000,
        deposit: 3100000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-100),
        notes: 'Hợp đồng có đơn chấm dứt CONFIRMED đến ngày hiệu lực hôm nay (dùng để test job terminationEffective).',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: effectiveTodayContract._id,
        customerInfo: demoCustomers.effectiveToday,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-100),
    });

    // Demo 15: Hợp đồng ACTIVE tại P203 – Tòa 2 (endDate = hôm qua, không có đơn chấm dứt, để test job contractEnd)
    const endTodayContract = await Contract.create({
        roomId: b2Rooms.P203._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.endToday.cccd,
        representativeEmail: demoCustomers.endToday.email,
        startDate: daysFromNow(-181),
        endDate: daysFromNow(-1),
        rentPrice: 3700000,
        deposit: 3700000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-181),
        notes: 'Hợp đồng đã tới ngày endDate (dùng để test job contractEnd cuối ngày tự động chuyển sang ENDED).',
        createdBy: manager2.user._id,
        depositReceiverId: manager2.user._id,
    });
    await createRepOccupant({
        contractId: endTodayContract._id,
        customerInfo: demoCustomers.endToday,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-181),
    });

    // Demo 16: Hợp đồng CANCELLED (Hợp đồng nháp đã bị Manager hủy – token EXPIRED, người ở cùng LEFT)
    const cancelledDraftContract = await Contract.create({
        roomId: b1Rooms.P402._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: '031204000016',
        representativeEmail: 'customer.cancelleddraft@housify.vn',
        startDate: daysFromNow(-15),
        endDate: daysFromNow(165),
        rentPrice: 3800000,
        deposit: 3800000,
        status: CONTRACT_STATUS.CANCELLED,
        notes: 'Khách đổi lịch nhập học nên báo hủy trước khi kích hoạt hợp đồng.',
        createdBy: manager1.user._id,
    });
    await createRoommate({
        contractId: cancelledDraftContract._id,
        name: 'Trần Văn Bạn Nháp',
        phone: '0982100016',
        cccd: '031204900016',
        relationship: 'Bạn cùng lớp',
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-15),
        exitDate: daysFromNow(-14),
    });
    const cancelledToken = generateActivationToken();
    await ActivationToken.create({
        type: ACTIVATION_TYPE.CUSTOMER_INVITE,
        contractId: cancelledDraftContract._id,
        token: cancelledToken.tokenHash,
        sentTo: 'customer.cancelleddraft@housify.vn',
        status: TOKEN_STATUS.EXPIRED,
        expiresAt: daysFromNow(-14),
        createdBy: manager1.user._id,
    });

    // Demo 17 & 18: 2 Hợp đồng ACTIVE tại Tòa 3 (Thanh Xuân Residence)
    const tx1Contract = await Contract.create({
        roomId: b3Rooms.P101._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.tx1.cccd,
        representativeEmail: demoCustomers.tx1.email,
        startDate: daysFromNow(-345),
        endDate: daysFromNow(18),
        rentPrice: 3800000,
        deposit: 3800000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-345),
        notes: 'Hợp đồng còn 18 ngày – phòng đã có hợp đồng nối tiếp dạng Nháp chờ khách mới kích hoạt.',
        createdBy: manager3.user._id,
        depositReceiverId: manager3.user._id,
    });
    await createRepOccupant({
        contractId: tx1Contract._id,
        customerInfo: demoCustomers.tx1,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-345),
    });

    const tx2Contract = await Contract.create({
        roomId: b3Rooms.P102._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: demoCustomers.tx2.cccd,
        representativeEmail: demoCustomers.tx2.email,
        startDate: daysFromNow(-60),
        endDate: daysFromNow(210),
        rentPrice: 4200000,
        deposit: 4200000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-60),
        notes: 'Hợp đồng nhóm tại Tòa 3 Thanh Xuân Residence.',
        createdBy: manager3.user._id,
        depositReceiverId: manager3.user._id,
    });
    await createRepOccupant({
        contractId: tx2Contract._id,
        customerInfo: demoCustomers.tx2,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-60),
    });

    // Demo 19: Hợp đồng ENDED tại P501 – Tòa 1 (Cọc 3.000.000đ, Nợ 5.000.000đ -> Thiếu 2.000.000đ) để test UC-45 khóa nút hoàn tất
    const refundDebtExceedContract = await Contract.create({
        roomId: b1Rooms.P501._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.refundDebtExceed.cccd,
        representativeEmail: demoCustomers.refundDebtExceed.email,
        startDate: daysFromNow(-185),
        endDate: daysFromNow(-5),
        rentPrice: 3000000,
        deposit: 3000000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: daysFromNow(-185),
        notes: 'Demo UC-45 (Nợ > Cọc): Tiền cọc 3.000.000đ, công nợ 5.000.000đ (2 hóa đơn PENDING) -> Cần thu thêm 2.000.000đ.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: refundDebtExceedContract._id,
        customerInfo: demoCustomers.refundDebtExceed,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-185),
        exitDate: daysFromNow(-5),
    });

    // Demo 20: Hợp đồng ENDED tại P402 – Tòa 1 (Cọc 3.800.000đ, Nợ 1.800.000đ -> Thực hoàn 2.000.000đ) để test UC-45 cấn trừ 1 phần
    const refundOffsetPartialContract = await Contract.create({
        roomId: b1Rooms.P402._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.refundOffsetPartial.cccd,
        representativeEmail: demoCustomers.refundOffsetPartial.email,
        startDate: daysFromNow(-184),
        endDate: daysFromNow(-4),
        rentPrice: 3800000,
        deposit: 3800000,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: daysFromNow(-184),
        notes: 'Demo UC-45 (Nợ <= Cọc): Tiền cọc 3.800.000đ, công nợ 1.800.000đ (1 hóa đơn PENDING) -> Thực hoàn 2.000.000đ.',
        createdBy: manager1.user._id,
        depositReceiverId: manager1.user._id,
    });
    await createRepOccupant({
        contractId: refundOffsetPartialContract._id,
        customerInfo: demoCustomers.refundOffsetPartial,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(-184),
        exitDate: daysFromNow(-4),
    });

    // -------------------------------------------------------------------------
    // CÁC CASE ĐẶT THUÊ NỐI TIẾP (UPCOMING)
    // -------------------------------------------------------------------------
    // U1 (email thật 3): khách mới chỉ có UPCOMING P303 Tòa 1, chờ HĐ effectiveToday (đơn chấm dứt hiệu lực hôm nay)
    //     -> chạy job terminationEffective: HĐ cũ ENDED, HĐ này tự ACTIVE, phòng vẫn OCCUPIED
    const r3 = REAL_CUSTOMERS[10];
    const r3UpcomingContract = await createUpcomingContract({
        room: b1Rooms.P303,
        customerInfo: r3,
        startDate: daysFromNow(1),
        manager: manager1,
        notes: 'Khách mới đặt thuê nối tiếp P303 – hồ sơ chỉ xem, cư dân hiện "Chờ vào ở". Chạy job terminationEffective để thấy tự chuyển Đang hiệu lực.',
    });

    // U2: UPCOMING P203 Tòa 2 sau HĐ endToday (hết hạn hôm qua) -> chạy job contractExpiry để thấy tự chuyển ACTIVE
    const expirySuccessorContract = await createUpcomingContract({
        room: b2Rooms.P203,
        customerInfo: demoCustomers.expirySuccessor,
        startDate: daysFromNow(0),
        manager: manager2,
        notes: 'Đặt nối tiếp ngay sau HĐ hết hạn hôm qua – chạy job contractExpiry để HĐ cũ ENDED và HĐ này ACTIVE trong cùng giao dịch.',
    });

    // U3: P402 Tòa 2 – người đang ở còn 20 ngày + khách UPCOMING đổi ý (có đơn hủy MUTUAL PENDING chờ khách xác nhận)
    const cgP402TenantContract = await Contract.create({
        roomId: b2Rooms.P402._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.cgP402Tenant.cccd,
        representativeEmail: demoCustomers.cgP402Tenant.email,
        startDate: daysFromNow(-345),
        endDate: daysFromNow(20),
        rentPrice: 3800000,
        deposit: 3800000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-345),
        notes: 'Hợp đồng còn 20 ngày, phòng đã có khách đặt thuê nối tiếp. Gia hạn sẽ bị chặn.',
        createdBy: manager2.user._id,
        depositReceiverId: manager2.user._id,
    });
    await createRepOccupant({
        contractId: cgP402TenantContract._id,
        customerInfo: demoCustomers.cgP402Tenant,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-345),
    });
    const changeMindUpcomingContract = await createUpcomingContract({
        room: b2Rooms.P402,
        customerInfo: demoCustomers.changeMind,
        startDate: daysFromNow(21),
        manager: manager2,
        notes: 'Khách đã ký nối tiếp nhưng đổi ý – Manager đã lập đơn hủy theo thỏa thuận, khách xác nhận thì hợp đồng Đã hủy và mất cọc.',
        activatedDaysAgo: 5,
    });

    // U4: UPCOMING đã bị hủy theo thỏa thuận (CANCELLED, mất cọc) – khách không còn hợp đồng nào nên tài khoản đã INACTIVE
    const cancelledUpcomingContract = await Contract.create({
        roomId: b2Rooms.P301._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.cancelledUpcoming.cccd,
        representativeEmail: demoCustomers.cancelledUpcoming.email,
        startDate: daysFromNow(10),
        endDate: endAfterMonths(daysFromNow(10), 12),
        rentPrice: 5200000,
        deposit: 5200000,
        status: CONTRACT_STATUS.CANCELLED,
        activatedAt: daysFromNow(-12, 19, 40),
        notes: 'Khách đã ký nối tiếp rồi hủy theo thỏa thuận (mất cọc). Tài khoản ngưng hoạt động sau 24 giờ.',
        createdBy: manager2.user._id,
        depositReceiverId: manager2.user._id,
    });
    await Contract.updateOne(
        { _id: cancelledUpcomingContract._id },
        { $set: { updatedAt: daysFromNow(-4, 10, 0) } },
        { timestamps: false },
    );
    await createRepOccupant({
        contractId: cancelledUpcomingContract._id,
        customerInfo: demoCustomers.cancelledUpcoming,
        status: OCCUPANT_STATUS.LEFT,
        joinDate: daysFromNow(10),
        exitDate: daysFromNow(-4, 10, 0),
    });

    // U5: P101 Tòa 3 còn 18 ngày + hợp đồng nối tiếp dạng NHÁP chờ khách mới kích hoạt (kích hoạt xong -> UPCOMING)
    const draftSuccessorContract = await Contract.create({
        roomId: b3Rooms.P101._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: draftSuccessorCustomer.cccd,
        representativeEmail: draftSuccessorCustomer.email,
        startDate: daysFromNow(19),
        endDate: endAfterMonths(daysFromNow(19), 12),
        rentPrice: 3800000,
        deposit: 3800000,
        status: CONTRACT_STATUS.DRAFT,
        notes: 'Hợp đồng nối tiếp dạng nháp – khách kích hoạt link sẽ thành Sắp hiệu lực (phòng còn người ở đến hết 18 ngày nữa).',
        createdBy: manager3.user._id,
    });
    const draftSuccessorToken = generateActivationToken();
    await ActivationToken.create({
        type: ACTIVATION_TYPE.CUSTOMER_INVITE,
        contractId: draftSuccessorContract._id,
        token: draftSuccessorToken.tokenHash,
        sentTo: draftSuccessorCustomer.email,
        expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
        createdBy: manager3.user._id,
    });

    // U6: Tòa 4 – khách W đang ở P201 (còn 12 ngày) đã ký P101 (người đang ở còn 10 ngày).
    //     P101 kết thúc trước thì W vẫn UPCOMING; W trả P201 xong mới ACTIVE (không bao giờ 2 HĐ ACTIVE cùng lúc)
    const ddTenantAContract = await Contract.create({
        roomId: b4Rooms.P101._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: demoCustomers.ddTenantA.cccd,
        representativeEmail: demoCustomers.ddTenantA.email,
        startDate: daysFromNow(-355),
        endDate: daysFromNow(10),
        rentPrice: 3900000,
        deposit: 3900000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-355),
        notes: 'Hợp đồng còn 10 ngày, phòng đã có khách đặt nối tiếp (khách đó còn đang ở P201).',
        createdBy: manager4.user._id,
        depositReceiverId: manager4.user._id,
    });
    await createRepOccupant({
        contractId: ddTenantAContract._id,
        customerInfo: demoCustomers.ddTenantA,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-355),
    });
    const ddMoverOldContract = await Contract.create({
        roomId: b4Rooms.P201._id,
        contractType: CONTRACT_TYPE.GROUP,
        representativeCccd: demoCustomers.ddMoverW.cccd,
        representativeEmail: demoCustomers.ddMoverW.email,
        startDate: daysFromNow(-353),
        endDate: daysFromNow(12),
        rentPrice: 4400000,
        deposit: 4400000,
        status: CONTRACT_STATUS.ACTIVE,
        activatedAt: daysFromNow(-353),
        notes: 'Khách sắp chuyển sang P101 cùng tòa (đã ký Sắp hiệu lực).',
        createdBy: manager4.user._id,
        depositReceiverId: manager4.user._id,
    });
    await createRepOccupant({
        contractId: ddMoverOldContract._id,
        customerInfo: demoCustomers.ddMoverW,
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-353),
    });
    await createRoommate({
        contractId: ddMoverOldContract._id,
        name: 'Mai Thị Em Gái',
        phone: '0982100027',
        cccd: '031204900027',
        relationship: 'Em gái',
        status: OCCUPANT_STATUS.STAYED,
        joinDate: daysFromNow(-353),
    });
    const ddMoverUpcomingContract = await createUpcomingContract({
        room: b4Rooms.P101,
        customerInfo: demoCustomers.ddMoverW,
        startDate: daysFromNow(13),
        manager: manager4,
        notes: 'Chờ 2 điều kiện: người đang ở P101 trả phòng (10 ngày) VÀ chính khách trả P201 (12 ngày).',
        activatedDaysAgo: 4,
    });

    console.log('✔ [7/16] Đã tạo toàn bộ Tài khoản Customer, Hợp đồng (DRAFT, UPCOMING, ACTIVE, ENDED, CANCELLED) và Cư dân (Occupant).');

    // =========================================================================
    // 8. TERMINATION REQUESTS (Đủ mọi loại MUTUAL & UNILATERAL, đủ trạng thái)
    // =========================================================================
    // 8.1. Đơn MUTUAL PENDING trên HĐ của Customer 5 (cocainit123788@gmail.com - P202 Tòa 1) -> chờ khách bấm Xác nhận điện tử
    const termMutualPendingC5 = await TerminationRequest.create({
        contractId: c5ActiveContract._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: 'Sinh viên đi thực tập OJT học kỳ 6 tại TP.HCM nên hai bên thống nhất chấm dứt hợp đồng sớm trước hạn.',
        effectiveDate: daysFromNow(10),
        note: 'Kiểm tra công tơ điện nước và bàn giao điều khiển điều hòa, thẻ từ vào ngày chấm dứt.',
        status: TERMINATION_STATUS.PENDING,
        requestedBy: manager1.user._id,
    });

    // 8.2. Đơn MUTUAL CANCELLED trước đó trên HĐ của Customer 5 (lịch sử Manager từng lập nhầm ngày rồi hủy)
    await TerminationRequest.create({
        contractId: c5ActiveContract._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: 'Lập đơn chấm dứt theo đề nghị ban đầu của khách.',
        effectiveDate: daysFromNow(5),
        note: 'Bàn giao phòng P202.',
        status: TERMINATION_STATUS.CANCELLED,
        requestedBy: manager1.user._id,
        cancelledBy: manager1.user._id,
        cancelReason: 'Khách xin lùi ngày bàn giao phòng thêm 5 ngày để kịp thi xong môn cuối kỳ.',
    });

    // 8.3. Đơn UNILATERAL PENDING trên HĐ của Customer 6 (customer.donphuong@housify.vn - P203 Tòa 1) -> chờ Admin duyệt (UC-29)
    const termUnilateralPendingC6 = await TerminationRequest.create({
        contractId: c6ActiveContract._id,
        type: TERMINATION_TYPE.UNILATERAL,
        reason: 'Vi phạm nội quy PCCC (sạc bình ắc quy xe điện trong phòng) đã lập biên bản nhắc nhở 02 lần và chậm thanh toán hóa đơn quá hạn.',
        effectiveDate: daysFromNow(5),
        note: 'Đề nghị Admin phê duyệt chấm dứt đơn phương và thu hồi tiền cọc theo điều 6 Nội quy tòa nhà.',
        status: TERMINATION_STATUS.PENDING,
        requestedBy: manager1.user._id,
    });

    // 8.4. Đơn UNILATERAL REJECTED trước đó trên HĐ của Customer 6 (lịch sử Admin từng từ chối 1 lần vì yêu cầu bổ sung biên bản)
    await TerminationRequest.create({
        contractId: c6ActiveContract._id,
        type: TERMINATION_TYPE.UNILATERAL,
        reason: 'Khách làm ồn sau 23h đêm.',
        effectiveDate: daysFromNow(-15),
        note: 'Đề nghị chấm dứt hợp đồng.',
        status: TERMINATION_STATUS.REJECTED,
        requestedBy: manager1.user._id,
        handledBy: adminUser._id,
        handledAt: daysFromNow(-18),
        rejectReason: 'Vi phạm lần đầu mức độ nhẹ, yêu cầu Quản lý lập biên bản nhắc nhở trước khi đề xuất chấm dứt đơn phương.',
    });

    // 8.5. Đơn MUTUAL CONFIRMED (đã Xác nhận điện tử có signatureHash chuẩn) trên HĐ của Customer 7 (customer.dachot@housify.vn - P101 Tòa 2), chờ 3 ngày nữa tới ngày hiệu lực
    const c7ConfirmDate = daysFromNow(-2, 14, 20);
    const c7EffDate = daysFromNow(3);
    const c7Reason = 'Hoàn thành khóa học và chuyển công tác, hai bên thỏa thuận thanh lý hợp đồng.';
    const c7Note = 'Đã kiểm tra sơ bộ thiết bị nội thất phòng P101 đều hoạt động tốt.';
    const c7SigHash = computeTerminationHash({
        contractId: c7ActiveContract._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: c7Reason,
        effectiveDate: c7EffDate,
        note: c7Note,
        handledBy: customerUsers[c7.cccd]._id,
        handledAt: c7ConfirmDate,
    });
    await TerminationRequest.create({
        contractId: c7ActiveContract._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: c7Reason,
        effectiveDate: c7EffDate,
        note: c7Note,
        status: TERMINATION_STATUS.CONFIRMED,
        autoConfirmed: false,
        requestedBy: manager2.user._id,
        handledBy: customerUsers[c7.cccd]._id,
        handledAt: c7ConfirmDate,
        handledIp: '113.190.232.18',
        signatureHash: c7SigHash,
    });

    // 8.6. Đơn MUTUAL CONFIRMED trên HĐ cũ số 2 của Customer 1 (c1OldContract2) để khi xem lại HĐ cũ thấy cả lịch sử đơn chấm dứt
    const c1OldConfirmAt = new Date('2025-10-25T15:00:00.000Z');
    const c1OldEffDate = new Date('2025-11-01T00:00:00.000Z');
    const c1OldReason = 'Kết thúc kỳ thực tập tại Cầu Giấy để quay lại cơ sở Hòa Lạc.';
    const c1OldNote = 'Đã bàn giao chìa khóa và thanh toán hết điện nước.';
    await TerminationRequest.create({
        contractId: c1OldContract2._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: c1OldReason,
        effectiveDate: c1OldEffDate,
        note: c1OldNote,
        status: TERMINATION_STATUS.CONFIRMED,
        autoConfirmed: false,
        requestedBy: manager2.user._id,
        handledBy: customerUsers[c1.cccd]._id,
        handledAt: c1OldConfirmAt,
        handledIp: '14.232.160.45',
        signatureHash: computeTerminationHash({
            contractId: c1OldContract2._id,
            type: TERMINATION_TYPE.MUTUAL,
            reason: c1OldReason,
            effectiveDate: c1OldEffDate,
            note: c1OldNote,
            handledBy: customerUsers[c1.cccd]._id,
            handledAt: c1OldConfirmAt,
        }),
    });

    // 8.7. Đơn UNILATERAL CONFIRMED trên 2 HĐ bị khóa (lockedContract1 & lockedContract2)
    await TerminationRequest.create({
        contractId: lockedContract1._id,
        type: TERMINATION_TYPE.UNILATERAL,
        reason: 'Vi phạm nghiêm trọng quy định PCCC và nợ hóa đơn quá hạn trên 15 ngày.',
        effectiveDate: daysFromNow(-15),
        note: 'Thu hồi quyền truy cập vân tay và khóa tài khoản theo quy định.',
        status: TERMINATION_STATUS.CONFIRMED,
        requestedBy: manager1.user._id,
        handledBy: adminUser._id,
        handledAt: daysFromNow(-16),
    });
    await TerminationRequest.create({
        contractId: lockedContract2._id,
        type: TERMINATION_TYPE.UNILATERAL,
        reason: 'Tái phạm hành vi gây mất trậtự an ninh sau 23h đêm và đưa người lạ vào ở trái phép.',
        effectiveDate: daysFromNow(-12),
        note: 'Admin đã phê duyệt chấm dứt đơn phương.',
        status: TERMINATION_STATUS.CONFIRMED,
        requestedBy: manager2.user._id,
        handledBy: adminUser._id,
        handledAt: daysFromNow(-13),
    });

    // 8.8. Đơn MUTUAL PENDING tạo cách đây 8 ngày trên autoConfirmContract (để test job terminationReminder tự động CONFIRMED)
    const termAutoConfirm = await TerminationRequest.create({
        contractId: autoConfirmContract._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: 'Chấm dứt hợp đồng theo thỏa thuận cuối kỳ (đã quá 7 ngày khách chưa bấm xác nhận).',
        effectiveDate: daysFromNow(4),
        note: 'Test job tự động xác nhận sau 7 ngày.',
        status: TERMINATION_STATUS.PENDING,
        requestedBy: manager1.user._id,
    });
    // Ghi thẳng qua driver: Mongoose 9 coi createdAt là bất biến nên tự bỏ $set createdAt
    await TerminationRequest.collection.updateOne(
        { _id: termAutoConfirm._id },
        { $set: { createdAt: daysFromNow(-8), updatedAt: daysFromNow(-8) } },
    );

    // 8.9. Đơn MUTUAL CONFIRMED có effectiveDate = hôm nay trên effectiveTodayContract (để test job terminationEffective)
    await TerminationRequest.create({
        contractId: effectiveTodayContract._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: 'Đã xác nhận chấm dứt và có ngày hiệu lực là hôm nay (test job terminationEffective).',
        effectiveDate: daysFromNow(0, 0, 0),
        note: 'Hệ thống sẽ tự động kết thúc hợp đồng khi chạy job.',
        status: TERMINATION_STATUS.CONFIRMED,
        autoConfirmed: true,
        requestedBy: manager1.user._id,
        handledAt: daysFromNow(-3),
    });

    // 8.10. Đơn MUTUAL PENDING tạo cách đây 3 ngày trên tx2Contract (mốc nhắc ngày thứ 3 của job)
    const termDay3 = await TerminationRequest.create({
        contractId: tx2Contract._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: 'Thỏa thuận trả phòng cuối tháng tại Tòa 3 Thanh Xuân.',
        effectiveDate: daysFromNow(12),
        note: 'Đang chờ khách xác nhận (mốc nhắc ngày 3).',
        status: TERMINATION_STATUS.PENDING,
        requestedBy: manager3.user._id,
    });
    // Ghi thẳng qua driver: Mongoose 9 coi createdAt là bất biến nên tự bỏ $set createdAt
    await TerminationRequest.collection.updateOne(
        { _id: termDay3._id },
        { $set: { createdAt: daysFromNow(-3, 8, 0) } },
    );

    // 8.11. Đơn hủy hợp đồng UPCOMING theo thỏa thuận đang chờ khách xác nhận (không có ngày hiệu lực thật: = ngày tạo đơn)
    const termChangeMind = await TerminationRequest.create({
        contractId: changeMindUpcomingContract._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: 'Khách được nhận học bổng ký túc xá nên xin hủy hợp đồng đã ký trước, chấp nhận mất tiền cọc.',
        effectiveDate: daysFromNow(-1, 0, 0),
        note: 'Hợp đồng chưa bắt đầu – không cần bàn giao phòng.',
        status: TERMINATION_STATUS.PENDING,
        requestedBy: manager2.user._id,
    });
    // Ghi thẳng qua driver: Mongoose 9 coi createdAt là bất biến nên tự bỏ $set createdAt
    await TerminationRequest.collection.updateOne(
        { _id: termChangeMind._id },
        { $set: { createdAt: daysFromNow(-1, 15, 0) } },
    );

    // 8.12. Đơn hủy UPCOMING đã được khách xác nhận điện tử (hợp đồng đã CANCELLED, mất cọc)
    const cancelUpcomingConfirmAt = daysFromNow(-4, 9, 30);
    const cancelUpcomingEffDate = daysFromNow(-5, 0, 0);
    const cancelUpcomingReason = 'Khách đổi kế hoạch học tập, hai bên thống nhất hủy hợp đồng đã ký trước (không hoàn cọc).';
    await TerminationRequest.create({
        contractId: cancelledUpcomingContract._id,
        type: TERMINATION_TYPE.MUTUAL,
        reason: cancelUpcomingReason,
        effectiveDate: cancelUpcomingEffDate,
        status: TERMINATION_STATUS.CONFIRMED,
        autoConfirmed: false,
        requestedBy: manager2.user._id,
        handledBy: customerUsers[demoCustomers.cancelledUpcoming.cccd]._id,
        handledAt: cancelUpcomingConfirmAt,
        handledIp: '27.72.98.110',
        signatureHash: computeTerminationHash({
            contractId: cancelledUpcomingContract._id,
            type: TERMINATION_TYPE.MUTUAL,
            reason: cancelUpcomingReason,
            effectiveDate: cancelUpcomingEffDate,
            note: undefined,
            handledBy: customerUsers[demoCustomers.cancelledUpcoming.cccd]._id,
            handledAt: cancelUpcomingConfirmAt,
        }),
    });

    console.log('✔ [8/16] Đã tạo 12 Đơn chấm dứt hợp đồng (MUTUAL & UNILATERAL: PENDING, CONFIRMED, REJECTED, CANCELLED, kể cả đơn hủy hợp đồng Sắp hiệu lực).');

    // =========================================================================
    // 9. INVOICES & PAYMENTS (Đủ mọi kịch bản thanh toán SePay & nhắc hạn)
    // =========================================================================
    // Helper tạo dòng tiền chuẩn cho hóa đơn
    const makeStandardItems = ({
        rentPrice,
        elecOld = 120,
        elecNew = 210,
        elecPrice = 3800,
        waterOld = 15,
        waterNew = 21,
        waterPrice = 25000,
        wifiPrice = 100000,
        trashPrice = 40000,
        parkingQty = 2,
        parkingPrice = 100000,
        extraDesc = null,
        extraAmount = 0,
    }) => {
        const elecQty = elecNew - elecOld;
        const waterQty = waterNew - waterOld;
        const items = [
            {
                type: INVOICE_ITEM_TYPE.RENT,
                description: 'Tiền thuê phòng',
                quantity: 1,
                unitPrice: rentPrice,
                amount: rentPrice,
            },
            {
                serviceId: svcElec._id,
                type: INVOICE_ITEM_TYPE.METERED,
                description: 'Điện sinh hoạt',
                oldReading: elecOld,
                newReading: elecNew,
                quantity: elecQty,
                unitPrice: elecPrice,
                amount: elecQty * elecPrice,
            },
            {
                serviceId: svcWater._id,
                type: INVOICE_ITEM_TYPE.METERED,
                description: 'Nước sạch sinh hoạt',
                oldReading: waterOld,
                newReading: waterNew,
                quantity: waterQty,
                unitPrice: waterPrice,
                amount: waterQty * waterPrice,
            },
            {
                serviceId: svcWifi._id,
                type: INVOICE_ITEM_TYPE.FIXED,
                description: 'Internet Cáp Quang Wifi 6',
                quantity: 1,
                unitPrice: wifiPrice,
                amount: wifiPrice,
            },
            {
                serviceId: svcTrash._id,
                type: INVOICE_ITEM_TYPE.FIXED,
                description: 'Vệ sinh & Thu gom rác',
                quantity: 1,
                unitPrice: trashPrice,
                amount: trashPrice,
            },
            {
                serviceId: svcParking._id,
                type: INVOICE_ITEM_TYPE.FIXED,
                description: 'Gửi xe máy / Xe điện',
                quantity: parkingQty,
                unitPrice: parkingPrice,
                amount: parkingQty * parkingPrice,
            },
        ];
        if (extraDesc && extraAmount > 0) {
            items.push({
                type: INVOICE_ITEM_TYPE.EXTRA,
                description: extraDesc,
                quantity: 1,
                unitPrice: extraAmount,
                amount: extraAmount,
            });
        }
        const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
        return { items, totalAmount };
    };

    // --- 9.1. Bộ hóa đơn của Customer 1 (annbhe182167@fpt.edu.vn - P101 Tòa 1) ---
    // (a) Hóa đơn trên HĐ cũ 1 (PAID)
    const invC1Old1Data = makeStandardItems({ rentPrice: 3800000, elecOld: 0, elecNew: 80, waterOld: 0, waterNew: 5, parkingQty: 1 });
    const invC1Old1 = await Invoice.create({
        invoiceCode: 'HD2502A101',
        contractId: c1OldContract1._id,
        month: '2025-02',
        items: invC1Old1Data.items,
        totalAmount: invC1Old1Data.totalAmount,
        status: INVOICE_STATUS.PAID,
        sentAt: new Date('2025-02-01T09:00:00.000Z'),
        dueDate: new Date('2025-02-08T09:00:00.000Z'),
        paidAt: new Date('2025-02-04T14:20:00.000Z'),
        qrContent: buildVietQrUrl(invC1Old1Data.totalAmount, 'HD2502A101'),
        createdBy: manager1.user._id,
    });
    await Payment.create({
        sepayTxnId: 'SEPAY_TXN_2502A101',
        invoiceId: invC1Old1._id,
        amount: invC1Old1Data.totalAmount,
        transferContent: 'NGUYEN BINH AN chuyen khoan HD2502A101',
        bankName: 'MBBank',
        paidAt: new Date('2025-02-04T14:20:00.000Z'),
    });

    // (b) Hóa đơn kỳ trước 2 trên HĐ hiện tại P101 (PAID đúng hạn)
    const invC1PaidOnTimeData = makeStandardItems({ rentPrice: 4200000, elecOld: 100, elecNew: 185, waterOld: 10, waterNew: 16 });
    const invC1PaidOnTime = await Invoice.create({
        invoiceCode: 'HD2609P101',
        contractId: c1ActiveContract._id,
        month: prevMonth2,
        items: invC1PaidOnTimeData.items,
        totalAmount: invC1PaidOnTimeData.totalAmount,
        status: INVOICE_STATUS.PAID,
        sentAt: daysFromNow(-60),
        dueDate: daysFromNow(-53),
        paidAt: daysFromNow(-56), // Đóng trước hạn 3 ngày -> đúng hạn
        qrContent: buildVietQrUrl(invC1PaidOnTimeData.totalAmount, 'HD2609P101'),
        createdBy: manager1.user._id,
    });
    await Payment.create({
        sepayTxnId: 'SEPAY_TXN_2609P101',
        invoiceId: invC1PaidOnTime._id,
        amount: invC1PaidOnTimeData.totalAmount,
        transferContent: 'Thanh toan tien phong HD2609P101',
        bankName: 'Vietcombank',
        paidAt: daysFromNow(-56),
    });

    // (c) Hóa đơn kỳ trước 1 trên HĐ hiện tại P101 (PAID trễ hạn: paidAt > dueDate -> isPaidLate = true)
    const invC1PaidLateData = makeStandardItems({
        rentPrice: 4200000,
        elecOld: 185,
        elecNew: 275,
        waterOld: 16,
        waterNew: 23,
        extraDesc: 'Phí thay bóng đèn LED ban công',
        extraAmount: 85000,
    });
    const invC1PaidLate = await Invoice.create({
        invoiceCode: 'HD2610P101',
        contractId: c1ActiveContract._id,
        month: prevMonth1,
        items: invC1PaidLateData.items,
        totalAmount: invC1PaidLateData.totalAmount,
        status: INVOICE_STATUS.PAID,
        sentAt: daysFromNow(-30),
        dueDate: daysFromNow(-23),
        paidAt: daysFromNow(-20), // Đóng trễ 3 ngày -> isPaidLate = true
        qrContent: buildVietQrUrl(invC1PaidLateData.totalAmount, 'HD2610P101'),
        createdBy: manager1.user._id,
    });
    await Payment.create({
        sepayTxnId: 'SEPAY_TXN_2610P101',
        invoiceId: invC1PaidLate._id,
        amount: invC1PaidLateData.totalAmount,
        transferContent: 'CK hoa don HD2610P101 P101',
        bankName: 'Techcombank',
        paidAt: daysFromNow(-20),
    });

    // (d) Hóa đơn kỳ hiện tại trên HĐ P101 (PENDING - sắp đến hạn sau 3 ngày -> sẵn sàng quét QR hoặc test job nhắc hạn mốc 3 ngày)
    const invC1PendingSoonData = makeStandardItems({ rentPrice: 4200000, elecOld: 275, elecNew: 365, waterOld: 23, waterNew: 30 });
    const invC1PendingSoon = await Invoice.create({
        invoiceCode: 'HD2611P101',
        contractId: c1ActiveContract._id,
        month: currentMonth,
        items: invC1PendingSoonData.items,
        totalAmount: invC1PendingSoonData.totalAmount,
        status: INVOICE_STATUS.PENDING,
        sentAt: daysFromNow(-4),
        dueDate: daysFromNow(3), // Còn đúng 3 ngày đến hạn!
        qrContent: buildVietQrUrl(invC1PendingSoonData.totalAmount, 'HD2611P101'),
        createdBy: manager1.user._id,
    });

    // --- 9.2. Bộ hóa đơn của Customer 2 (customer.thieutien@housify.vn - P102 Tòa 1): CASE CHUYỂN THIẾU (PAYMENT_UNDERPAID) ---
    const invC2UnderpaidData = makeStandardItems({
        rentPrice: 3600000,
        elecOld: 50,
        elecNew: 120,
        waterOld: 8,
        waterNew: 12,
        parkingQty: 1,
    }); // Tổng = 3.600.000 + 266.000 + 100.000 + 100.000 + 40.000 + 100.000 = 4.206.000đ
    const invC2Underpaid = await Invoice.create({
        invoiceCode: 'HD2611UNDR',
        contractId: c2ActiveContract._id,
        month: currentMonth,
        items: invC2UnderpaidData.items,
        totalAmount: invC2UnderpaidData.totalAmount,
        status: INVOICE_STATUS.PENDING, // Chuyển thiếu nên vẫn giữ PENDING (BR-107)
        sentAt: daysFromNow(-5),
        dueDate: daysFromNow(2),
        qrContent: buildVietQrUrl(invC2UnderpaidData.totalAmount, 'HD2611UNDR'),
        createdBy: manager1.user._id,
    });
    // Khách mới chuyển 3.000.000đ (thiếu 1.206.000đ)
    const underpaidAmount = 3000000;
    await Payment.create({
        sepayTxnId: 'SEPAY_TXN_UNDERPAID_01',
        invoiceId: invC2Underpaid._id,
        amount: underpaidAmount,
        transferContent: 'TRAN MINH QUAN chuyen truoc 3tr HD2611UNDR',
        bankName: 'MBBank',
        paidAt: daysFromNow(-2),
    });

    // --- 9.3. Bộ hóa đơn của Customer 3 (customer.thuatien@housify.vn - P103 Tòa 1): CASE CHUYỂN THỪA (PAYMENT_OVERPAID) + HÓA ĐƠN ĐÃ HỦY ---
    // (a) Hóa đơn đã hủy do ghi nhầm chỉ số điện (CANCELLED)
    const invC3CancelledData = makeStandardItems({ rentPrice: 3000000, elecOld: 40, elecNew: 400, waterOld: 5, waterNew: 8, parkingQty: 1 });
    await Invoice.create({
        invoiceCode: 'HD2611CANC',
        contractId: c3ActiveContract._id,
        month: currentMonth,
        items: invC3CancelledData.items,
        totalAmount: invC3CancelledData.totalAmount,
        status: INVOICE_STATUS.CANCELLED,
        sentAt: daysFromNow(-6),
        dueDate: daysFromNow(1),
        qrContent: buildVietQrUrl(invC3CancelledData.totalAmount, 'HD2611CANC'),
        cancelReason: 'Ghi nhầm chỉ số công tơ điện mới (400 thay vì 100), hủy để lập lại hóa đơn đúng cho cư dân.',
        createdBy: manager1.user._id,
    });

    // (b) Hóa đơn lập lại đúng cho kỳ hiện tại – Khách chuyển thừa (PAYMENT_OVERPAID)
    const invC3OverpaidData = makeStandardItems({ rentPrice: 3000000, elecOld: 40, elecNew: 100, waterOld: 5, waterNew: 8, parkingQty: 1 });
    // Tổng = 3.000.000 + 228.000 + 75.000 + 100.000 + 40.000 + 100.000 = 3.543.000đ
    const invC3Overpaid = await Invoice.create({
        invoiceCode: 'HD2611OVER',
        contractId: c3ActiveContract._id,
        month: currentMonth,
        items: invC3OverpaidData.items,
        totalAmount: invC3OverpaidData.totalAmount,
        status: INVOICE_STATUS.PENDING, // Chuyển thừa nên vẫn PENDING chờ đối soát (BR-107)
        sentAt: daysFromNow(-5),
        dueDate: daysFromNow(2),
        qrContent: buildVietQrUrl(invC3OverpaidData.totalAmount, 'HD2611OVER'),
        createdBy: manager1.user._id,
    });
    const overpaidAmount = 4000000; // Khách chuyển chẵn 4.000.000đ (dư 457.000đ)
    await Payment.create({
        sepayTxnId: 'SEPAY_TXN_OVERPAID_01',
        invoiceId: invC3Overpaid._id,
        amount: overpaidAmount,
        transferContent: 'LE HOANG NAM thanh toan HD2611OVER',
        bankName: 'BIDV',
        paidAt: daysFromNow(-1),
    });

    // --- 9.4. Bộ hóa đơn của Customer 4 (nguyenan182167@gmail.com - P201 Tòa 1): CASE QUÁ HẠN (isOverdue) & ĐẾN HẠN HÔM NAY ---
    // (a) Hóa đơn tháng trước QUÁ HẠN 5 ngày chưa đóng (isOverdue = true)
    const invC4OverdueData = makeStandardItems({ rentPrice: 3700000, elecOld: 210, elecNew: 310, waterOld: 18, waterNew: 25, parkingQty: 2 });
    const invC4Overdue = await Invoice.create({
        invoiceCode: 'HD2610OVDU',
        contractId: c4ActiveContract._id,
        month: prevMonth1,
        items: invC4OverdueData.items,
        totalAmount: invC4OverdueData.totalAmount,
        status: INVOICE_STATUS.PENDING,
        sentAt: daysFromNow(-12),
        dueDate: daysFromNow(-5), // Đã quá hạn 5 ngày!
        qrContent: buildVietQrUrl(invC4OverdueData.totalAmount, 'HD2610OVDU'),
        createdBy: manager1.user._id,
    });

    // (b) Hóa đơn tháng này ĐẾN HẠN HÔM NAY (dueDate = today)
    const invC4DueTodayData = makeStandardItems({ rentPrice: 3700000, elecOld: 310, elecNew: 395, waterOld: 25, waterNew: 31, parkingQty: 2 });
    const invC4DueToday = await Invoice.create({
        invoiceCode: 'HD2611TOD0',
        contractId: c4ActiveContract._id,
        month: currentMonth,
        items: invC4DueTodayData.items,
        totalAmount: invC4DueTodayData.totalAmount,
        status: INVOICE_STATUS.PENDING,
        sentAt: daysFromNow(-7),
        dueDate: daysFromNow(0, 23, 0), // Đến hạn ngay hôm nay!
        qrContent: buildVietQrUrl(invC4DueTodayData.totalAmount, 'HD2611TOD0'),
        createdBy: manager1.user._id,
    });

    // --- 9.5. Hóa đơn của Customer 5 (cocainit123788@gmail.com - P202 Tòa 1): SẮP ĐẾN HẠN CÒN 1 NGÀY ---
    const invC5Due1DayData = makeStandardItems({ rentPrice: 3400000, elecOld: 90, elecNew: 165, waterOld: 12, waterNew: 17, parkingQty: 2 });
    const invC5Due1Day = await Invoice.create({
        invoiceCode: 'HD2611DUE1',
        contractId: c5ActiveContract._id,
        month: currentMonth,
        items: invC5Due1DayData.items,
        totalAmount: invC5Due1DayData.totalAmount,
        status: INVOICE_STATUS.PENDING,
        sentAt: daysFromNow(-6),
        dueDate: daysFromNow(1), // Còn 1 ngày đến hạn!
        qrContent: buildVietQrUrl(invC5Due1DayData.totalAmount, 'HD2611DUE1'),
        createdBy: manager1.user._id,
    });

    // --- 9.6. Hóa đơn NHÁP (DRAFT) của Customer 6 (customer.donphuong@housify.vn - P203 Tòa 1) để Manager 1 vào sửa chỉ số & bấm Gửi ---
    const invC6DraftData = makeStandardItems({ rentPrice: 3100000, elecOld: 140, elecNew: 205, waterOld: 10, waterNew: 14, parkingQty: 1 });
    await Invoice.create({
        invoiceCode: 'HD2611DRFT',
        contractId: c6ActiveContract._id,
        month: currentMonth,
        items: invC6DraftData.items,
        totalAmount: invC6DraftData.totalAmount,
        status: INVOICE_STATUS.DRAFT,
        createdBy: manager1.user._id,
    });

    // --- 9.7. Hóa đơn của Customer 7 (customer.dachot@housify.vn - P101 Tòa 2): PAID ---
    const invC7PaidData = makeStandardItems({
        rentPrice: 4500000,
        elecOld: 80,
        elecNew: 160,
        elecPrice: 4000,
        waterOld: 10,
        waterNew: 16,
        waterPrice: 28000,
        trashPrice: 50000,
        parkingQty: 2,
        parkingPrice: 120000,
    });
    const invC7Paid = await Invoice.create({
        invoiceCode: 'HD2611CG01',
        contractId: c7ActiveContract._id,
        month: currentMonth,
        items: invC7PaidData.items,
        totalAmount: invC7PaidData.totalAmount,
        status: INVOICE_STATUS.PAID,
        sentAt: daysFromNow(-8),
        dueDate: daysFromNow(-1),
        paidAt: daysFromNow(-4),
        qrContent: buildVietQrUrl(invC7PaidData.totalAmount, 'HD2611CG01'),
        createdBy: manager2.user._id,
    });
    await Payment.create({
        sepayTxnId: 'SEPAY_TXN_2611CG01',
        invoiceId: invC7Paid._id,
        amount: invC7PaidData.totalAmount,
        transferContent: 'NGUYEN TUAN HUNG thanh toan HD2611CG01',
        bankName: 'ACB',
        paidAt: daysFromNow(-4),
    });

    // --- 9.8. Hóa đơn chưa thanh toán trên HĐ ENDED của Customer 10 (customer.thuelai@housify.vn) để test Cảnh báo cấn trừ nợ khi Hoàn cọc ---
    const invC10UnpaidEndedData = makeStandardItems({
        rentPrice: 4100000,
        elecOld: 310,
        elecNew: 380,
        elecPrice: 4000,
        waterOld: 22,
        waterNew: 26,
        waterPrice: 28000,
        trashPrice: 50000,
        parkingQty: 1,
        parkingPrice: 120000,
    });
    await Invoice.create({
        invoiceCode: 'HD2610DEBT',
        contractId: c10OldEndedContract._id,
        month: prevMonth1,
        items: invC10UnpaidEndedData.items,
        totalAmount: invC10UnpaidEndedData.totalAmount,
        status: INVOICE_STATUS.PENDING, // Còn nợ chưa đóng -> khi Manager 2 mở HĐ cũ lên hoàn cọc sẽ hiện cảnh báo cấn trừ!
        sentAt: daysFromNow(-18),
        dueDate: daysFromNow(-11),
        qrContent: buildVietQrUrl(invC10UnpaidEndedData.totalAmount, 'HD2610DEBT'),
        createdBy: manager2.user._id,
    });

    // --- 9.9. Hóa đơn ở Tòa 3 Thanh Xuân (tx1Contract) ---
    const invTx1PaidData = makeStandardItems({
        rentPrice: 3800000,
        elecOld: 50,
        elecNew: 115,
        elecPrice: 3900,
        waterOld: 6,
        waterNew: 10,
        waterPrice: 26000,
        parkingQty: 1,
    });
    const invTx1Paid = await Invoice.create({
        invoiceCode: 'HD2611TX01',
        contractId: tx1Contract._id,
        month: currentMonth,
        items: invTx1PaidData.items,
        totalAmount: invTx1PaidData.totalAmount,
        status: INVOICE_STATUS.PAID,
        sentAt: daysFromNow(-9),
        dueDate: daysFromNow(-2),
        paidAt: daysFromNow(-5),
        qrContent: buildVietQrUrl(invTx1PaidData.totalAmount, 'HD2611TX01'),
        createdBy: manager3.user._id,
    });
    await Payment.create({
        sepayTxnId: 'SEPAY_TXN_2611TX01',
        invoiceId: invTx1Paid._id,
        amount: invTx1PaidData.totalAmount,
        transferContent: 'Thanh toan HD2611TX01 P101 Thanh Xuan',
        bankName: 'VPBank',
        paidAt: daysFromNow(-5),
    });

    // --- 9.10. Hóa đơn cho 2 Case Demo Quyết toán & Hoàn cọc (UC-45) tại Tòa 1 (Manager 1) ---
    // (a) P501 – Cọc 3.000.000đ, Nợ 5.000.000đ (2 hóa đơn: 3.500.000đ + 1.500.000đ -> thiếu 2.000.000đ)
    const invP501Month1Data = makeStandardItems({
        rentPrice: 3000000,
        elecOld: 100,
        elecNew: 150, // 50 * 3.800 = 190.000đ
        waterOld: 10,
        waterNew: 12, // 2 * 25.000 = 50.000đ
        wifiPrice: 100000,
        trashPrice: 40000,
        parkingQty: 1,
        parkingPrice: 100000,
        extraDesc: 'Phí vệ sinh định kỳ cuối tháng',
        extraAmount: 20000,
    }); // Tổng = 3.500.000đ
    await Invoice.create({
        invoiceCode: 'HD2610N501',
        contractId: refundDebtExceedContract._id,
        month: prevMonth1,
        items: invP501Month1Data.items,
        totalAmount: invP501Month1Data.totalAmount,
        status: INVOICE_STATUS.PENDING,
        sentAt: daysFromNow(-20),
        dueDate: daysFromNow(-13),
        qrContent: buildVietQrUrl(invP501Month1Data.totalAmount, 'HD2610N501'),
        createdBy: manager1.user._id,
    });

    await Invoice.create({
        invoiceCode: 'HD2611N501',
        contractId: refundDebtExceedContract._id,
        month: currentMonth,
        items: [
            {
                type: INVOICE_ITEM_TYPE.EXTRA,
                description: 'Bồi thường sửa chữa bàn giao phòng & điện nước lẻ cuối kỳ',
                quantity: 1,
                unitPrice: 1500000,
                amount: 1500000,
            },
        ],
        totalAmount: 1500000,
        status: INVOICE_STATUS.PENDING,
        sentAt: daysFromNow(-6),
        dueDate: daysFromNow(1),
        qrContent: buildVietQrUrl(1500000, 'HD2611N501'),
        createdBy: manager1.user._id,
    });

    // (b) P402 – Cọc 3.800.000đ, Nợ 1.800.000đ -> Thực hoàn 2.000.000đ
    await Invoice.create({
        invoiceCode: 'HD2611N402',
        contractId: refundOffsetPartialContract._id,
        month: currentMonth,
        items: [
            {
                type: INVOICE_ITEM_TYPE.RENT,
                description: 'Tiền thuê phòng nửa tháng cuối kỳ',
                quantity: 1,
                unitPrice: 1500000,
                amount: 1500000,
            },
            {
                type: INVOICE_ITEM_TYPE.EXTRA,
                description: 'Phí điện nước chốt công tơ bàn giao phòng',
                quantity: 1,
                unitPrice: 300000,
                amount: 300000,
            },
        ],
        totalAmount: 1800000,
        status: INVOICE_STATUS.PENDING,
        sentAt: daysFromNow(-5),
        dueDate: daysFromNow(2),
        qrContent: buildVietQrUrl(1800000, 'HD2611N402'),
        createdBy: manager1.user._id,
    });

    console.log('✔ [9/16] Đã tạo 15 Hóa đơn (bao gồm case Nợ 5tr > Cọc 3tr ở P501 và Nợ 1.8tr <= Cọc 3.8tr ở P402 Tòa 1) và 6 giao dịch SePay.');

    // =========================================================================
    // 10. INCIDENTS (Báo cáo sự cố đủ 4 loại & 4 trạng thái PENDING, IN_PROGRESS, RESOLVED, REJECTED)
    // =========================================================================
    const [inc1, inc2, inc3, inc4, inc5, inc6] = await Incident.insertMany([
        {
            incidentCode: 'SC26110001',
            contractId: c1ActiveContract._id,
            roomId: b1Rooms.P101._id,
            reportedBy: customerUsers[c1.cccd]._id,
            type: INCIDENT_TYPE.EQUIPMENT,
            title: 'Điều hòa phòng ngủ chính mát yếu và kêu to khi chạy ban đêm',
            description: 'Điều hòa Daikin 12000BTU bật 20 độ nhưng gió ra rất yếu, dàn lạnh có tiếng kêu rè rè và nhỏ nước nhẹ ở góc tường.',
            images: INCIDENT_IMAGES,
            status: INCIDENT_STATUS.PENDING,
        },
        {
            incidentCode: 'SC26110002',
            contractId: c1ActiveContract._id,
            roomId: b1Rooms.P101._id,
            reportedBy: customerUsers[c1.cccd]._id,
            type: INCIDENT_TYPE.SERVICE,
            title: 'Mạng Wifi 6 tầng 1 chập chờn vào khung giờ tối 20h–22h',
            description: 'Đèn LOS trên bộ phát phụ hành lang tầng 1 thỉnh thoảng nhấp nháy đỏ khiến kết nối học online bị gián đoạn.',
            images: [INCIDENT_IMAGES[1]],
            status: INCIDENT_STATUS.IN_PROGRESS,
            handledBy: manager1.user._id,
            resultNote: 'Quản lý đã liên hệ kỹ thuật viên FPT Telecom, hẹn 14h chiều nay xuống kiểm tra đầu cáp quang và cấu hình lại băng tần 5GHz.',
        },
        {
            incidentCode: 'SC26100003',
            contractId: c1ActiveContract._id,
            roomId: b1Rooms.P101._id,
            reportedBy: customerUsers[c1.cccd]._id,
            type: INCIDENT_TYPE.EQUIPMENT,
            title: 'Vòi xịt vệ sinh bị rò nước ở khớp nối dây',
            description: 'Khớp nối inox của vòi xịt bị rỉ nước liên tục gây ướt sàn nhà tắm.',
            images: [INCIDENT_IMAGES[0]],
            status: INCIDENT_STATUS.RESOLVED,
            handledBy: manager1.user._id,
            resultNote: 'Đã thay mới bộ dây vòi xịt Inax và gioăng cao su chống rò nước, kiểm tra áp lực nước ổn định.',
            resolvedAt: daysFromNow(-18),
        },
        {
            incidentCode: 'SC26110004',
            contractId: c2ActiveContract._id,
            roomId: b1Rooms.P102._id,
            reportedBy: customerUsers[c2.cccd]._id,
            type: INCIDENT_TYPE.VIOLATION,
            title: 'Phòng bên cạnh để giày dép và túi rác ngoài hành lang quá giờ quy định',
            description: 'Nhờ Quản lý nhắc nhở giúp để đảm bảo vệ sinh chung khu vực hành lang tầng 1.',
            images: [],
            status: INCIDENT_STATUS.RESOLVED,
            handledBy: manager1.user._id,
            resultNote: 'Quản lý đã trực tiếp kiểm tra và nhắc nhở phòng liên quan dọn dẹp sạch sẽ.',
            resolvedAt: daysFromNow(-3),
        },
        {
            incidentCode: 'SC26110005',
            contractId: c3ActiveContract._id,
            roomId: b1Rooms.P103._id,
            reportedBy: customerUsers[c3.cccd]._id,
            type: INCIDENT_TYPE.OTHER,
            title: 'Đề xuất khoan tường lắp thêm giá treo tivi 65 inch cá nhân',
            description: 'Em muốn tự khoan 4 mũi vít nở sắt vào tường vách ngăn để treo giá đỡ tivi xoay.',
            images: [],
            status: INCIDENT_STATUS.REJECTED,
            handledBy: manager1.user._id,
            resultNote: 'Từ chối yêu cầu: Tường vị trí đó có đường ống điện âm tường và theo điều 5 Nội quy không tự ý khoan đục kết cấu phòng. Bạn vui lòng dùng kệ tivi để bàn đã trang bị sẵn.',
        },
        {
            incidentCode: 'SC26110006',
            contractId: c7ActiveContract._id,
            roomId: b2Rooms.P101._id,
            reportedBy: customerUsers[c7.cccd]._id,
            type: INCIDENT_TYPE.EQUIPMENT,
            title: 'Bình nóng lạnh Ariston đèn báo sáng nhưng nước lâu nóng',
            description: 'Bật bình nóng lạnh trước 30 phút nhưng nước chỉ hơi ấm nhẹ.',
            images: [INCIDENT_IMAGES[0]],
            status: INCIDENT_STATUS.IN_PROGRESS,
            handledBy: manager2.user._id,
            resultNote: 'Thợ điện lạnh đang lên xả cặn bình và kiểm tra thanh đốt.',
        },
    ]);
    console.log('✔ [10/16] Đã tạo 6 Báo cáo sự cố (PENDING, IN_PROGRESS, RESOLVED, REJECTED).');

    // =========================================================================
    // 10b. DỮ LIỆU HÀNG LOẠT TÒA 4 (nhiều hợp đồng + 4 kỳ hóa đơn mỗi hợp đồng cho báo cáo, dashboard)
    // =========================================================================
    const B4_PRICES = { elecPrice: 4200, waterPrice: 30000, wifiPrice: 120000, trashPrice: 50000, parkingPrice: 150000 };
    const toYymm = (month) => `${month.slice(2, 4)}${month.slice(5, 7)}`;
    const historyMonths = [prevMonth3, prevMonth2, prevMonth1];
    const bulkBanks = ['MBBank', 'Vietcombank', 'Techcombank', 'TPBank', 'ACB', 'VPBank'];

    // 3 kỳ trước đã thanh toán (có kỳ trả trễ) + kỳ hiện tại theo kiểu: DRAFT | PENDING | QUÁ HẠN | PAID
    const addInvoiceHistory = async ({ contract, room, manager, seq, currentKind, repName }) => {
        let elecReading = 300 + seq * 40;
        let waterReading = 20 + seq * 3;
        const invoices = [];
        const months = [...historyMonths, currentMonth];
        for (let k = 0; k < months.length; k++) {
            const month = months[k];
            const elecOld = elecReading;
            const waterOld = waterReading;
            elecReading += 70 + ((seq + k) % 4) * 15;
            waterReading += 4 + ((seq + k) % 3);
            const data = makeStandardItems({
                rentPrice: contract.rentPrice,
                elecOld,
                elecNew: elecReading,
                waterOld,
                waterNew: waterReading,
                parkingQty: 1 + (seq % 2),
                ...B4_PRICES,
            });
            const invoiceCode = `${room.roomNumber}HD${toYymm(month)}D4${seq}${k}`;
            const isCurrent = k === months.length - 1;
            const kind = isCurrent ? currentKind : 'PAID';
            const monthsAgo = months.length - 1 - k;
            const sentAt = daysFromNow(-monthsAgo * 30 - 6, 9, 0);
            const dueDate = kind === 'OVERDUE' ? daysFromNow(-3, 23, 0) : new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
            const paidLate = !isCurrent && k === 2 && seq % 3 === 0;
            const paidAt = new Date(sentAt.getTime() + (paidLate ? 9 : 2 + (seq % 3)) * 24 * 60 * 60 * 1000);

            const invoice = await Invoice.create({
                invoiceCode,
                contractId: contract._id,
                month,
                items: data.items,
                totalAmount: data.totalAmount,
                status:
                    kind === 'DRAFT'
                        ? INVOICE_STATUS.DRAFT
                        : kind === 'PAID'
                          ? INVOICE_STATUS.PAID
                          : INVOICE_STATUS.PENDING,
                sentAt: kind === 'DRAFT' ? undefined : sentAt,
                dueDate: kind === 'DRAFT' ? undefined : dueDate,
                paidAt: kind === 'PAID' ? paidAt : undefined,
                qrContent: kind === 'DRAFT' ? undefined : buildVietQrUrl(data.totalAmount, invoiceCode),
                createdBy: manager.user._id,
            });
            if (kind === 'PAID') {
                await Payment.create({
                    sepayTxnId: `SEPAY_TXN_${invoiceCode}`,
                    invoiceId: invoice._id,
                    amount: data.totalAmount,
                    transferContent: `${repName} thanh toan ${invoiceCode}`,
                    bankName: bulkBanks[(seq + k) % bulkBanks.length],
                    paidAt,
                });
            }
            invoices.push(invoice);
        }
        return invoices;
    };

    const BULK_TENANTS = [
        { room: 'P102', name: 'Hà Thị Thu Trang', current: 'PENDING' },
        { room: 'P103', name: 'Cao Văn Đức Anh', current: 'OVERDUE' },
        { room: 'P202', name: 'Lục Minh Châu', current: 'PAID', roommate: 'Lục Minh Ngọc' },
        { room: 'P203', name: 'Tôn Nữ Bảo Ngọc', current: 'DRAFT', roommate: 'Tôn Thất Huy' },
        { room: 'P302', name: 'Quách Thành Danh', current: 'PENDING' },
        { room: 'P401', name: 'Thái Văn Khoa', current: 'OVERDUE', roommate: 'Thái Thị Mai' },
    ];
    const bulkContracts = [];
    for (let i = 0; i < BULK_TENANTS.length; i++) {
        const seq = i + 1;
        const tenant = BULK_TENANTS[i];
        const room = b4Rooms[tenant.room];
        const info = {
            email: `customer.dongda${seq}@housify.vn`,
            cccd: `03120600000${seq}`,
            name: tenant.name,
            phone: `098300000${seq}`,
            dob: `2003-0${(seq % 9) + 1}-1${seq}`,
            address: 'Đống Đa, Hà Nội',
        };
        customerUsers[info.cccd] = await User.create({
            email: info.email,
            password: customerHash,
            roleId: ROLE.CUSTOMER,
            status: USER_STATUS.ACTIVE,
        });
        const startDate = daysFromNow(-(130 + seq * 15));
        const contract = await Contract.create({
            roomId: room._id,
            contractType: tenant.roommate ? CONTRACT_TYPE.GROUP : CONTRACT_TYPE.SINGLE,
            representativeCccd: info.cccd,
            representativeEmail: info.email,
            startDate,
            endDate: endAfterMonths(startDate, 12),
            rentPrice: room.rentPrice,
            deposit: room.deposit,
            status: CONTRACT_STATUS.ACTIVE,
            activatedAt: startDate,
            notes: `Hợp đồng mẫu Tòa Đống Đa – hóa đơn kỳ hiện tại: ${tenant.current}.`,
            createdBy: manager4.user._id,
            depositReceiverId: manager4.user._id,
        });
        await createRepOccupant({ contractId: contract._id, customerInfo: info, status: OCCUPANT_STATUS.STAYED, joinDate: startDate });
        if (tenant.roommate) {
            await createRoommate({
                contractId: contract._id,
                name: tenant.roommate,
                phone: `098400000${seq}`,
                cccd: `03120690000${seq}`,
                relationship: 'Người thân',
                status: OCCUPANT_STATUS.STAYED,
                joinDate: startDate,
            });
        }
        await addInvoiceHistory({ contract, room, manager: manager4, seq, currentKind: tenant.current, repName: info.name });
        bulkContracts.push({ contract, room, info });
    }

    // Người sắp trả phòng ở Tòa 4 cũng có hóa đơn: A còn nợ kỳ hiện tại, W đã thanh toán đủ
    await addInvoiceHistory({ contract: ddTenantAContract, room: b4Rooms.P101, manager: manager4, seq: 7, currentKind: 'PENDING', repName: demoCustomers.ddTenantA.name });
    await addInvoiceHistory({ contract: ddMoverOldContract, room: b4Rooms.P201, manager: manager4, seq: 8, currentKind: 'PAID', repName: demoCustomers.ddMoverW.name });

    const incidentYymm = toYymm(currentMonth);
    await Incident.insertMany([
        {
            incidentCode: `SC${incidentYymm}D401`,
            contractId: bulkContracts[0].contract._id,
            roomId: bulkContracts[0].room._id,
            reportedBy: customerUsers[bulkContracts[0].info.cccd]._id,
            type: INCIDENT_TYPE.EQUIPMENT,
            title: 'Cửa sổ nhôm kính bị kẹt, không đóng kín được',
            description: 'Ray trượt cửa sổ bị cong khiến cửa không đóng khít, trời mưa nước hắt vào phòng.',
            images: [INCIDENT_IMAGES[0]],
            status: INCIDENT_STATUS.PENDING,
        },
        {
            incidentCode: `SC${incidentYymm}D402`,
            contractId: bulkContracts[2].contract._id,
            roomId: bulkContracts[2].room._id,
            reportedBy: customerUsers[bulkContracts[2].info.cccd]._id,
            type: INCIDENT_TYPE.SERVICE,
            title: 'Máy giặt chung tầng thượng báo lỗi E21 không xả nước',
            description: 'Máy giặt số 2 trên sân thượng báo lỗi E21, quần áo ngâm nước cả buổi tối.',
            images: [],
            status: INCIDENT_STATUS.IN_PROGRESS,
            handledBy: manager4.user._id,
            resultNote: 'Đã gọi bảo hành Electrolux, hẹn sáng mai kiểm tra bơm xả.',
        },
        {
            incidentCode: `SC${incidentYymm}D403`,
            contractId: bulkContracts[4].contract._id,
            roomId: bulkContracts[4].room._id,
            reportedBy: customerUsers[bulkContracts[4].info.cccd]._id,
            type: INCIDENT_TYPE.VIOLATION,
            title: 'Phòng tầng trên hát karaoke sau 23h',
            description: 'Liên tục 3 tối gần đây phòng phía trên mở loa hát karaoke đến 0h30.',
            images: [],
            status: INCIDENT_STATUS.RESOLVED,
            handledBy: manager4.user._id,
            resultNote: 'Đã lập biên bản nhắc nhở lần 1 với phòng liên quan, cư dân cam kết không tái phạm.',
            resolvedAt: daysFromNow(-2),
        },
        {
            incidentCode: `SC${incidentYymm}D404`,
            contractId: bulkContracts[5].contract._id,
            roomId: bulkContracts[5].room._id,
            reportedBy: customerUsers[bulkContracts[5].info.cccd]._id,
            type: INCIDENT_TYPE.OTHER,
            title: 'Xin lắp thêm bình nóng lạnh thứ hai cho phòng tắm phụ',
            description: 'Phòng Duplex có 2 phòng tắm nhưng chỉ phòng chính có bình nóng lạnh.',
            images: [],
            status: INCIDENT_STATUS.REJECTED,
            handledBy: manager4.user._id,
            resultNote: 'Từ chối: đường điện phòng tắm phụ không đủ tải cho bình nóng lạnh thứ hai.',
        },
    ]);

    console.log(`✔ [10b/16] Đã tạo dữ liệu hàng loạt Tòa 4: ${BULK_TENANTS.length + 2} hợp đồng ACTIVE x 4 kỳ hóa đơn, giao dịch SePay và 4 sự cố.`);

    // =========================================================================
    // 10c. HỢP ĐỒNG SẮP HẾT HẠN (≤ 1 tháng, chưa có hợp đồng nối tiếp, khách chưa ký phòng khác) + PHÒNG TRỐNG THÊM
    // Dùng để test: (1) Manager tạo hợp đồng nối tiếp cho khách mới ngay trên phòng sắp trống,
    //               (2) chính khách sắp hết hạn ký trước phòng trống khác (chuyển phòng) -> UPCOMING
    // =========================================================================
    const extraEmptyRooms = await Room.insertMany([
        createRoomDoc(building1._id, 5, 'P505', rtStudio._id, 28, 3450000, 3450000, ROOM_STATUS.AVAILABLE, 3),
        createRoomDoc(building1._id, 5, 'P506', rtTwin._id, 33, 3850000, 3850000, ROOM_STATUS.AVAILABLE, 0),
        createRoomDoc(building1._id, 3, 'P304', rtSingle._id, 22, 2950000, 2950000, ROOM_STATUS.AVAILABLE, 1),
        createRoomDoc(building2._id, 5, 'P503', rtStudio._id, 28, 4050000, 4050000, ROOM_STATUS.AVAILABLE, 2),
        createRoomDoc(building2._id, 3, 'P303', rtTwin._id, 34, 4600000, 4600000, ROOM_STATUS.AVAILABLE, 3),
        createRoomDoc(building3._id, 2, 'P203', rtStudio._id, 27, 3750000, 3750000, ROOM_STATUS.AVAILABLE, 0),
        createRoomDoc(building3._id, 3, 'P303', rtTwin._id, 32, 4150000, 4150000, ROOM_STATUS.AVAILABLE, 1),
        createRoomDoc(building4._id, 1, 'P104', rtSingle._id, 22, 3300000, 3300000, ROOM_STATUS.AVAILABLE, 2),
        createRoomDoc(building4._id, 3, 'P303', rtStudio._id, 26, 3900000, 3900000, ROOM_STATUS.AVAILABLE, 3),
        createRoomDoc(building4._id, 4, 'P404', rtTwin._id, 32, 4400000, 4400000, ROOM_STATUS.AVAILABLE, 0),
        createRoomDoc(building5._id, 1, 'P103', rtStudio._id, 26, 3600000, 3600000, ROOM_STATUS.AVAILABLE, 1),
        createRoomDoc(building5._id, 2, 'P202', rtSingle._id, 20, 2900000, 2900000, ROOM_STATUS.AVAILABLE, 2),
    ]);

    const EXPIRING_TENANTS = [
        { building: building1, manager: manager1, room: ['P404', 4, rtStudio, 28, 3400000], daysLeft: 6, months: 6, name: 'Vũ Thị Hồng Nhung' },
        { building: building2, manager: manager2, room: ['P502', 5, rtSingle, 24, 3800000], daysLeft: 11, months: 12, name: 'Kim Văn Hoàng' },
        { building: building3, manager: manager3, room: ['P302', 3, rtStudio, 28, 3800000], daysLeft: 17, months: 6, name: 'Mạc Thị Lan Anh' },
        { building: building4, manager: manager4, room: ['P403', 4, rtSingle, 22, 3300000], daysLeft: 22, months: 12, name: 'La Quốc Thịnh' },
        { building: building1, manager: manager1, room: ['P504', 5, rtTwin, 33, 3800000], daysLeft: 28, months: 12, name: 'Ninh Văn Tài', roommate: 'Ninh Thị Thu' },
    ];
    const expiringSummary = [];
    for (let i = 0; i < EXPIRING_TENANTS.length; i++) {
        const seq = i + 1;
        const tenant = EXPIRING_TENANTS[i];
        const [roomNumber, floorNumber, roomType, area, price] = tenant.room;
        const room = await Room.create(
            createRoomDoc(tenant.building._id, floorNumber, roomNumber, roomType._id, area, price, price, ROOM_STATUS.OCCUPIED, seq % 4),
        );
        const info = {
            email: `customer.saphethan${seq}@housify.vn`,
            cccd: `03120500004${seq}`,
            name: tenant.name,
            phone: `098500004${seq}`,
            dob: `2005-0${seq}-1${seq}`,
            address: 'Hà Nội',
        };
        customerUsers[info.cccd] = await User.create({
            email: info.email,
            password: customerHash,
            roleId: ROLE.CUSTOMER,
            status: USER_STATUS.ACTIVE,
        });
        // ngày kết thúc = hôm nay + daysLeft, thời hạn đúng 6 hoặc 12 tháng (trong khoảng 3..24)
        const startDate = daysFromNow(tenant.daysLeft + 1);
        startDate.setMonth(startDate.getMonth() - tenant.months);
        const contract = await Contract.create({
            roomId: room._id,
            contractType: tenant.roommate ? CONTRACT_TYPE.GROUP : CONTRACT_TYPE.SINGLE,
            representativeCccd: info.cccd,
            representativeEmail: info.email,
            startDate,
            endDate: endAfterMonths(startDate, tenant.months),
            rentPrice: room.rentPrice,
            deposit: room.deposit,
            status: CONTRACT_STATUS.ACTIVE,
            activatedAt: startDate,
            notes: `Hợp đồng sắp hết hạn (còn ${tenant.daysLeft} ngày), chưa có hợp đồng nối tiếp – dùng test đặt thuê nối tiếp / chuyển phòng.`,
            createdBy: tenant.manager.user._id,
            depositReceiverId: tenant.manager.user._id,
        });
        await createRepOccupant({ contractId: contract._id, customerInfo: info, status: OCCUPANT_STATUS.STAYED, joinDate: startDate });
        if (tenant.roommate) {
            await createRoommate({
                contractId: contract._id,
                name: tenant.roommate,
                phone: `098500005${seq}`,
                cccd: `03120500005${seq}`,
                dob: '2005-08-08',
                relationship: 'Người thân',
                joinDate: startDate,
            });
        }
        expiringSummary.push({ ...info, roomNumber, buildingName: tenant.building.name, daysLeft: tenant.daysLeft });
    }

    console.log(`✔ [10c/16] Đã tạo ${EXPIRING_TENANTS.length} hợp đồng sắp hết hạn (chưa có nối tiếp) và ${extraEmptyRooms.length} phòng trống thêm ở 5 tòa.`);

    // =========================================================================
    // 11. NOTIFICATIONS (Thông báo chuông & Thông báo chung ANNOUNCEMENT)
    // =========================================================================
    const notificationsToInsert = [
        // Thông báo cho Admin
        {
            userId: adminUser._id,
            type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
            title: 'Yêu cầu duyệt chấm dứt hợp đồng đơn phương',
            message: 'Quản lý tòa Housify Hòa Lạc Plaza vừa gửi đơn đề nghị chấm dứt hợp đồng đơn phương đối với phòng P203. Vui lòng kiểm tra và phê duyệt.',
            refId: termUnilateralPendingC6._id,
            isRead: false,
            createdBy: manager1.user._id,
        },
        {
            userId: adminUser._id,
            type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
            title: 'Thanh toán hóa đơn thành công (HD2611CG01)',
            message: `Đã nhận ${invC7Paid.totalAmount.toLocaleString('vi-VN')} VNĐ từ giao dịch SePay cho hóa đơn HD2611CG01 (Phòng P101 – Housify Cầu Giấy Center).`,
            refId: invC7Paid._id,
            isRead: false,
        },
        {
            userId: adminUser._id,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: '[Cảnh báo SePay] Khách chuyển thiếu tiền hóa đơn HD2611UNDR',
            message: `Phòng P102 (Tòa Hòa Lạc Plaza) vừa chuyển ${underpaidAmount.toLocaleString('vi-VN')} VNĐ / ${invC2Underpaid.totalAmount.toLocaleString('vi-VN')} VNĐ (còn thiếu ${(invC2Underpaid.totalAmount - underpaidAmount).toLocaleString('vi-VN')} VNĐ).`,
            refId: invC2Underpaid._id,
            isRead: false,
        },
        {
            userId: adminUser._id,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: '[Cảnh báo SePay] Khách chuyển thừa tiền hóa đơn HD2611OVER',
            message: `Phòng P103 (Tòa Hòa Lạc Plaza) vừa chuyển ${overpaidAmount.toLocaleString('vi-VN')} VNĐ / ${invC3Overpaid.totalAmount.toLocaleString('vi-VN')} VNĐ (chuyển dư ${(overpaidAmount - invC3Overpaid.totalAmount).toLocaleString('vi-VN')} VNĐ).`,
            refId: invC3Overpaid._id,
            isRead: false,
        },

        // Thông báo cho Manager 1 (khiconst4@gmail.com)
        {
            userId: manager1.user._id,
            type: NOTIFICATION_TYPE.MANAGER_ASSIGNED,
            title: 'Phân công phụ trách tòa nhà',
            message: 'Admin đã phân công bạn quản lý tòa nhà Housify Hòa Lạc Plaza.',
            refId: building1._id,
            isRead: true,
            createdBy: adminUser._id,
        },
        {
            userId: manager1.user._id,
            type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
            title: 'Báo cáo sự cố mới từ phòng P101 (SC26110001)',
            message: 'Cư dân Nguyễn Bình An vừa gửi báo cáo sự cố thiết bị: "Điều hòa phòng ngủ chính mát yếu và kêu to khi chạy ban đêm".',
            refId: inc1._id,
            isRead: false,
            createdBy: customerUsers[c1.cccd]._id,
        },
        {
            userId: manager1.user._id,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: 'Khách chuyển thiếu tiền hóa đơn HD2611UNDR (P102)',
            message: `Giao dịch SePay ghi nhận ${underpaidAmount.toLocaleString('vi-VN')} VNĐ cho hóa đơn HD2611UNDR (tổng ${invC2Underpaid.totalAmount.toLocaleString('vi-VN')} VNĐ). Hóa đơn vẫn ở trạng thái PENDING chờ thu bổ sung.`,
            refId: invC2Underpaid._id,
            isRead: false,
        },
        {
            userId: manager1.user._id,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: 'Khách chuyển thừa tiền hóa đơn HD2611OVER (P103)',
            message: `Giao dịch SePay ghi nhận ${overpaidAmount.toLocaleString('vi-VN')} VNĐ cho hóa đơn HD2611OVER (tổng ${invC3Overpaid.totalAmount.toLocaleString('vi-VN')} VNĐ). Vui lòng liên hệ cư dân đối soát phần tiền dư.`,
            refId: invC3Overpaid._id,
            isRead: false,
        },

        // Thông báo cho Manager 2 (khiconst20092004@gmail.com)
        {
            userId: manager2.user._id,
            type: NOTIFICATION_TYPE.MANAGER_ASSIGNED,
            title: 'Phân công phụ trách tòa nhà',
            message: 'Admin đã phân công bạn quản lý tòa nhà Housify Cầu Giấy Center.',
            refId: building2._id,
            isRead: true,
            createdBy: adminUser._id,
        },
        {
            userId: manager2.user._id,
            type: NOTIFICATION_TYPE.TERMINATION_CONFIRMED,
            title: 'Khách hàng đã xác nhận điện tử đơn chấm dứt hợp đồng (P101)',
            message: 'Người đại diện Nguyễn Tuấn Hưng (P101) đã xác nhận điện tử đơn chấm dứt hợp đồng thỏa thuận.',
            refId: c7ActiveContract._id,
            isRead: false,
            createdBy: customerUsers[c7.cccd]._id,
        },
        {
            userId: manager2.user._id,
            type: NOTIFICATION_TYPE.CONTRACT_ENDED,
            title: 'Hợp đồng phòng P102 đã hết hạn – chờ hoàn cọc',
            message: 'Hợp đồng phòng P102 (Đại diện: Đinh Quốc Bảo) đã kết thúc tự nhiên. Vui lòng kiểm tra công nợ và ghi nhận hoàn cọc.',
            refId: c8EndedRecentContract._id,
            isRead: false,
        },

        // Thông báo cho Customer 1 (annbhe182167@fpt.edu.vn)
        {
            userId: customerUsers[c1.cccd]._id,
            type: NOTIFICATION_TYPE.INVOICE_SENT,
            title: `Hóa đơn tiền phòng kỳ ${currentMonth} (HD2611P101)`,
            message: `Quản lý tòa nhà đã phát hành hóa đơn HD2611P101 với tổng số tiền ${invC1PendingSoon.totalAmount.toLocaleString('vi-VN')} VNĐ. Vui lòng quét mã VietQR để thanh toán đúng hạn.`,
            refId: invC1PendingSoon._id,
            isRead: false,
            createdBy: manager1.user._id,
        },
        {
            userId: customerUsers[c1.cccd]._id,
            type: NOTIFICATION_TYPE.INCIDENT_UPDATE,
            title: 'Cập nhật xử lý sự cố SC26110002',
            message: 'Sự cố "Mạng Wifi 6 tầng 1 chập chờn" đã được Quản lý tiếp nhận (Đang xử lý).',
            refId: inc2._id,
            isRead: false,
            createdBy: manager1.user._id,
        },
        {
            userId: customerUsers[c1.cccd]._id,
            type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
            title: 'Thanh toán thành công hóa đơn HD2610P101',
            message: `Hệ thống đã ghi nhận thanh toán thành công ${invC1PaidLate.totalAmount.toLocaleString('vi-VN')} VNĐ cho hóa đơn HD2610P101.`,
            refId: invC1PaidLate._id,
            isRead: true,
        },
        {
            userId: customerUsers[c1.cccd]._id,
            type: NOTIFICATION_TYPE.DEPOSIT_REFUNDED,
            title: 'Đã hoàn trả tiền đặt cọc hợp đồng cũ',
            message: 'Quản lý tòa nhà đã ghi nhận hoàn trả 3.800.000 VNĐ tiền đặt cọc của hợp đồng cũ.',
            refId: c1OldContract1._id,
            isRead: true,
            createdBy: manager1.user._id,
        },

        // Thông báo cho Customer 2 (customer.thieutien@housify.vn - chuyển thiếu)
        {
            userId: customerUsers[c2.cccd]._id,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: 'Thông báo chuyển khoản chưa đủ số tiền (HD2611UNDR)',
            message: `Hệ thống nhận được ${underpaidAmount.toLocaleString('vi-VN')} VNĐ cho hóa đơn HD2611UNDR (tổng cần thanh toán: ${invC2Underpaid.totalAmount.toLocaleString('vi-VN')} VNĐ). Bạn còn thiếu ${(invC2Underpaid.totalAmount - underpaidAmount).toLocaleString('vi-VN')} VNĐ, vui lòng liên hệ Quản lý tòa nhà hoặc chuyển bổ sung.`,
            refId: invC2Underpaid._id,
            isRead: false,
        },

        // Thông báo cho Customer 3 (customer.thuatien@housify.vn - chuyển thừa & hủy hóa đơn)
        {
            userId: customerUsers[c3.cccd]._id,
            type: NOTIFICATION_TYPE.INVOICE_CANCELLED,
            title: 'Hủy hóa đơn HD2611CANC do sai sót chỉ số',
            message: 'Hóa đơn HD2611CANC đã được Quản lý hủy để lập lại hóa đơn đúng chỉ số điện.',
            refId: invC3Overpaid._id,
            isRead: true,
            createdBy: manager1.user._id,
        },
        {
            userId: customerUsers[c3.cccd]._id,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: 'Thông báo chuyển khoản dư số tiền (HD2611OVER)',
            message: `Hệ thống ghi nhận bạn đã chuyển ${overpaidAmount.toLocaleString('vi-VN')} VNĐ cho hóa đơn HD2611OVER (số tiền trên hóa đơn: ${invC3Overpaid.totalAmount.toLocaleString('vi-VN')} VNĐ, dư ${(overpaidAmount - invC3Overpaid.totalAmount).toLocaleString('vi-VN')} VNĐ). Vui lòng liên hệ Quản lý để đối soát và gạch nợ.`,
            refId: invC3Overpaid._id,
            isRead: false,
        },

        // Thông báo cho Customer 4 (nguyenan182167@gmail.com - quá hạn & đến hạn hôm nay)
        {
            userId: customerUsers[c4.cccd]._id,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: '[Quá hạn] Nhắc thanh toán hóa đơn HD2610OVDU',
            message: `Hóa đơn HD2610OVDU (${invC4Overdue.totalAmount.toLocaleString('vi-VN')} VNĐ) đã quá hạn thanh toán 05 ngày. Vui lòng thanh toán ngay để tránh phát sinh vi phạm hợp đồng.`,
            refId: invC4Overdue._id,
            isRead: false,
        },
        {
            userId: customerUsers[c4.cccd]._id,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: '[Hạn cuối hôm nay] Nhắc thanh toán hóa đơn HD2611TOD0',
            message: `Hóa đơn HD2611TOD0 (${invC4DueToday.totalAmount.toLocaleString('vi-VN')} VNĐ) đến hạn thanh toán trong ngày hôm nay.`,
            refId: invC4DueToday._id,
            isRead: false,
        },

        // Thông báo cho Customer 5 (cocainit123788@gmail.com - đơn chấm dứt MUTUAL PENDING)
        {
            userId: customerUsers[c5.cccd]._id,
            type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
            title: 'Yêu cầu xác nhận điện tử đơn chấm dứt hợp đồng (P202)',
            message: 'Quản lý tòa nhà vừa gửi đơn chấm dứt hợp đồng thỏa thuận. Vui lòng mở chi tiết hợp đồng và bấm "Xác nhận điện tử" trong vòng 07 ngày.',
            refId: termMutualPendingC5._id,
            isRead: false,
            createdBy: manager1.user._id,
        },
        {
            userId: customerUsers[c5.cccd]._id,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: 'Nhắc thanh toán hóa đơn HD2611DUE1 (Còn 1 ngày)',
            message: `Hóa đơn HD2611DUE1 (${invC5Due1Day.totalAmount.toLocaleString('vi-VN')} VNĐ) sẽ đến hạn vào ngày mai.`,
            refId: invC5Due1Day._id,
            isRead: false,
        },

        // Khách UPCOMING đổi ý: Manager 2 đã lập đơn hủy theo thỏa thuận, chờ khách xác nhận
        {
            userId: customerUsers[demoCustomers.changeMind.cccd]._id,
            type: NOTIFICATION_TYPE.TERMINATION_REQUEST,
            title: 'Yêu cầu xác nhận hủy hợp đồng sắp hiệu lực (P402)',
            message: 'Quản lý tòa nhà đã lập đơn hủy hợp đồng sắp hiệu lực phòng P402 theo thỏa thuận. Xác nhận đơn thì hợp đồng chuyển Đã hủy và bạn không được hoàn cọc.',
            refId: termChangeMind._id,
            isRead: false,
            createdBy: manager2.user._id,
        },
        {
            userId: customerUsers[r3.cccd]._id,
            type: NOTIFICATION_TYPE.ANNOUNCEMENT,
            title: 'Hợp đồng phòng P303 đang Sắp hiệu lực',
            message: 'Bạn đã ký hợp đồng thuê phòng P303 – Housify Hòa Lạc Plaza. Hợp đồng tự chuyển Đang hiệu lực khi phòng được bàn giao.',
            refId: r3UpcomingContract._id,
            isRead: false,
            createdBy: manager1.user._id,
        },
    ];

    // Tạo thêm Thông báo chung (ANNOUNCEMENT) từ Manager 1 gửi cho toàn bộ cư dân đại diện đang ở Tòa 1
    const building1RepUsers = [c1, c2, c3, c4, c5, c6].map((c) => customerUsers[c.cccd]);
    for (const repUser of building1RepUsers) {
        notificationsToInsert.push(
            {
                userId: repUser._id,
                type: NOTIFICATION_TYPE.ANNOUNCEMENT,
                title: 'Lịch bảo trì định kỳ hệ thống thang máy & PCCC Tòa Hòa Lạc Plaza',
                message: 'Ban quản lý thông báo: Từ 09:00 đến 11:00 sáng Thứ Bảy tuần này, đội kỹ thuật sẽ tiến hành bảo trì định kỳ thang máy và kiểm tra chuông báo cháy toàn tòa nhà. Mong quý cư dân thông cảm!',
                isRead: false,
                createdBy: manager1.user._id,
            },
            {
                userId: repUser._id,
                type: NOTIFICATION_TYPE.ANNOUNCEMENT,
                title: 'Thông báo phun thuốc diệt muỗi & vệ sinh bể nước ngầm',
                message: 'Ban quản lý đã hoàn tất vệ sinh bể nước sạch và phun thuốc phòng dịch sốt xuất huyết tại khu vực tầng 1 và hành lang các tầng.',
                isRead: true,
                createdBy: manager1.user._id,
            },
        );
    }

    await Notification.insertMany(notificationsToInsert);
    console.log(`✔ [11/16] Đã tạo ${notificationsToInsert.length} Thông báo chuông & Thông báo chung tòa nhà (ANNOUNCEMENT).`);

    // =========================================================================
    // 12. AUDIT LOGS (Đầy đủ nhật ký hệ thống cho Admin & Manager kiểm tra)
    // =========================================================================
    await AuditLog.insertMany([
        {
            actorId: adminUser._id,
            action: AUDIT_ACTION.ASSIGN_MANAGER,
            targetType: 'buildings',
            targetId: building1._id,
            metadata: { managerId: manager1.user._id, buildingName: building1.name },
        },
        {
            actorId: adminUser._id,
            action: AUDIT_ACTION.ASSIGN_MANAGER,
            targetType: 'buildings',
            targetId: building2._id,
            metadata: { managerId: manager2.user._id, buildingName: building2.name },
        },
        {
            actorId: adminUser._id,
            action: AUDIT_ACTION.ASSIGN_MANAGER,
            targetType: 'buildings',
            targetId: building3._id,
            metadata: { managerId: manager3.user._id, buildingName: building3.name },
        },
        {
            actorId: adminUser._id,
            action: AUDIT_ACTION.DEACTIVATE_USER,
            targetType: 'users',
            targetId: managerLocked1.user._id,
            reason: 'Manager xin nghỉ phép dài hạn 06 tháng nên tạm khóa quyền truy cập.',
            metadata: { before: { status: USER_STATUS.ACTIVE }, after: { status: USER_STATUS.INACTIVE } },
        },
        {
            actorId: manager1.user._id,
            action: AUDIT_ACTION.ADD_OCCUPANT,
            targetType: 'occupants',
            targetId: c1ActiveContract._id,
            metadata: { roomNumber: 'P101', occupantName: 'Lê Minh Khang', cccd: '031204900003' },
        },
        {
            actorId: manager1.user._id,
            action: AUDIT_ACTION.REMOVE_OCCUPANT,
            targetType: 'occupants',
            targetId: c1ActiveContract._id,
            metadata: { roomNumber: 'P101', occupantName: 'Trần Quốc Tuấn (Đã chuyển ra)', exitDate: daysFromNow(-65) },
        },
        {
            actorId: manager1.user._id,
            action: AUDIT_ACTION.UPDATE_CONTRACT,
            targetType: 'contracts',
            targetId: cancelledDraftContract._id,
            reason: 'Khách báo hủy hợp đồng nháp trước khi kích hoạt.',
            metadata: { before: { status: CONTRACT_STATUS.DRAFT }, after: { status: CONTRACT_STATUS.CANCELLED } },
        },
        {
            // Hệ thống tự ghi nhận khi khách chuyển thiếu qua SePay
            action: AUDIT_ACTION.PAYMENT_UNDERPAID,
            targetType: 'invoices',
            targetId: invC2Underpaid._id,
            reason: 'Khách chuyển thiếu tiền hóa đơn qua SePay',
            metadata: {
                invoiceCode: invC2Underpaid.invoiceCode,
                sepayTxnId: 'SEPAY_TXN_UNDERPAID_01',
                expectedAmount: invC2Underpaid.totalAmount,
                receivedAmount: underpaidAmount,
                shortageAmount: invC2Underpaid.totalAmount - underpaidAmount,
                bankName: 'MBBank',
            },
        },
        {
            // Hệ thống tự ghi nhận khi khách chuyển thừa qua SePay
            action: AUDIT_ACTION.PAYMENT_OVERPAID,
            targetType: 'invoices',
            targetId: invC3Overpaid._id,
            reason: 'Khách chuyển thừa tiền hóa đơn qua SePay',
            metadata: {
                invoiceCode: invC3Overpaid.invoiceCode,
                sepayTxnId: 'SEPAY_TXN_OVERPAID_01',
                expectedAmount: invC3Overpaid.totalAmount,
                receivedAmount: overpaidAmount,
                excessAmount: overpaidAmount - invC3Overpaid.totalAmount,
                bankName: 'BIDV',
            },
        },
        {
            // Hệ thống tự khóa tài khoản sau 24h chấm dứt đơn phương
            action: AUDIT_ACTION.LOCK_USER,
            targetType: 'users',
            targetId: customerUsers[demoCustomers.locked1.cccd]._id,
            reason: 'Tự động khóa tài khoản sau 24h kể từ khi chấm dứt hợp đồng đơn phương',
            metadata: {
                contractId: lockedContract1._id,
                before: { status: USER_STATUS.ACTIVE },
                after: { status: USER_STATUS.LOCKED },
            },
        },
        {
            action: AUDIT_ACTION.LOCK_USER,
            targetType: 'users',
            targetId: customerUsers[demoCustomers.locked2.cccd]._id,
            reason: 'Tự động khóa tài khoản sau 24h kể từ khi chấm dứt hợp đồng đơn phương',
            metadata: {
                contractId: lockedContract2._id,
                before: { status: USER_STATUS.ACTIVE },
                after: { status: USER_STATUS.LOCKED },
            },
        },
        {
            action: AUDIT_ACTION.DEACTIVATE_USER,
            targetType: 'users',
            targetId: customerUsers[c10.cccd]._id,
            reason: 'Tự động ngưng hoạt động tài khoản sau 24h kể từ khi hợp đồng kết thúc',
            metadata: {
                contractId: c10OldEndedContract._id,
                before: { status: USER_STATUS.ACTIVE },
                after: { status: USER_STATUS.INACTIVE },
            },
        },
        {
            actorId: customerUsers[demoCustomers.cancelledUpcoming.cccd]._id,
            action: AUDIT_ACTION.UPDATE_CONTRACT,
            targetType: 'contracts',
            targetId: cancelledUpcomingContract._id,
            reason: 'Khách xác nhận đơn hủy hợp đồng sắp hiệu lực theo thỏa thuận (mất cọc)',
            metadata: { before: { status: CONTRACT_STATUS.UPCOMING }, after: { status: CONTRACT_STATUS.CANCELLED } },
        },
        {
            action: AUDIT_ACTION.DEACTIVATE_USER,
            targetType: 'users',
            targetId: customerUsers[demoCustomers.cancelledUpcoming.cccd]._id,
            reason: 'Tự động ngưng hoạt động tài khoản sau 24h kể từ khi hủy hợp đồng sắp hiệu lực',
            metadata: {
                contractId: cancelledUpcomingContract._id,
                before: { status: USER_STATUS.ACTIVE },
                after: { status: USER_STATUS.INACTIVE },
            },
        },
    ]);
    console.log('✔ [12/16] Đã tạo 14 bản ghi Nhật ký hệ thống (AuditLog) đầy đủ các action.');

    // =========================================================================
    // IN BẢNG TỔNG HỢP TÀI KHOẢN & LINK KÍCH HOẠT RA CONSOLE
    // =========================================================================
    const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
    console.log('\n============================================================');
    console.log('🎉 SEED DỮ LIỆU HOÀN TẤT 100%! DƯỚI ĐÂY LÀ THÔNG TIN ĐĂNG NHẬP:');
    console.log('============================================================');
    console.log(`\n👑 [ADMIN] (Đăng nhập bằng Email + Mật khẩu)`);
    console.log(`   - Email    : ${ADMIN_EMAIL}`);
    console.log(`   - Mật khẩu : ${ADMIN_PASS}`);

    console.log(`\n🏢 [MANAGER] (Đăng nhập bằng Email + Mật khẩu chung: ${MANAGER_PASS})`);
    console.log(`   1. Manager 1 – Tòa Hòa Lạc Plaza   [EMAIL THẬT] : ${MANAGER1_EMAIL}`);
    console.log(`   2. Manager 2 – Tòa Cầu Giấy Center [EMAIL THẬT] : ${MANAGER2_EMAIL}`);
    console.log(`   3. Manager 3 – Tòa Thanh Xuân                    : ${MANAGER3_EMAIL}`);
    console.log(`   4. Manager 4 – Tòa Đống Đa Boutique              : ${MANAGER4_EMAIL}`);
    console.log(`   5. Tòa Hà Đông Garden CHƯA có Manager (test gán Manager)`);
    console.log(`   6. Manager rảnh (Chưa gán tòa)       : manager.free1@housify.vn .. manager.free3@housify.vn`);
    console.log(`   7. Manager chờ kích hoạt (PENDING)   : manager.pending1@housify.vn .. manager.pending3@housify.vn`);
    console.log(`   8. Manager đã khóa (INACTIVE)        : manager.locked1@housify.vn .. manager.locked3@housify.vn`);

    console.log(`\n🧑‍🎓 [CUSTOMER CHÍNH] (Đăng nhập bằng Số CCCD + Mật khẩu chung: ${CUSTOMER_PASS})`);
    for (const c of REAL_CUSTOMERS) {
        console.log(`   • CCCD: ${c.cccd} | ${c.email.padEnd(34)} | ${c.name} -> ${c.note}`);
    }

    console.log(`\n⏳ [CASE ĐẶT THUÊ NỐI TIẾP – UPCOMING] (Mật khẩu ${CUSTOMER_PASS})`);
    console.log(`   - ${demoCustomers.expirySuccessor.cccd} (${demoCustomers.expirySuccessor.email}): UPCOMING P203 Tòa 2 sau HĐ hết hạn hôm qua -> POST /api/dev/jobs/contractExpiry/run`);
    console.log(`   - ${demoCustomers.changeMind.cccd} (${demoCustomers.changeMind.email}): UPCOMING P402 Tòa 2 có đơn hủy MUTUAL PENDING -> khách xác nhận là Đã hủy, mất cọc`);
    console.log(`   - ${demoCustomers.cgP402Tenant.cccd} (${demoCustomers.cgP402Tenant.email}): ACTIVE P402 Tòa 2 còn 20 ngày, đã có HĐ nối tiếp -> Gia hạn bị chặn`);
    console.log(`   - ${demoCustomers.cancelledUpcoming.cccd} (${demoCustomers.cancelledUpcoming.email}): UPCOMING đã hủy (CANCELLED) -> tài khoản INACTIVE, không đăng nhập được`);
    console.log(`   - ${demoCustomers.ddMoverW.cccd} (${demoCustomers.ddMoverW.email}): ACTIVE P201 Tòa 4 (12 ngày) + UPCOMING P101 Tòa 4 chờ cả 2 HĐ kết thúc`);
    console.log(`   - ${REAL_CUSTOMERS[5].cccd} (${REAL_CUSTOMERS[5].email}): Đơn đơn phương PENDING + UPCOMING P501 -> Admin duyệt là UPCOMING tự hủy (hoàn cọc)`);
    console.log(`   - Phòng nhận đặt nối tiếp ngay (còn <= 1 tháng, chưa có HĐ chờ): P201 Tòa 1 (Manager 1)`);

    console.log(`\n📅 [HỢP ĐỒNG SẮP HẾT HẠN – CHƯA CÓ NỐI TIẾP] (Mật khẩu ${CUSTOMER_PASS}) – test đặt thuê nối tiếp / khách ký trước phòng khác`);
    for (const t of expiringSummary) {
        console.log(`   - CCCD ${t.cccd} (${t.email}) ${t.name}: ${t.roomNumber} ${t.buildingName} còn ${t.daysLeft} ngày`);
    }

    console.log(`\n📦 [DỮ LIỆU HÀNG LOẠT TÒA 4] customer.dongda1..6@housify.vn (CCCD 031206000001..06) – 4 kỳ hóa đơn mỗi HĐ`);
    console.log(`🔒 [KHÁCH BỊ KHÓA] CCCD ${demoCustomers.locked1.cccd}, ${demoCustomers.locked2.cccd} -> tạo HĐ mới bằng CCCD này sẽ bị chặn`);

    console.log(`\n🔗 [LINK KÍCH HOẠT NHANH ĐỂ TEST TRỰC TIẾP TRÊN TRÌNH DUYỆT]:`);
    console.log(`   - HĐ Nháp mới P301 Tòa 1 (${REAL_CUSTOMERS[8].email} - CCCD ${REAL_CUSTOMERS[8].cccd}):`);
    console.log(`     ${clientUrl}/activate/contract/${c9InviteToken.token}`);
    console.log(`   - HĐ Thuê lại P202 Tòa 2 (${REAL_CUSTOMERS[9].email} - CCCD ${REAL_CUSTOMERS[9].cccd}):`);
    console.log(`     ${clientUrl}/activate/contract/${c10InviteToken.token}`);
    console.log(`   - HĐ NỐI TIẾP P101 Tòa 3 (${draftSuccessorCustomer.email} - CCCD ${draftSuccessorCustomer.cccd}) -> kích hoạt xong thành UPCOMING:`);
    console.log(`     ${clientUrl}/activate/contract/${draftSuccessorToken.token}`);
    console.log(`   - Kích hoạt Manager PENDING (manager.pending1@housify.vn):`);
    console.log(`     ${clientUrl}/activate/manager/${mgrToken1.token}`);
    console.log(`\n💰 [DEMO QUYẾT TOÁN & HOÀN CỌC UC-45 (Đăng nhập Manager 1: ${MANAGER1_EMAIL})]:`);
    console.log(`   - P501 Tòa 1 (Nợ > Cọc): Cọc 3.000.000đ | Nợ 5.000.000đ (HD2610N501 + HD2611N501) -> Thiếu 2.000.000đ (Khóa nút)`);
    console.log(`   - P402 Tòa 1 (Nợ <= Cọc): Cọc 3.800.000đ | Nợ 1.800.000đ (HD2611N402) -> Thực hoàn 2.000.000đ`);
    console.log('============================================================\n');

    await CLOSE_DB();
}

seed().catch(async (err) => {
    console.error('❌ Lỗi khi chạy seed:', err);
    await CLOSE_DB();
    process.exit(1);
});
