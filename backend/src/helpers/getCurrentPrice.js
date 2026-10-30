// Lấy đơn giá dịch vụ đang hiệu lực của một tòa tại một ngày (BR-057) – module invoice dùng khi lập hóa đơn (UC-34)
import ServicePrice from '../models/ServicePrice.js';

/**
 * Mức giá có effectiveFrom gần nhất mà không sau `date`.
 * effectiveFrom luôn lưu là 00:00 giờ Việt Nam (xem helpers/date.js) nên giá mới có hiệu lực ngay từ đầu ngày.
 * Trả về bản ghi service_prices hoặc null nếu chưa có giá áp dụng tại ngày đó
 * (invoice tự cảnh báo và dùng giá 0 – UC-34 E03).
 * session: truyền vào khi gọi bên trong withTransaction.
 */
export const getCurrentPrice = async (serviceId, buildingId, date = new Date(), session) =>
    ServicePrice.findOne({
        serviceId,
        buildingId,
        effectiveFrom: { $lte: date },
    })
        .sort({ effectiveFrom: -1 })
        .session(session ?? null);
