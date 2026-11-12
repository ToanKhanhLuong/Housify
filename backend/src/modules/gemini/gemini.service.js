// Nghiệp vụ cho module gemini: Trợ lý ảo AI thông minh Housify (Hỗ trợ 3 vai trò Admin, Manager, Customer)
// Kiến trúc Context-Injection (RAG mức dịch vụ) an toàn, phân quyền nghiêm ngặt theo RBAC, rào 4 model dự phòng chống quá tải.
import { env } from '../../config/env.js';
import {
    ROLE,
    USER_STATUS,
    OCCUPANT_STATUS,
    CONTRACT_STATUS,
    ROOM_STATUS,
    INVOICE_STATUS,
    INCIDENT_STATUS,
    TERMINATION_STATUS,
    TERMINATION_TYPE,
} from '../../constants/enums.js';
import { AppError } from '../../utils/AppError.js';
import User from '../../models/User.js';
import Building from '../../models/Building.js';
import Room from '../../models/Room.js';
import RoomType from '../../models/RoomType.js';
import Service from '../../models/Service.js';
import ServicePrice from '../../models/ServicePrice.js';
import Contract from '../../models/Contract.js';
import Occupant from '../../models/Occupant.js';
import Invoice from '../../models/Invoice.js';
import Incident from '../../models/Incident.js';
import Manager from '../../models/Manager.js';
import TerminationRequest from '../../models/TerminationRequest.js';

// Danh sách các model Gemini ưu tiên từ thế hệ 3.x siêu tốc xuống các model dự phòng 2.5 và Latest
const GEMINI_MODELS = [
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-pro-latest',
];

const formatMoneyVn = (amount) => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return '0 đ';
    return `${amount.toLocaleString('vi-VN')} đ`;
};

const formatDateVn = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Lấy bảng giá dịch vụ đang áp dụng của một tòa nhà (effectiveFrom <= hiện tại, mới nhất)
 */
const getBuildingServicePrices = async (buildingId) => {
    if (!buildingId) return [];
    const services = await Service.find({ isDeleted: false }).lean();
    if (!services.length) return [];

    const prices = await ServicePrice.find({
        buildingId,
        effectiveFrom: { $lte: new Date() },
    })
        .sort({ effectiveFrom: -1 })
        .lean();

    const latestPriceByService = new Map();
    for (const p of prices) {
        const sid = String(p.serviceId);
        if (!latestPriceByService.has(sid)) {
            latestPriceByService.set(sid, p);
        }
    }

    return services.map((s) => {
        const matched = latestPriceByService.get(String(s._id));
        return {
            name: s.name,
            unit: s.unit,
            type: s.isFixed ? 'Phí cố định hàng tháng' : 'Tính theo chỉ số đồng hồ',
            unitPrice: matched ? formatMoneyVn(matched.unitPrice) : 'Chưa thiết lập giá',
        };
    });
};

/**
 * ============================================================================
 * 1. NGỮ CẢNH & CẨM NANG NGHIỆP VỤ CHO KHÁCH THUÊ (CUSTOMER - ROLE 2)
 * Phạm vi dữ liệu: CHỈ đọc dữ liệu phòng, hợp đồng, hóa đơn đã gửi, sự cố và
 * đơn chấm dứt của CHÍNH KHÁCH THUÊ NÀY. Tuyệt đối không lộ dữ liệu phòng khác.
 * ============================================================================
 */
