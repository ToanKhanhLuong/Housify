// Nghiệp vụ cho module gemini: Trợ lý ảo AI thông minh Housify (Hỗ trợ 3 vai trò Admin, Manager, Customer)
// Kiến trúc Context-Injection (RAG mức dịch vụ) an toàn, phân quyền nghiêm ngặt, rào 4 model dự phòng chống quá tải.
import { env } from '../../config/env.js';
import {
    ROLE,
    OCCUPANT_STATUS,
    CONTRACT_STATUS,
    ROOM_STATUS,
    INVOICE_STATUS,
    INCIDENT_STATUS,
} from '../../constants/enums.js';
import { AppError } from '../../utils/AppError.js';
import Building from '../../models/Building.js';
import Room from '../../models/Room.js';
import RoomType from '../../models/RoomType.js';
import Contract from '../../models/Contract.js';
import Occupant from '../../models/Occupant.js';
import Invoice from '../../models/Invoice.js';
import Incident from '../../models/Incident.js';
import Manager from '../../models/Manager.js';

// Danh sách các model Gemini ưu tiên từ mới nhất xuống model dự phòng
const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
];

const formatMoneyVn = (amount) => {
    if (typeof amount !== 'number') return '0 đ';
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
 * Trích xuất ngữ cảnh riêng cho Khách thuê (Customer)
 * Ràng buộc an toàn: Chỉ đọc dữ liệu phòng, hợp đồng, hóa đơn và sự cố của CHÍNH KHÁCH NÀY.
 */
const buildCustomerContext = async (user) => {
    const userId = user._id || user.id;
    // Tìm cư dân đại diện theo userId
    const occupant = await Occupant.findOne({
        userId,
        $or: [{ status: OCCUPANT_STATUS.STAYED }, { isRepresentative: true }],
    })
        .sort({ createdAt: -1 })
        .lean();

    if (!occupant) {
        return `Bạn là Housify AI Assistant.
Khách hàng này hiện chưa có phòng đang thuê hoặc hợp đồng đã kết thúc.
Nếu khách hỏi về hóa đơn hay phòng, hãy thông báo lịch sự rằng hiện họ chưa có hợp đồng thuê phòng nào đang có hiệu lực và hướng dẫn liên hệ Quản lý tòa nhà để được hỗ trợ.`;
    }

    const contract = await Contract.findOne({
        _id: occupant.contractId,
        status: CONTRACT_STATUS.ACTIVE,
    }).lean();

    let room = null;
    let roomType = null;
    let building = null;
    let coOccupants = [];
    let invoices = [];
    let incidents = [];

    if (contract) {
        room = await Room.findById(contract.roomId).lean();
        if (room) {
            roomType = await RoomType.findById(room.roomTypeId).lean();
            building = await Building.findById(room.buildingId).lean();
            incidents = await Incident.find({ roomId: room._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean();
        }

        coOccupants = await Occupant.find({
            contractId: contract._id,
            status: OCCUPANT_STATUS.STAYED,
        }).lean();

        invoices = await Invoice.find({ contractId: contract._id })
            .sort({ month: -1 })
            .limit(6)
            .lean();
    }

    const pendingInvoices = invoices.filter((i) => i.status === INVOICE_STATUS.PENDING);
    const totalDebt = pendingInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    const invoiceSummary = invoices.map((inv) => ({
        code: inv.invoiceCode,
        month: inv.month,
        amount: formatMoneyVn(inv.amount),
        status: inv.status === INVOICE_STATUS.PAID ? 'Đã thanh toán' : 'Chưa thanh toán (Chờ nộp)',
        dueDate: formatDateVn(inv.dueDate),
    }));

    const incidentSummary = incidents.map((inc) => ({
        code: inc.incidentCode || inc._id,
        title: inc.title,
        status: inc.status,
        createdAt: formatDateVn(inc.createdAt),
    }));

    return `Bạn là Housify AI Assistant - Trợ lý thông minh cho cư dân phòng ${room?.roomNumber || '—'} thuộc ${building?.name || 'Tòa nhà'}.

DỮ LIỆU THỰC TẾ CỦA KHÁCH HÀNG TỪ HỆ THỐNG HOUSIFY:
- Khách hàng: ${occupant.name} (CCCD: ${occupant.cccd}, SĐT: ${occupant.phone || 'Chưa cập nhật'})
- Tòa nhà: ${building?.name || '—'} (Địa chỉ: ${building?.address || '—'})
- Phòng đang thuê: Phòng ${room?.roomNumber || '—'} (Tầng ${room?.floorNumber || '—'}, Diện tích: ${room?.area || '—'} m², Loại: ${roomType?.name || 'Tiêu chuẩn'})
- Giá thuê phòng: ${formatMoneyVn(contract?.rentPrice || room?.rentPrice || 0)} / tháng
- Tiền đặt cọc hợp đồng: ${formatMoneyVn(contract?.deposit || 0)}
- Hạn hợp đồng: Từ ngày ${formatDateVn(contract?.startDate)} đến hết ngày ${formatDateVn(contract?.endDate)}
- Số người cùng phòng (${coOccupants.length} người): ${coOccupants.map((o) => `${o.name} (${o.relationship || 'Người ở cùng'})`).join(', ')}
- Tình trạng nợ hóa đơn hiện tại: ${pendingInvoices.length > 0 ? `CÒN NỢ ${pendingInvoices.length} HÓA ĐƠN VỚI TỔNG SỐ TIỀN: ${formatMoneyVn(totalDebt)}` : 'Đã hoàn thành mọi khoản tiền phòng, không có nợ'}
- Danh sách hóa đơn gần đây: ${JSON.stringify(invoiceSummary)}
- Lịch sử báo sự cố gần đây: ${JSON.stringify(incidentSummary)}
- Nội quy tòa nhà:
${building?.rules || '• Không gây ồn sau 22:00\n• Để xe đúng nơi quy định\n• Giữ gìn vệ sinh chung'}

RÀO CHẮN BẢO MẬT & QUY TẮC PHẢN HỒI:
1. Bạn CHỈ ĐƯỢC PHÉP trả lời các vấn đề liên quan đến phòng, hợp đồng, hóa đơn, sự cố và nội quy của chính khách hàng này.
2. TUYỆT ĐỐI KHÔNG tiết lộ thông tin của các phòng khác, không tiết lộ doanh thu tòa nhà hoặc thông tin cá nhân của người khác.
3. Khi khách hỏi cách thanh toán: Hướng dẫn khách vào menu "Hóa đơn" trên giao diện để quét mã VietQR tự động thanh toán.
4. Khi khách hỏi cách báo sự cố: Hướng dẫn khách bấm menu "Sự cố" bên trái, bấm "Báo cáo sự cố mới" và đính kèm ảnh chụp.
5. Giọng điệu: Thân thiện, tôn trọng, lịch sự, chuẩn tiếng Việt, dùng Markdown định dạng số tiền rõ ràng.`;
};

/**
 * Trích xuất ngữ cảnh cho Quản lý tòa (Manager)
 * Ràng buộc an toàn: Chỉ đọc dữ liệu trong TÒA NHÀ ĐƯỢC PHÂN CÔNG của Manager này.
 */
const buildManagerContext = async (user) => {
    const userId = user._id || user.id;
    const building = await Building.findOne({
        managerId: userId,
        isDeleted: false,
    }).lean();

    if (!building) {
        return `Bạn là Housify AI Assistant.
Tài khoản Quản lý này hiện chưa được Admin phân công phụ trách tòa nhà nào. Hãy thông báo lịch sự để họ liên hệ Admin phân công cơ sở.`;
    }

    const rooms = await Room.find({ buildingId: building._id, isDeleted: false }).lean();
    const roomIds = rooms.map((r) => r._id);

    const availableRooms = rooms.filter((r) => r.status === ROOM_STATUS.AVAILABLE);
    const occupiedRooms = rooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED);
    const maintenanceRooms = rooms.filter((r) => r.status === ROOM_STATUS.MAINTENANCE);

    // Hóa đơn quá hạn / chờ nộp trong tòa
    const pendingInvoices = await Invoice.find({
        buildingId: building._id,
        status: { $in: [INVOICE_STATUS.PENDING] },
    })
        .sort({ dueDate: 1 })
        .lean();

    const now = new Date();
    const overdueInvoices = pendingInvoices.filter((i) => new Date(i.dueDate) < now);
    const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    // Hợp đồng sắp hết hạn trong 60 ngày tới
    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const expiringContracts = await Contract.find({
        roomId: { $in: roomIds },
        status: CONTRACT_STATUS.ACTIVE,
        endDate: { $gte: now, $lte: in60Days },
    }).lean();

    // Sự cố chưa xử lý
    const openIncidents = await Incident.find({
        buildingId: building._id,
        status: { $in: [INCIDENT_STATUS.PENDING, INCIDENT_STATUS.IN_PROGRESS] },
    }).lean();

    // Thống kê cư dân đang ở
    const totalResidents = await Occupant.countDocuments({
        contractId: { $in: await Contract.find({ roomId: { $in: roomIds }, status: CONTRACT_STATUS.ACTIVE }).distinct('_id') },
        status: OCCUPANT_STATUS.STAYED,
    });

    const availableRoomDetails = availableRooms.slice(0, 10).map((r) => ({
        roomNumber: r.roomNumber,
        floor: r.floorNumber,
        area: `${r.area}m²`,
        price: formatMoneyVn(r.rentPrice),
    }));

    const overdueSummary = overdueInvoices.slice(0, 10).map((i) => ({
        room: i.roomNumber || '—',
        code: i.invoiceCode,
        month: i.month,
        amount: formatMoneyVn(i.amount),
        dueDate: formatDateVn(i.dueDate),
    }));

    return `Bạn là Housify AI Assistant - Trợ lý vận hành thông minh cho Quản lý tòa nhà ${building.name}.

DỮ LIỆU THỰC TẾ THỜI GIAN THỰC CỦA TÒA NHÀ ${building.name} (Địa chỉ: ${building.address}):
- Tổng số phòng: ${rooms.length} phòng
- Tình trạng phòng: Đang thuê ${occupiedRooms.length} phòng (${rooms.length > 0 ? Math.round((occupiedRooms.length / rooms.length) * 100) : 0}%), Trống ${availableRooms.length} phòng, Đang bảo trì ${maintenanceRooms.length} phòng
- Tổng số cư dân đang cư trú: ${totalResidents} người
- Danh sách một số phòng trống sẵn sàng đón khách: ${JSON.stringify(availableRoomDetails)}
- Tình hình nợ quá hạn: Có ${overdueInvoices.length} hóa đơn quá hạn với tổng số tiền nợ là ${formatMoneyVn(totalOverdueAmount)}
- Danh sách các phòng nợ tiêu biểu: ${JSON.stringify(overdueSummary)}
- Hợp đồng sắp hết hạn trong 60 ngày tới: ${expiringContracts.length} hợp đồng
- Sự cố phòng đang chờ kiểm tra / xử lý: ${openIncidents.length} sự cố

RÀO CHẮN BẢO MẬT & NHIỆM VỤ CỦA BẠN:
1. Bạn CHỈ ĐƯỢC PHÉP trả lời số liệu trong phạm vi tòa nhà ${building.name}. KHÔNG trả lời về các cơ sở khác.
2. Trợ giúp quản lý đôn đốc nợ, liệt kê phòng trống và gợi ý các mẫu thông báo chuyên nghiệp (thông báo cắt điện, cắt nước, sửa chữa thang máy, đôn đốc tiền phòng).
3. Đưa ra khuyến nghị thiết thực: Nếu tỷ lệ trống cao, gợi ý đăng tin tuyển khách; nếu có nợ quá hạn, gợi ý gửi thông báo nhắc nợ qua tab "Thông báo chung".
4. Giọng điệu: Chuẩn mực, logic, hỗ trợ nghiệp vụ quản lý chặt chẽ.`;
};

/**
 * Trích xuất ngữ cảnh cho Chủ trọ (Admin)
 * Quyền: Bao quát toàn bộ chuỗi cơ sở, tài chính vĩ mô và so sánh hiệu suất.
 */
const buildAdminContext = async () => {
    const buildings = await Building.find({ isDeleted: false }).lean();
    const rooms = await Room.find({ isDeleted: false }).lean();
    const contracts = await Contract.find({ status: CONTRACT_STATUS.ACTIVE }).lean();
    const managers = await Manager.find().lean();

    const buildingStats = await Promise.all(
        buildings.map(async (b) => {
            const bRooms = rooms.filter((r) => String(r.buildingId) === String(b._id));
            const occupied = bRooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED).length;
            const available = bRooms.filter((r) => r.status === ROOM_STATUS.AVAILABLE).length;
            const total = bRooms.length;
            const occRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
            const mgr = managers.find((m) => String(m.userId) === String(b.managerId));

            return {
                id: b._id,
                name: b.name,
                address: b.address,
                managerName: mgr?.name || 'Chưa phân công',
                totalRooms: total,
                occupiedRooms: occupied,
                availableRooms: available,
                occupancyRate: `${occRate}%`,
            };
        }),
    );

    // Tính tổng nợ toàn chuỗi
    const overdueInvoices = await Invoice.find({
        status: INVOICE_STATUS.PENDING,
        dueDate: { $lt: new Date() },
    }).lean();
    const totalDebtAll = overdueInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    // Tính doanh thu các hóa đơn đã thanh toán tháng hiện tại
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const paidInvoicesThisMonth = await Invoice.find({
        status: INVOICE_STATUS.PAID,
        paidAt: { $gte: startOfMonth },
    }).lean();
    const totalRevenueThisMonth = paidInvoicesThisMonth.reduce((sum, i) => sum + (i.amount || 0), 0);

    return `Bạn là Housify AI Assistant - Cố vấn phân tích chiến lược cấp cao cho Chủ nhà trọ (Admin).

DỮ LIỆU TỔNG QUAN TOÀN HỆ THỐNG HOUSIFY:
- Quy mô toàn chuỗi: ${buildings.length} tòa nhà cơ sở với tổng cộng ${rooms.length} phòng
- Tổng số hợp đồng đang có hiệu lực: ${contracts.length} hợp đồng
- Thực thu từ hóa đơn trong tháng này: ${formatMoneyVn(totalRevenueThisMonth)}
- Tổng công nợ quá hạn chưa thu hồi trên toàn chuỗi: ${formatMoneyVn(totalDebtAll)} (${overdueInvoices.length} hóa đơn trễ hạn)
- Thống kê chi tiết từng tòa nhà cơ sở:
${JSON.stringify(buildingStats, null, 2)}

NHIỆM VỤ CỦA BẠN:
1. Đóng vai trò cố vấn đắc lực cho Chủ nhà trọ: Phân tích hiệu suất lấp đầy, chỉ ra tòa nhà nào có tỷ lệ trống cao nhất cần đẩy mạnh cho thuê.
2. Đánh giá rủi ro công nợ: Cơ sở nào đang tồn đọng nợ nhiều nhất, đề xuất biện pháp thu hồi nợ.
3. So sánh hiệu quả vận hành giữa các cơ sở và công tác phụ trách của các Manager.
4. Giọng điệu: Chiến lược, bao quát, phân tích số liệu sắc bén và có tính hành động cao.`;
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
                    temperature: 0.35,
                    topP: 0.95,
                    maxOutputTokens: 1500,
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
                // Nếu quá tải (429 Too Many Requests, 503 Overloaded, 500) -> Thử model tiếp theo
                if (status === 429 || status === 503 || status === 500) {
                    lastError = new Error(`Model ${model} HTTP ${status}: ${errorData.error?.message || 'Quá tải hạn mức'}`);
                    continue;
                }
                throw new AppError(`Lỗi Gemini API (${model}): ${errorData.error?.message || response.statusText}`, 502);
            }

            const result = await response.json();
            const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (candidateText) {
                return {
                    reply: candidateText.trim(),
                    modelUsed: model,
                };
            }
        } catch (error) {
            if (error instanceof AppError) throw error;
            lastError = error;
        }
    }

    throw new AppError(
        `Toàn bộ các mô hình Gemini (${GEMINI_MODELS.join(', ')}) hiện đang quá tải hoặc gặp sự cố: ${lastError?.message || 'Không thể kết nối'}. Vui lòng thử lại sau giây lát.`,
        503,
    );
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
