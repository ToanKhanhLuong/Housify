// Tiện ích xử lý bộ lọc và gom nhóm mảng cho ControlBar và trang danh sách

/**
 * Chuyển filters object thành query params chuẩn docs/api.md
 * Multi-select mảng -> 'val1,val2', boolean -> 'true'/'false'
 */
export const formatFilterQuery = (filters = {}) => {
    const params = {};
    Object.entries(filters).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '') return;
        if (Array.isArray(val)) {
            if (val.length > 0) {
                params[key] = val.join(',');
            }
        } else if (typeof val === 'boolean') {
            params[key] = String(val);
        } else {
            params[key] = String(val);
        }
    });
    return params;
};

/**
 * Gom nhóm một mảng đối tượng theo một key hoặc hàm lấy key
 * @returns Array of { key, label, items }
 */
export const groupArrayBy = (items = [], keyOrFn) => {
    if (!keyOrFn) return [{ key: 'all', label: 'Tất cả', items }];
    const fn = typeof keyOrFn === 'function' ? keyOrFn : (item) => item[keyOrFn];
    const map = new Map();

    items.forEach((item) => {
        const key = fn(item) ?? 'Khác';
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(item);
    });

    return Array.from(map.entries()).map(([key, groupItems]) => ({
        key,
        label: String(key),
        items: groupItems,
    }));
};