const buildCustomerContext = async (user) => {
    const userId = user._id || user.id;

    // Tìm hồ sơ cư dân đại diện của tài khoản này (ưu tiên đang ở STAYED)
    const occupant = await Occupant.findOne({
        userId,
        $or: [{ status: OCCUPANT_STATUS.STAYED }, { isRepresentative: true }],
    })
        .sort({ status: -1, createdAt: -1 })
        .lean();

    if (!occupant) {
        return `Bạn là Housify AI Assistant - Trợ lý thông minh hỗ trợ khách thuê nhà trọ Housify.
Tài khoản khách hàng này hiện chưa có hợp đồng thuê phòng nào đang có hiệu lực hoặc đã trả phòng.
Nếu khách hỏi về hóa đơn hay phòng đang ở, hãy thông báo lịch sự rằng hiện tài khoản chưa gắn với hợp đồng đang hoạt động nào, và hướng dẫn khách kiểm tra link kích hoạt hợp đồng trong email hoặc liên hệ Quản lý tòa nhà để được hỗ trợ.`;
    }

    // Tìm hợp đồng (ưu tiên ACTIVE, nếu không có thì lấy hợp đồng gần nhất gắn với occupant)
    let contract = await Contract.findOne({
        _id: occupant.contractId,
        status: CONTRACT_STATUS.ACTIVE,
    }).lean();

    if (!contract) {
        contract = await Contract.findById(occupant.contractId).lean();
    }

    let room = null;
    let roomType = null;
    let building = null;
    let buildingManager = null;
    let servicePrices = [];
    let coOccupants = [];
    let invoices = [];
    let incidents = [];
    let terminationReqs = [];

    if (contract) {
        room = await Room.findById(contract.roomId).lean();
        if (room) {
            roomType = await RoomType.findById(room.roomTypeId).lean();
            building = await Building.findById(room.buildingId).lean();
            if (building?.managerId) {
                const mgrProfile = await Manager.findOne({ userId: building.managerId }).lean();
                const mgrUser = await User.findById(building.managerId).select('email').lean();
                if (mgrProfile) {
                    buildingManager = {
                        name: mgrProfile.name,
                        phone: mgrProfile.phone,
                        email: mgrUser?.email || '—',
                    };
                }
            }
            servicePrices = await getBuildingServicePrices(room.buildingId);
            incidents = await Incident.find({ contractId: contract._id })
                .sort({ createdAt: -1 })
                .limit(8)
                .lean();
        }

        coOccupants = await Occupant.find({
            contractId: contract._id,
            status: OCCUPANT_STATUS.STAYED,
        }).lean();

        // CHỈ LẤY HÓA ĐƠN ĐÃ GỬI (sentAt != null) VÀ TRẠNG THÁI PENDING / PAID (UC-36, BR-095)
        // Tuyệt đối ẩn hóa đơn nháp (DRAFT) mà Quản lý chưa phát hành
        invoices = await Invoice.find({
            contractId: contract._id,
            sentAt: { $ne: null },
            status: { $in: [INVOICE_STATUS.PENDING, INVOICE_STATUS.PAID] },
        })
            .sort({ month: -1 })
            .limit(6)
            .lean();

        terminationReqs = await TerminationRequest.find({
            contractId: contract._id,
        })
            .sort({ createdAt: -1 })
            .lean();
    }

    const now = new Date();
    const pendingInvoices = invoices.filter((i) => i.status === INVOICE_STATUS.PENDING);
    const overdueInvoices = pendingInvoices.filter((i) => i.dueDate && new Date(i.dueDate) < now);
    const totalDebt = pendingInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const invoiceSummary = invoices.map((inv) => ({
        invoiceCode: inv.invoiceCode,
        month: inv.month,
        totalAmount: formatMoneyVn(inv.totalAmount),
        status:
            inv.status === INVOICE_STATUS.PAID
                ? `Đã thanh toán (ngày ${formatDateVn(inv.paidAt)})`
                : inv.dueDate && new Date(inv.dueDate) < now
                    ? 'Chưa thanh toán - ĐANG QUÁ HẠN'
                    : 'Chưa thanh toán (Chờ nộp)',
        dueDate: formatDateVn(inv.dueDate),
        items: (inv.items || []).map((item) => ({
            description: item.description,
            type: item.type,
            oldReading: item.oldReading,
            newReading: item.newReading,
            quantity: item.quantity,
            unitPrice: formatMoneyVn(item.unitPrice),
            amount: formatMoneyVn(item.amount),
        })),
    }));

    const terminationSummary = terminationReqs.map((t) => ({
        type: t.type === TERMINATION_TYPE.MUTUAL ? 'Hai bên thỏa thuận (MUTUAL)' : 'Đơn phương chấm dứt (UNILATERAL)',
        status:
            t.status === TERMINATION_STATUS.PENDING
                ? 'Đang chờ xác nhận / phê duyệt (PENDING)'
                : t.status === TERMINATION_STATUS.CONFIRMED
                    ? 'Đã xác nhận hiệu lực (CONFIRMED)'
                    : t.status === TERMINATION_STATUS.REJECTED
                        ? 'Đã từ chối (REJECTED)'
                        : 'Đã hủy (CANCELLED)',
        reason: t.reason,
        effectiveDate: formatDateVn(t.effectiveDate),
        note: t.note || '—',
    }));

    const incidentSummary = incidents.map((inc) => ({
        code: inc.incidentCode,
        type: inc.type,
        title: inc.title,
        status:
            inc.status === INCIDENT_STATUS.PENDING
                ? 'Chờ tiếp nhận'
                : inc.status === INCIDENT_STATUS.IN_PROGRESS
                    ? 'Đang sửa chữa / xử lý'
                    : inc.status === INCIDENT_STATUS.RESOLVED
                        ? 'Đã giải quyết xong'
                        : 'Đã từ chối',
        resultNote: inc.resultNote || '—',
        createdAt: formatDateVn(inc.createdAt),
    }));

    return `Bạn là Housify AI Assistant - Trợ lý ảo thông minh hỗ trợ trực tiếp cho khách thuê (Customer) đang cư trú tại phòng ${room?.roomNumber || '—'}, ${building?.name || 'Tòa nhà'}.

===================================================================
PHẦN 1: DỮ LIỆU THỰC TẾ CỦA KHÁCH HÀNG TỪ DATABASE HOUSIFY
===================================================================
1. Hồ sơ người đại diện thuê phòng:
   - Họ và tên: ${occupant.name}
   - Số CCCD (tài khoản đăng nhập): ${occupant.cccd}
   - Số điện thoại: ${occupant.phone || 'Chưa cập nhật'}
   - Email nhận thông báo: ${user.email || contract?.representativeEmail || '—'}

2. Thông tin Tòa nhà & Quản lý phụ trách:
   - Tòa nhà: ${building?.name || '—'}
   - Địa chỉ: ${building?.address || '—'}
   - Quản lý tòa nhà phụ trách: ${buildingManager ? `${buildingManager.name} (SĐT: ${buildingManager.phone}, Email: ${buildingManager.email})` : 'Chưa phân công quản lý'}

3. Thông tin Phòng & Hợp đồng thuê:
   - Phòng: Phòng ${room?.roomNumber || '—'} - Tầng ${room?.floorNumber || '—'}
   - Loại phòng: ${roomType?.name || 'Tiêu chuẩn'} (Diện tích: ${room?.area || '—'} m², Sức chứa tối đa: ${roomType?.capacity || '—'} người)
   - Loại hợp đồng: ${contract?.contractType === 'GROUP' ? 'Hợp đồng ở ghép / nhóm (GROUP)' : 'Hợp đồng cá nhân (SINGLE)'}
   - Trạng thái hợp đồng: ${contract?.status === CONTRACT_STATUS.ACTIVE ? 'Đang có hiệu lực (ACTIVE)' : contract?.status || '—'}
   - Thời hạn hợp đồng: Từ ngày ${formatDateVn(contract?.startDate)} đến hết ngày ${formatDateVn(contract?.endDate)}
   - Giá thuê phòng cố định trên hợp đồng: ${formatMoneyVn(contract?.rentPrice || room?.rentPrice || 0)} / tháng
   - Tiền đặt cọc ghi trên hợp đồng: ${formatMoneyVn(contract?.deposit || 0)} ${contract?.depositRefundedAt ? `(Đã hoàn cọc ngày ${formatDateVn(contract.depositRefundedAt)})` : '(Đang được giữ làm cọc bảo đảm hợp đồng)'}
   - Danh sách thành viên đang ở trong phòng (${coOccupants.length}/${roomType?.capacity || '—'} người): ${coOccupants.length > 0 ? coOccupants.map((o) => `${o.name} (${o.isRepresentative ? 'Người đại diện' : 'Người ở cùng'}, SĐT: ${o.phone})`).join('; ') : '—'}

4. Bảng giá dịch vụ đang áp dụng tại ${building?.name || 'tòa nhà'}:
   ${servicePrices.length > 0 ? JSON.stringify(servicePrices) : 'Chưa thiết lập bảng giá dịch vụ'}

5. Tình trạng Hóa đơn & Thanh toán (chỉ tính hóa đơn đã phát hành cho khách):
   - Tổng quan công nợ: ${pendingInvoices.length > 0 ? `ĐANG CHỜ THANH TOÁN ${pendingInvoices.length} HÓA ĐƠN (${overdueInvoices.length} hóa đơn quá hạn) - Tổng số tiền cần nộp: ${formatMoneyVn(totalDebt)}` : 'Hiện tại phòng của bạn chưa có hóa đơn nào phát sinh hoặc đã thanh toán đầy đủ mọi hóa đơn (0 đ nợ).'}
   - Chi tiết danh sách hóa đơn: ${invoices.length > 0 ? JSON.stringify(invoiceSummary) : 'Trống (Hiện tại khách chưa có hóa đơn nào)'}

6. Đơn chấm dứt hợp đồng (nếu có):
   - ${terminationSummary.length > 0 ? JSON.stringify(terminationSummary) : 'Không có đơn chấm dứt hợp đồng nào.'}

7. Lịch sử báo cáo sự cố của phòng:
   - ${incidentSummary.length > 0 ? JSON.stringify(incidentSummary) : 'Trống (Phòng chưa có báo cáo sự cố nào).'}

8. Nội quy tòa nhà ${building?.name || ''}:
${building?.rules || '• Giữ trật tự chung sau 22:00\n• Để xe đúng nơi quy định\n• Giữ gìn vệ sinh và an toàn phòng cháy chữa cháy'}

===================================================================
PHẦN 2: CẨM NANG QUY CHẾ & NGHIỆP VỤ HỆ THỐNG HOUSIFY (DÀNH CHO KHÁCH THUÊ)
===================================================================
1. QUY ĐỊNH CHUYỂN RA SỚM / CHẤM DỨT HỢP ĐỒNG TRƯỚC HẠN (UC-28, UC-29, BR-073):
   - Khách thuê hoàn toàn ĐƯỢC PHÉP xin chuyển ra sớm hơn ngày kết thúc hợp đồng (${formatDateVn(contract?.endDate)}) thông qua hình thức "Chấm dứt hợp đồng hai bên thỏa thuận (MUTUAL)".
   - Quy trình 4 bước trên hệ thống Housify:
     + Bước 1: Khách thuê liên hệ trực tiếp với Quản lý tòa nhà (${buildingManager ? `${buildingManager.name} - SĐT: ${buildingManager.phone}` : 'Ban quản lý'}) để thông báo ngày dự kiến dọn ra.
     + Bước 2: Quản lý tòa nhà lập "Đơn chấm dứt hợp đồng (MUTUAL)" trên hệ thống Housify với lý do và ngày hiệu lực bàn giao phòng (effectiveDate). Trong thời gian chờ đến ngày hiệu lực, hợp đồng vẫn giữ trạng thái ACTIVE.
     + Bước 3: Khách thuê nhận thông báo chuông + email, vào hệ thống tích chọn đồng ý và bấm "Xác nhận điện tử". Lưu ý: Nếu sau khi Quản lý lập đơn mà khách không bấm xác nhận, hệ thống sẽ tự động nhắc vào ngày thứ 1, 3, 6 và tự động xác nhận (autoConfirmed) sau 7 ngày.
     + Bước 4: Đúng ngày hiệu lực, hai bên nghiệm thu bàn giao phòng, chốt điện nước. Hệ thống tự động chuyển hợp đồng sang ENDED, phòng về AVAILABLE, cư dân về LEFT; sau 24 giờ tài khoản khách sẽ chuyển sang trạng thái INACTIVE (nếu sau này quay lại thuê tiếp thì tài khoản sẽ được mở lại).
   - QUY ĐỊNH VỀ TIỀN CỌC KHI CHUYỂN RA SỚM (BR-073 - RẤT QUAN TRỌNG):
     + Theo quy tắc bắt buộc của hệ thống Housify (BR-073), mọi hợp đồng kết thúc thông qua Đơn chấm dứt hợp đồng đã xác nhận (CONFIRMED - bao gồm cả thỏa thuận hai bên MUTUAL lẫn đơn phương UNILATERAL) đều KHÔNG ĐƯỢC HOÀN CỌC (mất khoản cọc ${formatMoneyVn(contract?.deposit || 0)}), bất kể ngày hiệu lực rơi vào ngày nào.

2. QUY ĐỊNH ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG DO VI PHẠM (UNILATERAL - UC-29):
   - Nếu khách thuê nợ hóa đơn quá hạn kéo dài (thường từ 5-7 ngày sau hạn nộp mà không thanh toán dù đã nhắc nhở) hoặc vi phạm nghiêm trọng nội quy tòa nhà, Quản lý có quyền lập đơn chấm dứt đơn phương trình Chủ nhà (Admin) phê duyệt.
   - Khi bị chấm dứt đơn phương: Khách mất toàn bộ tiền cọc và sau 24 giờ kể từ ngày hợp đồng kết thúc, tài khoản của khách sẽ bị KHÓA VĨNH VIỄN (LOCKED - đưa vào danh sách đen, không thể thuê lại bất kỳ phòng nào trong chuỗi Housify).

3. QUY ĐỊNH HẾT HẠN HỢP ĐỒNG TỰ NHIÊN & HOÀN TRẢ TIỀN CỌC (UC-45, BR-130, BR-131):
   - Điều kiện duy nhất để được hoàn cọc: Hợp đồng đi hết thời hạn tự nhiên đến ngày ${formatDateVn(contract?.endDate)} và kết thúc (ENDED) mà KHÔNG có bất kỳ đơn chấm dứt trước hạn nào ở trạng thái CONFIRMED.
   - Số tiền hoàn: Hoàn đủ 100% số tiền đặt cọc ghi trên hợp đồng (${formatMoneyVn(contract?.deposit || 0)}) bằng tiền mặt, ghi nhận 1 lần trên hệ thống.
   - Lưu ý về hư hỏng tài sản: Nếu khi trả phòng có hư hỏng thiết bị hoặc nợ điện nước, Quản lý sẽ thu qua dòng phí phát sinh (EXTRA) trên hóa đơn tháng cuối cùng chứ không trừ trực tiếp vào số tiền cọc ghi trên hợp đồng.

4. QUY ĐỊNH HÓA ĐƠN & THANH TOÁN VIETQR SEPAY (UC-34..39, UC-49, BR-095):
   - Tổng tiền hóa đơn = Tiền thuê phòng + Tiền điện (theo chỉ số mới - chỉ số cũ) + Tiền nước + Phí dịch vụ cố định + Chi phí phát sinh (nếu có).
   - Khi Quản lý phát hành hóa đơn (trạng thái PENDING), hạn thanh toán (dueDate) là 07 ngày kể từ thời điểm gửi.
   - Hệ thống tự động gửi thông báo nhắc thanh toán trước hạn 3 ngày, 1 ngày, đúng ngày đến hạn, và nhắc mỗi ngày 1 lần nếu quá hạn.
   - Cách thanh toán: Khách vào menu "Hóa đơn" bên trái -> Mở hóa đơn chờ thanh toán -> Quét mã QR VietQR bằng ứng dụng ngân hàng (giữ nguyên nội dung chuyển khoản chứa mã hóa đơn). Cổng SePay sẽ tự động nhận diện và gạch nợ thành Đã thanh toán (PAID) ngay lập tức.

5. QUY ĐỊNH NGƯỜI Ở CÙNG & TÀI KHOẢN (UC-30..33):
   - Mỗi phòng chỉ có duy nhất 01 Người đại diện có tài khoản đăng nhập hệ thống (đăng nhập bằng Số CCCD + mật khẩu). Những người ở cùng chỉ lưu hồ sơ cư dân, không có tài khoản riêng.
   - Tổng số người ở trong phòng không được vượt quá sức chứa tối đa của loại phòng (${roomType?.capacity || '—'} người). Khi muốn thêm người ở cùng hoặc có người ở cùng dọn đi, người đại diện cần báo cho Quản lý tòa nhà để cập nhật vào hệ thống.

6. QUY TRÌNH BÁO CÁO SỰ CỐ & GIA HẠN HỢP ĐỒNG (UC-27, UC-43):
   - Báo sự cố: Vào menu "Sự cố" -> Bấm "Báo cáo sự cố mới" -> Chọn phân loại (Thiết bị, Dịch vụ, Vi phạm, Khác), nhập mô tả và đính kèm ảnh chụp. Quản lý sẽ tiếp nhận (IN_PROGRESS) và xử lý (RESOLVED).
   - Gia hạn hợp đồng: Nếu muốn thuê tiếp sau ngày ${formatDateVn(contract?.endDate)}, khách báo trước với Quản lý tòa nhà để thực hiện gia hạn ngày kết thúc hợp đồng trên hệ thống.

===================================================================
PHẦN 3: RÀO CHẮN BẢO MẬT & NGUYÊN TẮC TRẢ LỜI
===================================================================
1. Bạn CHỈ trả lời trong phạm vi dữ liệu của khách hàng ${occupant.name} (Phòng ${room?.roomNumber || '—'}). Tuyệt đối không tiết lộ thông tin của phòng khác hay doanh thu tòa nhà.
2. Khi khách hỏi về hóa đơn: Nếu danh sách hóa đơn đang trống, phải trả lời chính xác: "Hiện tại phòng của bạn chưa có hóa đơn nào phát sinh hoặc chưa có hóa đơn cần thanh toán". Không được tự bịa ra mã hóa đơn.
3. Khi khách hỏi về quy định chuyển ra sớm, chấm dứt hợp đồng, hoàn cọc, đóng tiền, người ở cùng: Hãy căn cứ chuẩn xác 100% vào PHẦN 1 (số liệu thực tế của khách: ngày hết hạn, số tiền cọc, tên/SĐT Quản lý tòa) kết hợp với PHẦN 2 (Cẩm nang nghiệp vụ) để tư vấn rõ ràng, đầy đủ, lịch sự bằng tiếng Việt.`;
};

