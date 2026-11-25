// Kiểm thử đặt thuê nối tiếp: phòng nhận hợp đồng mới, UPCOMING -> ACTIVE / CANCELLED, chồng ngày theo CCCD (UC-06, UC-24, UC-28, UC-29, UC-45)
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { CONNECT_DB, CLOSE_DB } from '../src/config/db.js';
import { CONTRACT_STATUS, CONTRACT_TYPE, OCCUPANT_STATUS, ROOM_STATUS } from '../src/constants/enums.js';
import { withTransaction } from '../src/helpers/withTransaction.js';
import { hasActiveStayingCccd } from '../src/helpers/customerRestriction.js';
import {
    assertRoomAcceptsNewContract,
    cancelUpcomingOfRepresentative,
    collectSuccessionKeys,
    isContractReadyToActivate,
    promoteReadyUpcomingContracts,
} from '../src/helpers/contractSuccession.js';
import Contract from '../src/models/Contract.js';
import Occupant from '../src/models/Occupant.js';
import Room from '../src/models/Room.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const fakeBuildingId = new mongoose.Types.ObjectId(); // tòa giả: phòng test không hiện ở tòa thật nào
const fakeUserId = new mongoose.Types.ObjectId();
const createdRoomIds = [];
const createdContractIds = [];

const randomCccd = () => `9${String(Math.floor(Math.random() * 1e11)).padStart(11, '0')}`;
const randomPhone = () => `09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS);

const createRoom = async (status = ROOM_STATUS.AVAILABLE) => {
    const room = await Room.create({
        buildingId: fakeBuildingId,
        floorNumber: 1,
        roomTypeId: new mongoose.Types.ObjectId(),
        roomNumber: `T${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
        area: 20,
        rentPrice: 3000000,
        deposit: 3000000,
        status,
    });
    createdRoomIds.push(room._id);
    return room;
};

// hợp đồng + hồ sơ người đại diện (không gắn tài khoản để không sinh thông báo)
const createContract = async ({ room, status, startDate, endDate, representativeCccd = randomCccd() }) => {
    const contract = await Contract.create({
        roomId: room._id,
        contractType: CONTRACT_TYPE.SINGLE,
        representativeCccd,
        representativeEmail: `${representativeCccd}@test.housify`,
        startDate,
        endDate,
        rentPrice: 3000000,
        deposit: 3000000,
        status,
        createdBy: fakeUserId,
    });
    createdContractIds.push(contract._id);
    if (status !== CONTRACT_STATUS.DRAFT) {
        await Occupant.create({
            contractId: contract._id,
            isRepresentative: true,
            name: 'Khách test',
            phone: randomPhone(),
            dateOfBirth: new Date('2000-01-01'),
            cccd: representativeCccd,
            status: OCCUPANT_STATUS.STAYED,
            joinDate: startDate,
        });
    }
    return contract;
};

// mô phỏng transaction kết thúc hợp đồng (UC-45 / UC-28, 29) rồi chuyển các hợp đồng nối tiếp đủ điều kiện
const endContract = (contract) => withTransaction(async (session) => {
    const fresh = await Contract.findById(contract._id).session(session);
    const keys = await collectSuccessionKeys(fresh, session);
    fresh.status = CONTRACT_STATUS.ENDED;
    await fresh.save({ session });
    await Room.updateOne({ _id: fresh.roomId }, { status: ROOM_STATUS.AVAILABLE }, { session });
    await Occupant.updateMany(
        { contractId: fresh._id, status: OCCUPANT_STATUS.STAYED },
        { status: OCCUPANT_STATUS.LEFT, exitDate: new Date() },
        { session },
    );
    return promoteReadyUpcomingContracts(keys, session);
});

test.before(async () => {
    await CONNECT_DB();
});

test.after(async () => {
    await Occupant.deleteMany({ contractId: { $in: createdContractIds } });
    await Contract.deleteMany({ _id: { $in: createdContractIds } });
    await Room.deleteMany({ _id: { $in: createdRoomIds } });
    await CLOSE_DB();
});

test('1. Phòng đang thuê còn hơn 1 tháng thì chưa nhận hợp đồng nối tiếp', async () => {
    const room = await createRoom(ROOM_STATUS.OCCUPIED);
    await createContract({ room, status: CONTRACT_STATUS.ACTIVE, startDate: daysFromNow(-300), endDate: daysFromNow(60) });

    await assert.rejects(
        () => assertRoomAcceptsNewContract({ room, startDate: daysFromNow(61) }),
        /chưa nhận hợp đồng mới/,
    );
});

test('2. Còn ≤ 1 tháng: ngày bắt đầu phải sau ngày trả phòng, ngay hôm sau là được', async () => {
    const room = await createRoom(ROOM_STATUS.OCCUPIED);
    const current = await createContract({
        room, status: CONTRACT_STATUS.ACTIVE, startDate: daysFromNow(-300), endDate: daysFromNow(20),
    });

    await assert.rejects(
        () => assertRoomAcceptsNewContract({ room, startDate: current.endDate }),
        /Ngày bắt đầu phải sau ngày/,
    );
    await assertRoomAcceptsNewContract({ room, startDate: new Date(current.endDate.getTime() + DAY_MS) });
});

test('3. Phòng đã có hợp đồng nối tiếp thì không nhận thêm', async () => {
    const room = await createRoom(ROOM_STATUS.OCCUPIED);
    await createContract({ room, status: CONTRACT_STATUS.ACTIVE, startDate: daysFromNow(-300), endDate: daysFromNow(10) });
    await createContract({ room, status: CONTRACT_STATUS.UPCOMING, startDate: daysFromNow(11), endDate: daysFromNow(376) });

    await assert.rejects(
        () => assertRoomAcceptsNewContract({ room, startDate: daysFromNow(12) }),
        /đã có hợp đồng nối tiếp/,
    );
});

