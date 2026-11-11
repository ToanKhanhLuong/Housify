import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { CONNECT_DB } from '../config/db.js';
import Contract from '../models/Contract.js';
import Room from '../models/Room.js';
import Occupant from '../models/Occupant.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import {
    CONTRACT_STATUS,
    CONTRACT_TYPE,
    INVOICE_ITEM_TYPE,
    INVOICE_STATUS,
    NOTIFICATION_TYPE,
    OCCUPANT_STATUS,
    ROLE,
    USER_STATUS,
} from '../constants/enums.js';

async function seedRefundContracts() {
    await CONNECT_DB();
    console.log('Connected to DB.');

    const managerId = new mongoose.Types.ObjectId('6adf197dd032acc78c0554ba'); // Quản lý Test
    const room202 = await Room.findById('6ae7002d48595e4957d0d68e'); // Room 202
    const room205 = await Room.findById('6ae7002d48595e4957d0d691'); // Room 205

    if (!room202 || !room205) {
        throw new Error('Room 202 or 205 not found!');
    }

    const hashedPassword = await bcrypt.hash('12345678', 10);

    // ==========================================
    // 1. Case 1: Phòng 202 - Hoàn cọc sạch sẽ (Không nợ hóa đơn)
    // ==========================================
    await User.deleteMany({ email: 'an.tran@example.com' });
    await Occupant.deleteMany({ cccd: '031200111222' });
    await Contract.deleteMany({ representativeCccd: '031200111222' });

    const user1 = await User.create({
        email: 'an.tran@example.com',
        password: hashedPassword,
        roleId: ROLE.CUSTOMER,
        status: USER_STATUS.INACTIVE,
    });

    const contract1 = await Contract.create({
        roomId: room202._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: '031200111222',
        representativeEmail: 'an.tran@example.com',
        startDate: new Date('2025-11-01T00:00:00Z'),
        endDate: new Date('2026-10-31T23:59:59Z'),
        rentPrice: room202.rentPrice,
        deposit: room202.deposit,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: new Date('2025-11-01T08:00:00Z'),
        notes: 'Hợp đồng hết hạn đúng hạn - đã bàn giao phòng - đủ điều kiện hoàn cọc',
        createdBy: managerId,
        depositReceiverId: managerId,
    });

    await Occupant.create({
        contractId: contract1._id,
        userId: user1._id,
        isRepresentative: true,
        name: 'Trần Văn An',
        phone: '0912111222',
        dateOfBirth: new Date('2002-05-15'),
        address: 'Nam Định',
        cccd: '031200111222',
        status: OCCUPANT_STATUS.LEFT,
        joinDate: new Date('2025-11-01'),
        exitDate: new Date('2026-10-31'),
    });

    console.log(`✅ Case 1 created: Contract ${contract1._id} for Room 202 (Deposit: ${contract1.deposit.toLocaleString()} đ)`);

    // ==========================================
    // 2. Case 2: Phòng 205 - Hoàn cọc CÓ CẢNH BÁO NỢ (Còn hóa đơn PENDING)
    // ==========================================
    await User.deleteMany({ email: 'bich.le@example.com' });
    await Occupant.deleteMany({ cccd: '031200333444' });
    await Contract.deleteMany({ representativeCccd: '031200333444' });

    const user2 = await User.create({
        email: 'bich.le@example.com',
        password: hashedPassword,
        roleId: ROLE.CUSTOMER,
        status: USER_STATUS.INACTIVE,
    });

    const contract2 = await Contract.create({
        roomId: room205._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd: '031200333444',
        representativeEmail: 'bich.le@example.com',
        startDate: new Date('2025-11-01T00:00:00Z'),
        endDate: new Date('2026-10-31T23:59:59Z'),
        rentPrice: room205.rentPrice,
        deposit: room205.deposit,
        status: CONTRACT_STATUS.ENDED,
        activatedAt: new Date('2025-11-01T08:00:00Z'),
        notes: 'Hợp đồng hết hạn đúng hạn - có hóa đơn dịch vụ tháng cuối chưa thanh toán',
        createdBy: managerId,
        depositReceiverId: managerId,
    });

    await Occupant.create({
        contractId: contract2._id,
        userId: user2._id,
        isRepresentative: true,
        name: 'Lê Thị Bích',
        phone: '0912333444',
        dateOfBirth: new Date('2003-08-20'),
        address: 'Hải Dương',
        cccd: '031200333444',
        status: OCCUPANT_STATUS.LEFT,
        joinDate: new Date('2025-11-01'),
        exitDate: new Date('2026-10-31'),
    });

    await Invoice.deleteMany({ contractId: contract2._id });
    const invoiceCode = 'HD2610BK01';
    await Invoice.deleteMany({ invoiceCode });

    const invoice2 = await Invoice.create({
        invoiceCode,
        contractId: contract2._id,
        month: '2026-10',
        items: [
            {
                type: INVOICE_ITEM_TYPE.METERED,
                description: 'Tiền điện sinh hoạt tháng 10/2026',
                oldReading: 120,
                newReading: 220,
                quantity: 100,
                unitPrice: 3500,
                amount: 350000,
            },
            {
                type: INVOICE_ITEM_TYPE.FIXED,
                description: 'Tiền nước sinh hoạt tháng 10/2026',
                quantity: 1,
                unitPrice: 100000,
                amount: 100000,
            },
        ],
        totalAmount: 450000,
        status: INVOICE_STATUS.PENDING,
        dueDate: new Date('2026-11-07T23:59:59Z'),
        sentAt: new Date('2026-10-31T10:00:00Z'),
        createdBy: managerId,
    });

    console.log(`✅ Case 2 created: Contract ${contract2._id} for Room 205 (Deposit: ${contract2.deposit.toLocaleString()} đ) with Pending Invoice ${invoice2.invoiceCode} (Amount: 450.000 đ)`);

    // ==========================================
    // 3. Case 3: Phòng 301 - NỢ LỚN HƠN CỌC (Cọc 3.5tr, Nợ 4.7tr → Hoàn 0đ, Thu thêm 1.2tr)
    // ==========================================
    const room301 = await Room.findById('6ae7002e48595e4957d0d692');
    if (room301) {
        await User.deleteMany({ email: 'cuong.pham@example.com' });
        await Occupant.deleteMany({ cccd: '031200555666' });
        await Contract.deleteMany({ representativeCccd: '031200555666' });

        const user3 = await User.create({
            email: 'cuong.pham@example.com',
            password: hashedPassword,
            roleId: ROLE.CUSTOMER,
            status: USER_STATUS.INACTIVE,
        });

        const contract3 = await Contract.create({
            roomId: room301._id,
            contractType: CONTRACT_TYPE.SINGLE,
            representativeCccd: '031200555666',
            representativeEmail: 'cuong.pham@example.com',
            startDate: new Date('2025-11-01T00:00:00Z'),
            endDate: new Date('2026-10-31T23:59:59Z'),
            rentPrice: room301.rentPrice,
            deposit: room301.deposit,
            status: CONTRACT_STATUS.ENDED,
            activatedAt: new Date('2025-11-01T08:00:00Z'),
            notes: 'Hợp đồng hết hạn - nợ tiền phòng và điện nước vượt quá tiền cọc',
            createdBy: managerId,
            depositReceiverId: managerId,
        });

        await Occupant.create({
            contractId: contract3._id,
            userId: user3._id,
            isRepresentative: true,
            name: 'Phạm Quốc Cường',
            phone: '0912555666',
            dateOfBirth: new Date('2001-11-10'),
            address: 'Thái Bình',
            cccd: '031200555666',
            status: OCCUPANT_STATUS.LEFT,
            joinDate: new Date('2025-11-01'),
            exitDate: new Date('2026-10-31'),
        });

        const invoiceCode3 = 'HD2610CK02';
        await Invoice.deleteMany({ invoiceCode: invoiceCode3 });
        await Invoice.create({
            invoiceCode: invoiceCode3,
            contractId: contract3._id,
            month: '2026-10',
            items: [
                {
                    type: INVOICE_ITEM_TYPE.RENT,
                    description: 'Tiền thuê phòng tháng 10/2026',
                    quantity: 1,
                    unitPrice: 3500000,
                    amount: 3500000,
                },
                {
                    type: INVOICE_ITEM_TYPE.EXTRA,
                    description: 'Tiền điện nước & bồi thường sửa khóa cửa, điều hòa',
                    quantity: 1,
                    unitPrice: 1200000,
                    amount: 1200000,
                },
            ],
            totalAmount: 4700000,
            status: INVOICE_STATUS.PENDING,
            dueDate: new Date('2026-11-05T23:59:59Z'),
            sentAt: new Date('2026-10-29T10:00:00Z'),
            createdBy: managerId,
        });

        console.log(`✅ Case 3 created: Contract ${contract3._id} for Room 301 (Deposit: ${contract3.deposit.toLocaleString()} đ, Debt: 4.700.000 đ → Extra collect: 1.200.000 đ)`);
    }

    // ==========================================
    // 4. Seed 3 đợt Thông báo chung mẫu cho Quản lý Test để test Lịch sử thông báo
    // ==========================================
    const activeRepOccupants = await Occupant.find({
        isRepresentative: true,
        status: OCCUPANT_STATUS.STAYED,
        userId: { $ne: null },
    })
        .limit(5)
        .lean();

    if (activeRepOccupants.length > 0) {
        const sampleAnnouncements = [
            {
                title: 'Thông báo lịch bảo trì thang máy định kỳ tháng 11',
                message: 'Ban quản lý tòa nhà sẽ tiến hành bảo trì hệ thống thang máy từ 09:00 đến 11:30 ngày 12/11/2026. Mong cư dân chủ động thời gian di chuyển.',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
                title: 'Cập nhật nội quy để xe và giờ giấc ra vào cổng',
                message: 'Từ ngày 05/11/2026, cư dân vui lòng xếp xe đúng vạch quy định tại tầng hầm và đóng cổng vân tay sau 23:00 để đảm bảo an ninh tòa nhà.',
                createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            },
            {
                title: 'Nhắc nhở thanh toán hóa đơn dịch vụ đúng hạn',
                message: 'Ban quản lý nhắc các phòng kiểm tra và hoàn tất thanh toán hóa đơn tiền phòng và dịch vụ qua mã QR trên hệ thống trước ngày hạn thanh toán.',
                createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            },
        ];

        for (const sample of sampleAnnouncements) {
            const exists = await Notification.exists({
                createdBy: managerId,
                type: NOTIFICATION_TYPE.ANNOUNCEMENT,
                title: sample.title,
            });
            if (!exists) {
                const batchId = new mongoose.Types.ObjectId();
                await Notification.insertMany(
                    activeRepOccupants.map((occ, idx) => ({
                        userId: occ.userId,
                        type: NOTIFICATION_TYPE.ANNOUNCEMENT,
                        title: sample.title,
                        message: sample.message,
                        refId: batchId,
                        createdBy: managerId,
                        isRead: idx % 2 === 0,
                        createdAt: sample.createdAt,
                        updatedAt: sample.createdAt,
                    })),
                );
            }
        }
        console.log('✅ Seeded sample announcement history batches.');
    }

    process.exit(0);
}

seedRefundContracts().catch(err => {
    console.error('Error seeding refund contracts:', err);
    process.exit(1);
});