/**
 * ============================================================================
 * 2. NGỮ CẢNH & CẨM NANG NGHIỆP VỤ CHO QUẢN LÝ TÒA NHÀ (MANAGER - ROLE 1)
 * Phạm vi dữ liệu: CHỈ đọc dữ liệu thuộc tòa nhà mà Manager này được phân công.
 * Không được phép truy cập hoặc tiết lộ dữ liệu của các tòa nhà cơ sở khác.
 * ============================================================================
 */
const buildManagerContext = async (user) => {
    const userId = user._id || user.id;
    const managerProfile = await Manager.findOne({ userId }).lean();
    const building = await Building.findOne({
        managerId: userId,
        isDeleted: false,
    }).lean();

    if (!building) {
        return `Bạn là Housify AI Assistant - Trợ lý vận hành dành cho Quản lý tòa nhà.
Tài khoản Quản lý ${managerProfile?.name || user.email || ''} hiện CHƯA ĐƯỢC PHÂN CÔNG phụ trách tòa nhà nào.
Theo quy tắc nghiệp vụ hệ thống (BR-023), khi chưa được gán tòa nhà, Quản lý chỉ có thể sử dụng các tính năng: Hồ sơ cá nhân, Đổi mật khẩu, Xem thông báo và Đăng xuất. Hãy hướng dẫn Quản lý liên hệ Admin (Chủ nhà trọ) để được phân công tòa nhà cơ sở.`;
    }

    const rooms = await Room.find({ buildingId: building._id, isDeleted: false })
        .sort({ floorNumber: 1, roomNumber: 1 })
        .lean();
    const roomIds = rooms.map((r) => r._id);
    const roomTypes = await RoomType.find({ isDeleted: false }).lean();
    const roomTypeMap = new Map(roomTypes.map((rt) => [String(rt._id), rt]));

    const servicePrices = await getBuildingServicePrices(building._id);

    // Lấy toàn bộ hợp đồng của các phòng trong tòa
    const allContracts = await Contract.find({ roomId: { $in: roomIds } })
        .sort({ createdAt: -1 })
        .lean();

    const activeContracts = allContracts.filter((c) => c.status === CONTRACT_STATUS.ACTIVE);
    const draftContracts = allContracts.filter((c) => c.status === CONTRACT_STATUS.DRAFT);
    const endedContracts = allContracts.filter((c) => c.status === CONTRACT_STATUS.ENDED);

    const activeContractIds = activeContracts.map((c) => c._id);
    const allContractIds = allContracts.map((c) => c._id);

    // Lấy cư dân đang ở (STAYED) của các hợp đồng ACTIVE và người đại diện của toàn bộ hợp đồng
    const [activeOccupants, allRepOccupants] = await Promise.all([
        Occupant.find({
            contractId: { $in: activeContractIds },
            status: OCCUPANT_STATUS.STAYED,
        }).lean(),
        Occupant.find({
            contractId: { $in: allContractIds },
            isRepresentative: true,
        }).lean(),
    ]);

    const occupantsByContract = new Map();
    for (const occ of activeOccupants) {
        const cid = String(occ.contractId);
        if (!occupantsByContract.has(cid)) occupantsByContract.set(cid, []);
        occupantsByContract.get(cid).push(occ);
    }

    const repByContract = new Map();
    for (const rep of allRepOccupants) {
        repByContract.set(String(rep.contractId), rep);
    }

    const activeContractByRoom = new Map(activeContracts.map((c) => [String(c.roomId), c]));
    const roomById = new Map(rooms.map((r) => [String(r._id), r]));
    const contractById = new Map(allContracts.map((c) => [String(c._id), c]));

    const availableRooms = rooms.filter((r) => r.status === ROOM_STATUS.AVAILABLE);
    const occupiedRooms = rooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED);
    const maintenanceRooms = rooms.filter((r) => r.status === ROOM_STATUS.MAINTENANCE);

    const availableRoomList = availableRooms.map((r) => {
        const rt = roomTypeMap.get(String(r.roomTypeId));
        return {
            roomNumber: r.roomNumber,
            floor: r.floorNumber,
            type: rt?.name || '—',
            capacity: `${rt?.capacity || '—'} người`,
            area: `${r.area}m²`,
            rentPrice: formatMoneyVn(r.rentPrice),
            deposit: formatMoneyVn(r.deposit),
        };
    });

    const occupiedRoomList = occupiedRooms.map((r) => {
        const rt = roomTypeMap.get(String(r.roomTypeId));
        const contract = activeContractByRoom.get(String(r._id));
        const occs = contract ? occupantsByContract.get(String(contract._id)) || [] : [];
        const rep = occs.find((o) => o.isRepresentative) || occs[0];
        return {
            roomNumber: r.roomNumber,
            floor: r.floorNumber,
            representative: rep ? `${rep.name} (SĐT: ${rep.phone})` : contract?.representativeCccd || '—',
            occupantCount: `${occs.length}/${rt?.capacity || '—'} người`,
            rentPrice: formatMoneyVn(contract?.rentPrice || r.rentPrice),
            endDate: formatDateVn(contract?.endDate),
        };
    });

    const maintenanceRoomList = maintenanceRooms.map((r) => ({
        roomNumber: r.roomNumber,
        floor: r.floorNumber,
        area: `${r.area}m²`,
    }));

    // Hợp đồng sắp hết hạn trong 60 ngày tới
    const now = new Date();
    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const expiringContractList = activeContracts
        .filter((c) => c.endDate && new Date(c.endDate) >= now && new Date(c.endDate) <= in60Days)
        .map((c) => {
            const r = roomById.get(String(c.roomId));
            const occs = occupantsByContract.get(String(c._id)) || [];
            const rep = occs.find((o) => o.isRepresentative);
            return {
                roomNumber: r?.roomNumber || '—',
                representative: rep ? `${rep.name} (${rep.phone})` : c.representativeCccd,
                endDate: formatDateVn(c.endDate),
                rentPrice: formatMoneyVn(c.rentPrice),
            };
        });

    // Đơn chấm dứt hợp đồng trong tòa
    const terminationRequests = await TerminationRequest.find({
        contractId: { $in: allContractIds },
    })
        .sort({ createdAt: -1 })
        .lean();

    const confirmedTerminationContractIds = new Set(
        terminationRequests
            .filter((t) => t.status === TERMINATION_STATUS.CONFIRMED)
            .map((t) => String(t.contractId)),
    );

    const activeTerminations = terminationRequests
        .filter((t) => t.status === TERMINATION_STATUS.PENDING || t.status === TERMINATION_STATUS.CONFIRMED)
        .slice(0, 10)
        .map((t) => {
            const c = contractById.get(String(t.contractId));
            const r = c ? roomById.get(String(c.roomId)) : null;
            return {
                roomNumber: r?.roomNumber || '—',
                type: t.type === TERMINATION_TYPE.MUTUAL ? 'Thỏa thuận (MUTUAL)' : 'Đơn phương (UNILATERAL)',
                status: t.status,
                effectiveDate: formatDateVn(t.effectiveDate),
                reason: t.reason,
            };
        });

    // Hợp đồng ENDED đủ điều kiện hoàn cọc nhưng chưa hoàn cọc (BR-073, BR-130)
    const refundableEndedContracts = endedContracts
        .filter((c) => !c.depositRefundedAt && !confirmedTerminationContractIds.has(String(c._id)))
        .map((c) => {
            const r = roomById.get(String(c.roomId));
            const rep = repByContract.get(String(c._id));
            return {
                roomNumber: r?.roomNumber || '—',
                tenant: rep ? `${rep.name} (SĐT: ${rep.phone})` : c.representativeCccd,
                depositToRefund: formatMoneyVn(c.deposit),
                endDate: formatDateVn(c.endDate),
            };
        });

    // Hóa đơn trong tòa
    const allBuildingInvoices = await Invoice.find({
        contractId: { $in: allContractIds },
    })
        .sort({ createdAt: -1 })
        .lean();

    const draftInvoices = allBuildingInvoices.filter((i) => i.status === INVOICE_STATUS.DRAFT);
    const pendingInvoices = allBuildingInvoices.filter(
        (i) => i.status === INVOICE_STATUS.PENDING && i.sentAt != null,
    );
    const overdueInvoices = pendingInvoices.filter((i) => i.dueDate && new Date(i.dueDate) < now);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonthInvoices = allBuildingInvoices.filter(
        (i) => i.status === INVOICE_STATUS.PAID && i.paidAt && new Date(i.paidAt) >= startOfMonth,
    );

    const revenueThisMonth = paidThisMonthInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalPendingAmount = pendingInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const formatInvoiceForManager = (i) => {
        const c = contractById.get(String(i.contractId));
        const r = c ? roomById.get(String(c.roomId)) : null;
        const rep = c ? repByContract.get(String(c._id)) : null;
        return {
            invoiceCode: i.invoiceCode,
            roomNumber: r?.roomNumber || '—',
            tenant: rep ? `${rep.name} (SĐT: ${rep.phone})` : c?.representativeCccd || '—',
            month: i.month,
            totalAmount: formatMoneyVn(i.totalAmount),
            dueDate: formatDateVn(i.dueDate),
        };
    };

    const overdueSummary = overdueInvoices.slice(0, 15).map(formatInvoiceForManager);
    const pendingSummary = pendingInvoices.slice(0, 15).map(formatInvoiceForManager);
    const draftInvoiceSummary = draftInvoices.slice(0, 10).map((i) => {
        const c = contractById.get(String(i.contractId));
        const r = c ? roomById.get(String(c.roomId)) : null;
        return {
            invoiceCode: i.invoiceCode,
            roomNumber: r?.roomNumber || '—',
            month: i.month,
            totalAmount: formatMoneyVn(i.totalAmount),
            note: 'Bản nháp (Chưa bấm gửi cho khách)',
        };
    });

    // Sự cố chưa giải quyết xong trong tòa (lọc theo roomId của tòa!)
    const openIncidents = await Incident.find({
        roomId: { $in: roomIds },
        status: { $in: [INCIDENT_STATUS.PENDING, INCIDENT_STATUS.IN_PROGRESS] },
    })
        .sort({ createdAt: -1 })
        .lean();

    const openIncidentSummary = openIncidents.map((inc) => {
        const r = roomById.get(String(inc.roomId));
        return {
            incidentCode: inc.incidentCode,
            roomNumber: r?.roomNumber || '—',
            type: inc.type,
            title: inc.title,
            description: inc.description,
            status: inc.status === INCIDENT_STATUS.PENDING ? 'Chờ tiếp nhận (PENDING)' : 'Đang xử lý (IN_PROGRESS)',
            createdAt: formatDateVn(inc.createdAt),
        };
    });

    return `Bạn là Housify AI Assistant - Trợ lý vận hành thông minh dành riêng cho Quản lý tòa nhà ${managerProfile?.name || ''} phụ trách cơ sở ${building.name}.

===================================================================
PHẦN 1: SỐ LIỆU VẬN HÀNH THỜI GIAN THỰC CỦA TÒA NHÀ ${building.name.toUpperCase()}
===================================================================
1. Thông tin cơ sở phụ trách:
   - Tên tòa nhà: ${building.name}
   - Địa chỉ: ${building.address}
   - Số tầng: ${building.floorCount} tầng
   - Quản lý phụ trách: ${managerProfile?.name || '—'} (SĐT: ${managerProfile?.phone || '—'}, Email: ${user.email || '—'})
   - Nội quy tòa nhà hiện hành: ${building.rules || 'Chưa cập nhật nội quy'}

2. Thống kê & Chi tiết Phòng (${rooms.length} phòng):
   - Tỷ lệ lấp đầy: Đang thuê ${occupiedRooms.length}/${rooms.length} phòng (${rooms.length > 0 ? Math.round((occupiedRooms.length / rooms.length) * 100) : 0}%)
   - Số phòng trống sẵn sàng cho thuê (AVAILABLE): ${availableRooms.length} phòng
   - Số phòng đang bảo trì (MAINTENANCE): ${maintenanceRooms.length} phòng
   - Tổng số cư dân đang lưu trú (STAYED): ${activeOccupants.length} người
   - Danh sách chi tiết các phòng TRỐNG (${availableRoomList.length} phòng): ${availableRoomList.length > 0 ? JSON.stringify(availableRoomList) : 'Không còn phòng trống'}
   - Danh sách chi tiết các phòng ĐANG THUÊ (${occupiedRoomList.length} phòng): ${occupiedRoomList.length > 0 ? JSON.stringify(occupiedRoomList) : 'Chưa có phòng đang thuê'}
   - Danh sách các phòng ĐANG BẢO TRÌ (${maintenanceRoomList.length} phòng): ${maintenanceRoomList.length > 0 ? JSON.stringify(maintenanceRoomList) : 'Không có phòng bảo trì'}

3. Bảng giá dịch vụ đang áp dụng tại tòa nhà:
   - ${servicePrices.length > 0 ? JSON.stringify(servicePrices) : 'Chưa thiết lập giá dịch vụ'}

4. Tình hình Hợp đồng & Chấm dứt hợp đồng:
   - Hợp đồng đang hiệu lực (ACTIVE): ${activeContracts.length} hợp đồng
   - Hợp đồng nháp chờ khách kích hoạt (DRAFT): ${draftContracts.length} hợp đồng
   - Hợp đồng sắp hết hạn trong 60 ngày tới: ${expiringContractList.length} hợp đồng -> Chi tiết: ${expiringContractList.length > 0 ? JSON.stringify(expiringContractList) : 'Không có'}
   - Đơn chấm dứt hợp đồng đang xử lý: ${activeTerminations.length > 0 ? JSON.stringify(activeTerminations) : 'Không có đơn chấm dứt nào đang xử lý'}
   - Hợp đồng đã kết thúc tự nhiên chờ hoàn cọc (UC-45): ${refundableEndedContracts.length > 0 ? JSON.stringify(refundableEndedContracts) : 'Không có hợp đồng nào đang nợ hoàn cọc'}

5. Tình hình Doanh thu, Hóa đơn & Công nợ của tòa:
   - Thực thu hóa đơn đã thanh toán (PAID) trong tháng này: ${formatMoneyVn(revenueThisMonth)} (${paidThisMonthInvoices.length} hóa đơn)
   - Hóa đơn NHÁP chưa gửi cho khách (DRAFT): ${draftInvoices.length} hóa đơn -> Chi tiết: ${draftInvoiceSummary.length > 0 ? JSON.stringify(draftInvoiceSummary) : 'Không có bản nháp tồn đọng'}
   - Hóa đơn đã gửi đang chờ thanh toán (PENDING): ${pendingInvoices.length} hóa đơn (Tổng tiền chờ thu: ${formatMoneyVn(totalPendingAmount)}) -> Chi tiết: ${pendingSummary.length > 0 ? JSON.stringify(pendingSummary) : 'Không có'}
   - Trong đó, HÓA ĐƠN QUÁ HẠN (Overdue): ${overdueInvoices.length} hóa đơn với tổng nợ quá hạn ${formatMoneyVn(totalOverdueAmount)} -> Chi tiết: ${overdueSummary.length > 0 ? JSON.stringify(overdueSummary) : 'Không có phòng nào nợ quá hạn'}

6. Tình hình Sự cố phòng cần xử lý (${openIncidents.length} sự cố đang mở):
   - Chi tiết sự cố đang chờ / đang sửa: ${openIncidentSummary.length > 0 ? JSON.stringify(openIncidentSummary) : 'Tất cả sự cố trong tòa đã được giải quyết xong.'}

===================================================================
PHẦN 2: CẨM NANG QUY TRÌNH & QUYỀN HẠN NGHIỆP VỤ DÀNH CHO MANAGER
===================================================================
1. PHẠM VI QUYỀN HẠN CỦA MANAGER (BR-030, BR-031):
   - Manager chỉ quản lý duy nhất tòa nhà ${building.name} được Admin phân công.
   - Manager KHÔNG có quyền tạo/xóa phòng, KHÔNG tự chuyển trạng thái phòng giữa AVAILABLE và MAINTENANCE (quyền của Admin - UC-17), và KHÔNG tự chỉnh sửa đơn giá dịch vụ tòa nhà (quyền của Admin - UC-22).

2. QUY TRÌNH CHO THUÊ & KÍCH HOẠT HỢP ĐỒNG (UC-24..27, UC-06, UC-46):
   - Bước 1: Chọn phòng đang trống (AVAILABLE) -> Tạo hợp đồng mới (trạng thái DRAFT). Mỗi phòng chỉ có tối đa 1 hợp đồng DRAFT hoặc ACTIVE (BR-061). Hợp đồng tự động chụp (snapshot) giá thuê và tiền cọc của phòng tại thời điểm tạo (BR-062).
   - Bước 2: Hệ thống gửi email chứa link kích hoạt có hiệu lực 24h cho người đại diện. Khi khách mở link, đặt mật khẩu và tích xác nhận điện tử: Hợp đồng chuyển sang ACTIVE, phòng chuyển sang OCCUPIED.
   - Nếu khách chưa kích hoạt hoặc link hết hạn: Manager có thể bấm "Gửi lại lời mời" hoặc "Hủy hợp đồng nháp (UC-46)".
   - Lưu ý khách cũ thuê lại: Nếu khách cũ có tài khoản INACTIVE quay lại thuê, hệ thống sẽ tự mở lại tài khoản cũ. Nếu khách từng bị chấm dứt đơn phương (tài khoản LOCKED - danh sách đen), hệ thống sẽ chặn không cho phép tạo hợp đồng.

3. QUY TRÌNH QUẢN LÝ CƯ DÂN & NGƯỜI Ở CÙNG (UC-30..33):
   - Tổng số cư dân đang ở (STAYED) của một hợp đồng không được vượt quá sức chứa tối đa (capacity) của loại phòng đó.
   - Chỉ người đại diện mới có tài khoản đăng nhập. Khi có người ở cùng mới chuyển vào hoặc dọn đi, Manager thực hiện "Thêm người ở cùng (UC-32)" hoặc "Cho người ở cùng rời đi (UC-33 -> chuyển sang LEFT)".

4. QUY TRÌNH LẬP, GỬI & QUẢN LÝ HÓA ĐƠN (UC-34..37, BR-095):
   - Tạo hóa đơn tháng (đơn lẻ hoặc hàng loạt): Hệ thống tự lấy giá phòng + dịch vụ cố định + tính tiền điện/nước theo chỉ số mới trừ chỉ số cũ. Hóa đơn mới tạo ở trạng thái DRAFT (khách thuê chưa nhìn thấy).
   - Gửi hóa đơn (UC-35): Sau khi rà soát, Manager bấm "Gửi hóa đơn" -> Trạng thái chuyển sang PENDING, hệ thống gán ngày gửi (sentAt), hạn nộp (dueDate = sentAt + 7 ngày), sinh mã QR VietQR (SePay) và báo cho khách.
   - Khi còn ở trạng thái DRAFT, Manager có thể sửa chỉ số; khi đã gửi (PENDING) nếu sai sót thì phải Hủy hóa đơn (CANCELLED - UC-37) kèm lý do rồi lập lại.

5. QUY TRÌNH CHẤM DỨT HỢP ĐỒNG & XỬ LÝ VI PHẠM (UC-28, UC-29):
   - Hợp đồng đang có đơn chấm dứt vẫn giữ trạng thái ACTIVE cho đến ngày hiệu lực (effectiveDate). Mỗi hợp đồng chỉ có tối đa 1 đơn PENDING.
   - Hình thức 1 - Hai bên thỏa thuận (MUTUAL - UC-28): Khi khách xin chuyển ra sớm hoặc hai bên thống nhất kết thúc hợp đồng -> Manager tạo đơn MUTUAL -> Khách bấm "Xác nhận điện tử" (nếu khách không bấm, hệ thống nhắc ngày 1, 3, 6 và tự động CONFIRMED sau 7 ngày). Đến ngày hiệu lực: Hợp đồng ENDED, phòng AVAILABLE, cư dân LEFT, khách KHÔNG được hoàn cọc.
   - Hình thức 2 - Đơn phương chấm dứt (UNILATERAL - UC-29): Khi khách nợ hóa đơn quá hạn kéo dài (thường 5-7 ngày sau hạn) hoặc vi phạm nội quy nghiêm trọng -> Manager tạo đơn UNILATERAL ghi rõ lý do vi phạm để trình Admin phê duyệt. Khi Admin duyệt (CONFIRMED) và đến ngày hiệu lực: Hợp đồng ENDED, khách mất toàn bộ tiền cọc, và sau 24h tài khoản khách bị khóa vĩnh viễn (LOCKED).

6. QUY TRÌNH HOÀN CỌC KHI HẾT HẠN TỰ NHIÊN (UC-45, BR-073, BR-130, BR-131):
   - Chỉ những hợp đồng kết thúc tự nhiên (ENDED do hết endDate mà KHÔNG có đơn chấm dứt CONFIRMED nào) mới được phép hoàn cọc.
   - Manager kiểm tra đối soát các hóa đơn còn nợ, hoàn trả đủ 100% số tiền cọc ghi trên hợp đồng bằng tiền mặt và bấm "Xác nhận hoàn cọc" trên hệ thống (chỉ thực hiện 1 lần, hệ thống tự gửi email biên nhận cho khách). Mọi hư hỏng tài sản thu qua dòng phí phát sinh (EXTRA) trên hóa đơn cuối, không khấu trừ vào tiền cọc.

===================================================================
PHẦN 3: RÀO CHẮN BẢO MẬT & NGUYÊN TẮC TRẢ LỜI
===================================================================
1. Bạn CHỈ trả lời số liệu trong phạm vi tòa nhà ${building.name}.
2. Khi Quản lý hỏi về phòng trống, phòng đang thuê, hóa đơn nháp, nợ quá hạn, sự cố hay hợp đồng sắp hết hạn: Hãy trích xuất chính xác từng mã phòng, tên khách, số điện thoại, số tiền từ PHẦN 1.
3. Khi Quản lý nhờ soạn thông báo (UC-40: thông báo cắt điện/nước, nhắc đóng tiền phòng, kiểm tra PCCC, nghỉ lễ...): Hãy soạn văn bản trang trọng, rõ ràng, điền sẵn tên tòa nhà "${building.name}" và thông tin liên hệ của Quản lý "${managerProfile?.name || ''} (${managerProfile?.phone || ''})" để Quản lý có thể sao chép gửi ngay.`;
};

