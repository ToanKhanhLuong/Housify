// Tính trên lịch sử giá dịch vụ của một tòa (UC-22). So ngày dạng yyyy-MM-dd để bỏ giờ, múi giờ
import { toDateInput } from '../../utils/format';

// mới nhất trước
export const sortPrices = (prices) =>
    [...prices].sort((a, b) =>
        toDateInput(b.effectiveFrom).localeCompare(toDateInput(a.effectiveFrom)),
    );

// mức giá đang áp dụng = ngày bắt đầu gần nhất mà không sau hôm nay (giống cách BE chọn giá, BR-057)
export const getCurrentPrice = (prices) => {
    const today = toDateInput(new Date());
    return sortPrices(prices).find((price) => toDateInput(price.effectiveFrom) <= today) ?? null;
};