test('4. Thuê nối tiếp: A kết thúc thì B chuyển ACTIVE ngay, phòng vẫn Đang thuê', async () => {
    const room = await createRoom(ROOM_STATUS.OCCUPIED);
    const contractA = await createContract({
        room, status: CONTRACT_STATUS.ACTIVE, startDate: daysFromNow(-300), endDate: daysFromNow(5),
    });
    const contractB = await createContract({
        room, status: CONTRACT_STATUS.UPCOMING, startDate: daysFromNow(6), endDate: daysFromNow(371),
    });

    assert.equal(await isContractReadyToActivate(contractB), false);

    const promoted = await endContract(contractA);
    assert.deepEqual(promoted.map((item) => String(item._id)), [String(contractB._id)]);
    assert.equal((await Contract.findById(contractB._id)).status, CONTRACT_STATUS.ACTIVE);
    assert.equal((await Room.findById(room._id)).status, ROOM_STATUS.OCCUPIED);
});

test('5. B đang ở phòng cũ: A rời đi trước thì B vẫn UPCOMING, B trả phòng cũ mới ACTIVE', async () => {
    const cccdB = randomCccd();
    const oldRoom = await createRoom(ROOM_STATUS.OCCUPIED);
    const newRoom = await createRoom(ROOM_STATUS.OCCUPIED);
    const oldContractB = await createContract({
        room: oldRoom, status: CONTRACT_STATUS.ACTIVE, startDate: daysFromNow(-300), endDate: daysFromNow(15), representativeCccd: cccdB,
    });
    const contractA = await createContract({
        room: newRoom, status: CONTRACT_STATUS.ACTIVE, startDate: daysFromNow(-300), endDate: daysFromNow(15),
    });
    const upcomingB = await createContract({
        room: newRoom, status: CONTRACT_STATUS.UPCOMING, startDate: daysFromNow(16), endDate: daysFromNow(381), representativeCccd: cccdB,
    });

    // A chấm dứt sớm: phòng mới Trống nhưng vẫn giữ chỗ, B chưa trả phòng cũ nên chưa ACTIVE
    assert.equal((await endContract(contractA)).length, 0);
    assert.equal((await Contract.findById(upcomingB._id)).status, CONTRACT_STATUS.UPCOMING);
    assert.equal((await Room.findById(newRoom._id)).status, ROOM_STATUS.AVAILABLE);
    await assert.rejects(() => assertRoomAcceptsNewContract({ room: newRoom, startDate: daysFromNow(20) }), /hợp đồng nháp hoặc hợp đồng sắp hiệu lực/);

    // B trả phòng cũ: hợp đồng phòng mới chuyển ACTIVE, không lúc nào B có 2 hợp đồng ACTIVE
    await endContract(oldContractB);
    assert.equal((await Contract.findById(upcomingB._id)).status, CONTRACT_STATUS.ACTIVE);
    assert.equal((await Room.findById(newRoom._id)).status, ROOM_STATUS.OCCUPIED);
});

test('6. Kiểm chồng ngày theo CCCD: phòng cũ kết thúc trước ngày bắt đầu mới thì không chặn', async () => {
    const cccd = randomCccd();
    const room = await createRoom(ROOM_STATUS.OCCUPIED);
    const current = await createContract({
        room, status: CONTRACT_STATUS.ACTIVE, startDate: daysFromNow(-300), endDate: daysFromNow(10), representativeCccd: cccd,
    });

    assert.equal(await hasActiveStayingCccd(cccd), true);
    assert.equal(await hasActiveStayingCccd(cccd, null, null, { availableFrom: current.endDate }), true);
    assert.equal(
        await hasActiveStayingCccd(cccd, null, null, { availableFrom: new Date(current.endDate.getTime() + DAY_MS) }),
        false,
    );
});

test('7. Khách đã có hợp đồng UPCOMING thì không đứng tên thêm hợp đồng khác', async () => {
    const cccd = randomCccd();
    const room = await createRoom();
    await createContract({ room, status: CONTRACT_STATUS.UPCOMING, startDate: daysFromNow(30), endDate: daysFromNow(395), representativeCccd: cccd });

    assert.equal(await hasActiveStayingCccd(cccd, null, null, { availableFrom: daysFromNow(400) }), true);
});

test('8. Khách bị đơn phương ở phòng cũ: hợp đồng UPCOMING bị hủy, cư dân lưu sẵn chuyển LEFT', async () => {
    const cccdB = randomCccd();
    const room = await createRoom(ROOM_STATUS.OCCUPIED);
    await createContract({ room, status: CONTRACT_STATUS.ACTIVE, startDate: daysFromNow(-300), endDate: daysFromNow(10) });
    const upcomingB = await createContract({
        room, status: CONTRACT_STATUS.UPCOMING, startDate: daysFromNow(11), endDate: daysFromNow(376), representativeCccd: cccdB,
    });

    const cancelled = await withTransaction((session) => cancelUpcomingOfRepresentative(cccdB, session));
    assert.equal(cancelled.length, 1);
    assert.equal((await Contract.findById(upcomingB._id)).status, CONTRACT_STATUS.CANCELLED);
    assert.equal(await Occupant.countDocuments({ contractId: upcomingB._id, status: OCCUPANT_STATUS.STAYED }), 0);
    assert.equal((await Room.findById(room._id)).status, ROOM_STATUS.OCCUPIED);
});