/**
 * ============================================================================
 * 3. NGỮ CẢNH & CẨM NANG QUẢN TRỊ CHO CHỦ NHÀ TRỌ (ADMIN - ROLE 0)
 * Phạm vi dữ liệu: Toàn quyền truy cập bức tranh tổng thể chuỗi tòa nhà,
 * tài chính vĩ mô, hiệu suất các Manager và các đơn chấm dứt đơn phương chờ duyệt.
 * ============================================================================
 */
const buildAdminContext = async () => {
    const buildings = await Building.find({ isDeleted: false }).sort({ createdAt: 1 }).lean();
    const rooms = await Room.find({ isDeleted: false }).lean();
    const roomTypes = await RoomType.find({ isDeleted: false }).lean();
    const services = await Service.find({ isDeleted: false }).lean();
    const contracts = await Contract.find().lean();
    const activeOccupants = await Occupant.find({ status: OCCUPANT_STATUS.STAYED }).lean();
    const managerUsers = await User.find({ roleId: ROLE.MANAGER }).lean();
    const managerProfiles = await Manager.find().lean();
    const allInvoices = await Invoice.find().lean();
    const openIncidents = await Incident.find({
        status: { $in: [INCIDENT_STATUS.PENDING, INCIDENT_STATUS.IN_PROGRESS] },
    }).lean();
    const pendingUnilateralTerminations = await TerminationRequest.find({
        type: TERMINATION_TYPE.UNILATERAL,
        status: TERMINATION_STATUS.PENDING,
    })
        .sort({ createdAt: -1 })
        .lean();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const mgrProfileByUserId = new Map(managerProfiles.map((m) => [String(m.userId), m]));
    const buildingByManagerId = new Map(
        buildings.filter((b) => b.managerId).map((b) => [String(b.managerId), b]),
    );
    const roomById = new Map(rooms.map((r) => [String(r._id), r]));
    const buildingById = new Map(buildings.map((b) => [String(b._id), b]));
    const contractById = new Map(contracts.map((c) => [String(c._id), c]));

    // Thống kê chi tiết từng tòa nhà
    const buildingStats = buildings.map((b) => {
        const bRooms = rooms.filter((r) => String(r.buildingId) === String(b._id));
        const bRoomIds = new Set(bRooms.map((r) => String(r._id)));

        const occupied = bRooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED).length;
        const available = bRooms.filter((r) => r.status === ROOM_STATUS.AVAILABLE).length;
        const maintenance = bRooms.filter((r) => r.status === ROOM_STATUS.MAINTENANCE).length;
        const total = bRooms.length;
        const occRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

        const bContracts = contracts.filter((c) => bRoomIds.has(String(c.roomId)));
        const bContractIds = new Set(bContracts.map((c) => String(c._id)));
        const bActiveContracts = bContracts.filter((c) => c.status === CONTRACT_STATUS.ACTIVE);
        const bActiveContractIds = new Set(bActiveContracts.map((c) => String(c._id)));

        const bResidents = activeOccupants.filter((o) => bActiveContractIds.has(String(o.contractId))).length;

        const bInvoices = allInvoices.filter((i) => bContractIds.has(String(i.contractId)));
        const bPaidThisMonth = bInvoices
            .filter((i) => i.status === INVOICE_STATUS.PAID && i.paidAt && new Date(i.paidAt) >= startOfMonth)
            .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
        const bPaidTotal = bInvoices
            .filter((i) => i.status === INVOICE_STATUS.PAID)
            .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

        const bPendingInvoices = bInvoices.filter(
            (i) => i.status === INVOICE_STATUS.PENDING && i.sentAt != null,
        );
        const bOverdueInvoices = bPendingInvoices.filter((i) => i.dueDate && new Date(i.dueDate) < now);
        const bOverdueAmount = bOverdueInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

        const bIncidents = openIncidents.filter((inc) => bRoomIds.has(String(inc.roomId))).length;

        const mgr = b.managerId ? mgrProfileByUserId.get(String(b.managerId)) : null;

        return {
            buildingName: b.name,
            address: b.address,
            floors: b.floorCount,
            manager: mgr ? `${mgr.name} (SĐT: ${mgr.phone})` : 'CHƯA PHÂN CÔNG QUẢN LÝ',
            totalRooms: total,
            occupiedRooms: occupied,
            availableRooms: available,
            maintenanceRooms: maintenance,
            occupancyRate: `${occRate}%`,
            activeResidents: bResidents,
            revenueThisMonth: formatMoneyVn(bPaidThisMonth),
            totalCumulativeRevenue: formatMoneyVn(bPaidTotal),
            overdueInvoiceCount: bOverdueInvoices.length,
            overdueAmount: formatMoneyVn(bOverdueAmount),
            openIncidentCount: bIncidents,
        };
    });

    // Danh sách đội ngũ Manager
    const managerRoster = managerUsers.map((u) => {
        const profile = mgrProfileByUserId.get(String(u._id));
        const assignedBuilding = buildingByManagerId.get(String(u._id));
        return {
            name: profile?.name || 'Chưa cập nhật tên',
            email: u.email,
            phone: profile?.phone || '—',
            status:
                u.status === USER_STATUS.ACTIVE
                    ? 'Đang hoạt động (ACTIVE)'
                    : u.status === USER_STATUS.PENDING
                        ? 'Chờ kích hoạt link (PENDING)'
                        : 'Đang bị khóa (LOCKED)',
            assignedBuilding: assignedBuilding ? assignedBuilding.name : 'Chưa phân công tòa nhà',
        };
    });

    // Đơn chấm dứt đơn phương (UNILATERAL) đang chờ Admin phê duyệt (UC-29)
    const unilateralPendingList = pendingUnilateralTerminations.map((t) => {
        const c = contractById.get(String(t.contractId));
        const r = c ? roomById.get(String(c.roomId)) : null;
        const b = r ? buildingById.get(String(r.buildingId)) : null;
        return {
            buildingName: b?.name || '—',
            roomNumber: r?.roomNumber || '—',
            representativeCccd: c?.representativeCccd || '—',
            reason: t.reason,
            effectiveDate: formatDateVn(t.effectiveDate),
            createdAt: formatDateVn(t.createdAt),
        };
    });

    // Tài chính tổng hợp toàn chuỗi
    const paidInvoicesAll = allInvoices.filter((i) => i.status === INVOICE_STATUS.PAID);
    const paidInvoicesThisMonth = paidInvoicesAll.filter(
        (i) => i.paidAt && new Date(i.paidAt) >= startOfMonth,
    );
    const pendingSentInvoicesAll = allInvoices.filter(
        (i) => i.status === INVOICE_STATUS.PENDING && i.sentAt != null,
    );
    const overdueInvoicesAll = pendingSentInvoicesAll.filter(
        (i) => i.dueDate && new Date(i.dueDate) < now,
    );

    const totalRevenueThisMonth = paidInvoicesThisMonth.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalRevenueAllTime = paidInvoicesAll.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalPendingReceivable = pendingSentInvoicesAll.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalOverdueDebt = overdueInvoicesAll.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const totalOccupiedRooms = rooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED).length;
    const totalAvailableRooms = rooms.filter((r) => r.status === ROOM_STATUS.AVAILABLE).length;
    const totalMaintenanceRooms = rooms.filter((r) => r.status === ROOM_STATUS.MAINTENANCE).length;
    const chainOccupancyRate = rooms.length > 0 ? Math.round((totalOccupiedRooms / rooms.length) * 100) : 0;

    return `Bạn là Housify AI Assistant - Cố vấn phân tích chiến lược & Quản trị hệ thống cấp cao dành riêng cho Chủ nhà trọ (Admin).

===================================================================
PHẦN 1: BỨC TRANH DỮ LIỆU TOÀN HỆ THỐNG HOUSIFY (THỜI GIAN THỰC)
===================================================================
1. Chỉ số quy mô & Lấp đầy toàn chuỗi:
   - Tổng số tòa nhà cơ sở đang hoạt động: ${buildings.length} tòa nhà
   - Tổng số phòng toàn hệ thống: ${rooms.length} phòng
     + Đang cho thuê (OCCUPIED): ${totalOccupiedRooms} phòng (Tỷ lệ lấp đầy toàn chuỗi: ${chainOccupancyRate}%)
     + Phòng trống sẵn sàng (AVAILABLE): ${totalAvailableRooms} phòng
     + Đang bảo trì (MAINTENANCE): ${totalMaintenanceRooms} phòng
   - Tổng số hợp đồng đang hiệu lực (ACTIVE): ${contracts.filter((c) => c.status === CONTRACT_STATUS.ACTIVE).length} hợp đồng
   - Tổng số cư dân đang lưu trú (STAYED): ${activeOccupants.length} người
   - Danh mục loại phòng chung (${roomTypes.length} loại): ${roomTypes.map((rt) => `${rt.name} (tối đa ${rt.capacity} người)`).join(', ')}
   - Danh mục dịch vụ chung (${services.length} dịch vụ): ${services.map((s) => `${s.name} (${s.unit} - ${s.isFixed ? 'Cố định' : 'Theo chỉ số'})`).join(', ')}

2. Chỉ số Tài chính & Công nợ toàn chuỗi:
   - Doanh thu thực thu (PAID) trong tháng hiện tại: ${formatMoneyVn(totalRevenueThisMonth)} (${paidInvoicesThisMonth.length} hóa đơn)
   - Tổng doanh thu thực thu lũy kế toàn hệ thống: ${formatMoneyVn(totalRevenueAllTime)} (${paidInvoicesAll.length} hóa đơn)
   - Tổng tiền hóa đơn đang chờ khách thanh toán (PENDING): ${formatMoneyVn(totalPendingReceivable)} (${pendingSentInvoicesAll.length} hóa đơn)
   - Tổng công nợ QUÁ HẠN chưa thu hồi: ${formatMoneyVn(totalOverdueDebt)} (${overdueInvoicesAll.length} hóa đơn trễ hạn)

3. Bảng phân tích chi tiết từng Tòa nhà cơ sở:
${JSON.stringify(buildingStats, null, 2)}

4. Đội ngũ Nhân sự Quản lý tòa nhà (Managers - ${managerRoster.length} nhân sự):
${JSON.stringify(managerRoster, null, 2)}

5. Hạng mục cần Admin phê duyệt / chỉ đạo ngay:
   - Đơn chấm dứt hợp đồng ĐƠN PHƯƠNG (UNILATERAL) đang chờ Admin duyệt (UC-29): ${unilateralPendingList.length} đơn -> Chi tiết: ${unilateralPendingList.length > 0 ? JSON.stringify(unilateralPendingList) : 'Hiện không có đơn chấm dứt đơn phương nào chờ duyệt.'}
   - Tổng số sự cố phòng đang mở trên toàn chuỗi: ${openIncidents.length} sự cố.

===================================================================
PHẦN 2: CẨM NANG QUYỀN HẠN & QUY TẮC QUẢN TRỊ DÀNH CHO ADMIN
===================================================================
1. QUYỀN HẠN ĐỘC QUYỀN CỦA ADMIN (CHỦ NHÀ TRỌ):
   - Quản trị Cơ sở hạ tầng (UC-12..20): Chỉ Admin mới có quyền tạo/sửa/xóa tòa nhà, quản lý số tầng, tạo loại phòng, tạo/sửa/xóa phòng và chuyển đổi trạng thái phòng giữa AVAILABLE <-> MAINTENANCE (Manager không được phép đổi trạng thái phòng sang bảo trì).
   - Quản trị Dịch vụ & Định giá (UC-21, UC-22, BR-057, BR-058): Chỉ Admin mới có quyền tạo dịch vụ (cố định hoặc theo chỉ số) và thiết lập bảng giá dịch vụ riêng cho từng tòa nhà theo ngày hiệu lực (effectiveFrom). Khi lập hóa đơn, hệ thống tự động lấy đơn giá có effectiveFrom gần nhất <= ngày lập và lưu cứng (snapshot) vào hóa đơn.
   - Quản trị Nội quy (UC-23): Thiết lập và cập nhật nội quy cho từng tòa nhà.

2. QUẢN TRỊ NHÂN SỰ MANAGER (UC-08..11, BR-030, BR-031):
   - Tạo tài khoản Manager mới (UC-08): Hệ thống gửi link kích hoạt qua email để Manager tự đặt mật khẩu (chuyển từ PENDING -> ACTIVE). Khi tài khoản Manager còn ở trạng thái PENDING thì Admin có thể xóa cứng (UC-09).
   - Phân công tòa nhà (UC-11): Quy tắc 1-1 nghiêm ngặt — Mỗi tòa nhà có tối đa 01 Manager, và mỗi Manager chỉ phụ trách tối đa 01 tòa nhà (BR-030, BR-031).
   - Khóa / Mở khóa Manager (UC-10): Admin có quyền khóa (LOCKED) hoặc mở khóa (ACTIVE) tài khoản Manager bất kỳ lúc nào (mỗi request hệ thống đều kiểm tra lại trạng thái tài khoản, bị khóa sẽ bị đăng xuất ngay lập tức - BR-027).

3. PHÊ DUYỆT CHẤM DỨT HỢP ĐỒNG ĐƠN PHƯƠNG (UNILATERAL - UC-29, BR-073):
   - Khi khách thuê vi phạm nghiêm trọng (nợ tiền phòng quá hạn kéo dài không đóng, vi phạm pháp luật/nội quy nặng), Manager sẽ lập Đơn chấm dứt đơn phương (UNILATERAL) đệ trình lên Admin.
   - Chỉ Admin mới có thẩm quyền Duyệt (CONFIRMED) hoặc Từ chối (REJECTED) đơn này.
   - Hệ quả pháp lý & hệ thống khi Admin Duyệt: Đến ngày hiệu lực (effectiveDate), hợp đồng tự động kết thúc (ENDED), phòng trả về AVAILABLE, khách thuê MẤT TOÀN BỘ TIỀN CỌC (BR-073), và sau 24 giờ tài khoản của khách thuê đó sẽ bị KHÓA VĨNH VIỄN (LOCKED - đưa vào danh sách đen, chặn không cho thuê lại ở bất kỳ cơ sở nào của Housify).

===================================================================
PHẦN 3: NGUYÊN TẮC TƯ VẤN & PHÂN TÍCH CHIẾN LƯỢC CỦA AI
===================================================================
1. Trả lời chính xác tuyệt đối dựa trên số liệu thực tế tại PHẦN 1 và quy tắc quản trị tại PHẦN 2.
2. Khi Admin hỏi về doanh thu, tỷ lệ lấp đầy, công nợ hoặc so sánh các cơ sở: Hãy lập luận sắc bén, đối chiếu số liệu cụ thể giữa các tòa nhà, chỉ rõ cơ sở nào đang hoạt động hiệu quả nhất, cơ sở nào còn nhiều phòng trống hoặc tồn đọng nợ quá hạn cần đôn đốc Manager.
3. Chủ động nhắc Admin nếu có đơn chấm dứt đơn phương (UNILATERAL) đang chờ duyệt hoặc có tòa nhà chưa được phân công Manager.`;
};

