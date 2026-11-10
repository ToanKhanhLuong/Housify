// Tiện ích xử lý bộ lọc, gom nhóm mảng và lưu trạng thái danh sách cho ControlBar và trang danh sách
import { useCallback, useEffect, useState } from 'react';

// Lưu state bộ lọc / tìm kiếm / trang / chế độ xem trong bộ nhớ JS khi chuyển trang SPA.
// Khi tải lại trình duyệt (F5) hoặc đăng xuất, bộ nhớ này tự động về mặc định.
const savedStateStore = new Map();

if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', () => savedStateStore.clear());
}

export const clearSavedFilterStates = () => {
    savedStateStore.clear();
};

/**
 * Giữ state trong bộ nhớ JS khi điều hướng qua lại giữa danh sách và chi tiết (SPA),
 * tự động reset về initialValue khi người dùng ấn F5 tải lại trang.
 */
export const useSavedState = (key, initialValue) => {
    const [state, setState] = useState(() => {
        if (savedStateStore.has(key)) {
            return savedStateStore.get(key);
        }
        return typeof initialValue === 'function' ? initialValue() : initialValue;
    });

    useEffect(() => {
        savedStateStore.set(key, state);
    }, [key, state]);

    const setSavedState = useCallback(
        (nextValue) => {
            setState((prev) => {
                const resolved = typeof nextValue === 'function' ? nextValue(prev) : nextValue;
                savedStateStore.set(key, resolved);
                return resolved;
            });
        },
        [key],
    );

    return [state, setSavedState];
};

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