/**
 * Gọi Gemini API với chiến lược Fallback Cascade 4 tầng chống quá tải
 */
const executeGeminiWithFallback = async ({ systemInstruction, contents }) => {
    if (!env.GEMINI_API_KEY) {
        return {
            reply: 'Hệ thống AI hiện chưa được cấu hình `GEMINI_API_KEY` trong file cấu hình `.env` của máy chủ. Vui lòng thêm API Key để kích hoạt tính năng hỗ trợ thông minh.',
            modelUsed: 'mock-no-key',
        };
    }

    let lastError = null;

    for (const model of GEMINI_MODELS) {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

            const payload = {
                system_instruction: {
                    parts: [{ text: systemInstruction }],
                },
                contents,
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.95,
                    maxOutputTokens: 4096,
                    ...(!model.includes('lite') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
                },
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const status = response.status;
                const errorMsg = errorData.error?.message || response.statusText;
                console.warn(`[Gemini Fallback] Model "${model}" phản hồi HTTP ${status}: ${errorMsg}. Đang tự động chuyển sang model tiếp theo...`);
                lastError = new Error(`Model ${model} HTTP ${status}: ${errorMsg}`);
                continue;
            }

            const result = await response.json();
            const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (candidateText) {
                return {
                    reply: candidateText.trim(),
                    modelUsed: model,
                };
            }

            console.warn(`[Gemini Fallback] Model "${model}" trả về candidate rỗng. Đang thử model tiếp theo...`);
        } catch (error) {
            console.warn(`[Gemini Fallback] Lỗi kết nối tới model "${model}": ${error.message}. Đang thử model tiếp theo...`);
            lastError = error;
        }
    }

    return {
        reply: `Hệ thống AI hiện đang chịu tải cao hoặc đang bảo trì từ Google Gemini (${lastError?.message || 'Không thể kết nối'}). Bạn vui lòng thử lại sau giây lát nhé!`,
        modelUsed: 'all-overloaded',
    };
};

/**
 * Xử lý yêu cầu trò chuyện AI
 */
export const chatWithGemini = async ({ user, message, history = [] }) => {
    // 1. Trích xuất ngữ cảnh nghiệp vụ phân quyền theo Role (user.role từ auth middleware hoặc user.roleId)
    let systemInstruction = '';
    const userRole = Number(user?.role !== undefined ? user.role : user?.roleId);

    if (userRole === ROLE.CUSTOMER) {
        systemInstruction = await buildCustomerContext(user);
    } else if (userRole === ROLE.MANAGER) {
        systemInstruction = await buildManagerContext(user);
    } else if (userRole === ROLE.ADMIN) {
        systemInstruction = await buildAdminContext(user);
    } else {
        throw new AppError('Vai trò của bạn không được phép sử dụng tính năng này', 403);
    }

    // 2. Định dạng lịch sử hội thoại đúng chuẩn Gemini API
    const contents = [
        ...history.map((h) => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }],
        })),
        {
            role: 'user',
            parts: [{ text: message }],
        },
    ];

    // 3. Thực thi qua bộ lọc Fallback 4 Model
    const { reply, modelUsed } = await executeGeminiWithFallback({
        systemInstruction,
        contents,
    });

    return {
        reply,
        modelUsed,
        roleId: userRole,
    };
};

