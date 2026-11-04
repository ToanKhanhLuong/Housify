// ControlBar kiểu Odoo (theo Main.dc.html):
// - Hàng ngang gồm: Nút thêm/chính bên trái | Ô tìm kiếm đa năng ở giữa (search + facet tags + dropdown filter/group) | Đếm số lượng + Switch chế độ xem Thẻ/Bảng bên phải.
// - Hỗ trợ debounce 300ms, backspace xóa facet cuối khi ô trống.
import { useEffect, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { BiCheck, BiChevronDown, BiFilterAlt, BiGridAlt, BiListUl, BiSearch, BiX } from 'react-icons/bi';

/**
 * Component ControlBar
 *
 * @param {React.ReactNode} actions - Cụm nút thao tác bên trái (vd: <Button variant="primary">Thêm...</Button>)
 * @param {string} searchValue - Giá trị tìm kiếm hiện tại
 * @param {Function} onSearchChange - Callback khi từ khóa tìm kiếm đổi (đã debounce 300ms)
 * @param {string} searchPlaceholder - Placeholder cho ô tìm kiếm
 * @param {Array} filterGroups - Danh sách nhóm bộ lọc:
 *   [{ id: 'status', label: 'Trạng thái', type: 'checkbox'|'radio', options: [{ value, label }] },
 *    { id: 'price', label: 'Giá thuê (đ)', type: 'range', minField: 'minPrice', maxField: 'maxPrice' },
 *    { id: 'month', label: 'Kỳ', type: 'month', max: '2026-11' },   // 1 ô chọn tháng/năm, giá trị 'YYYY-MM'; max tùy chọn
 *    { id: 'paidAt', label: 'Ngày trả', type: 'dateRange', minField: 'from', maxField: 'to' }] // 2 ô ngày, giá trị 'YYYY-MM-DD'




 *   Tùy chọn thêm cho mỗi nhóm:
 *     maxVisible: 5   – checkbox / radio nhiều hơn 5 lựa chọn thì có thanh cuộn (hỗ trợ 3..6)
 *     beside: true    – đặt nhóm này cạnh nhóm ngay trước (2 cột), vd Loại phòng cạnh Trạng thái




 * @param {Object} selectedFilters - Object bộ lọc hiện tại: { status: ['AVAILABLE'], minPrice: 1000000, month: '2026-11' }
 * @param {Function} onFilterChange - Callback khi bộ lọc thay đổi: (newFilters) => void
 * @param {Array} groupByOptions - Danh sách tùy chọn nhóm theo: [{ value: 'floor', label: 'Tầng' }]
 * @param {string} selectedGroupBy - Giá trị nhóm theo hiện tại
 * @param {Function} onGroupByChange - Callback khi nhóm theo thay đổi: (value) => void
 * @param {string|number} count - Số lượng bản ghi hiển thị (vd: 3 hoặc "3 tòa nhà")
 * @param {string} view - Chế độ xem hiện tại ('cards' | 'table')
 * @param {Function} onViewChange - Callback đổi chế độ xem
 * @param {Array} viewOptions - Các nút switch view (mặc định [{ id: 'cards', icon: BiGridAlt, title: 'Thẻ' }, { id: 'table', icon: BiListUl, title: 'Bảng' }])
 */
// maxVisible: nhóm checkbox / radio có nhiều lựa chọn hơn số này thì danh sách có thanh cuộn, chỉ cao đủ maxVisible dòng
// (mỗi dòng hf-opt cao 32px + khoảng cách 2px; lớp Tailwind phải viết sẵn đầy đủ nên chỉ hỗ trợ 3..6)
const MAX_VISIBLE_CLASS = {
    3: 'max-h-[6.5rem]',
    4: 'max-h-[8.625rem]',
    5: 'max-h-[10.75rem]',
    6: 'max-h-[12.875rem]',
};
const scrollClass = (group) =>
    group.maxVisible && (group.options?.length ?? 0) > group.maxVisible
        ? `${MAX_VISIBLE_CLASS[group.maxVisible] ?? MAX_VISIBLE_CLASS[5]} overflow-y-auto pe-1`
        : '';

const ControlBar = ({
    actions,
    searchValue = '',
    onSearchChange,
    searchPlaceholder = 'Tìm kiếm...',
    filterGroups = [],
    selectedFilters = {},
    onFilterChange,
    groupByOptions = [],
    selectedGroupBy = '',
    onGroupByChange,
    count,
    view,
    onViewChange,
    viewOptions,
}) => {
    // Điều chỉnh state khi prop searchValue đổi từ ngoài (theo hướng dẫn React "Adjusting state from props")
    const [prevSearchValue, setPrevSearchValue] = useState(searchValue);
    const [localQuery, setLocalQuery] = useState(searchValue);

    if (searchValue !== prevSearchValue) {
        setPrevSearchValue(searchValue);
        setLocalQuery(searchValue);
    }

    const [panelOpen, setPanelOpen] = useState(false);
    const [rangeDraft, setRangeDraft] = useState({});
    const panelRef = useRef(null);
    const inputRef = useRef(null);

    // Debounce tìm kiếm 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localQuery !== searchValue && onSearchChange) {
                onSearchChange(localQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localQuery, searchValue, onSearchChange]);

    // Đóng dropdown khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setPanelOpen(false);
            }
        };
        if (panelOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [panelOpen]);

    // Xử lý bật/tắt filter checkbox
    const handleToggleCheckbox = (groupId, optionValue) => {
        if (!onFilterChange) return;
        const currentList = Array.isArray(selectedFilters[groupId]) ? [...selectedFilters[groupId]] : [];
        const index = currentList.indexOf(optionValue);
        if (index > -1) {
            currentList.splice(index, 1);
        } else {
            currentList.push(optionValue);
        }
        onFilterChange({
            ...selectedFilters,
            [groupId]: currentList,
        });
    };

    // Xử lý chọn filter radio
    const handleSelectRadio = (groupId, optionValue) => {
        if (!onFilterChange) return;
        const current = selectedFilters[groupId];
        const next = current === optionValue ? null : optionValue;
        onFilterChange({
            ...selectedFilters,
            [groupId]: next,
        });
    };

    // Xử lý áp dụng khoảng số (range)
    const handleApplyRange = (minField, maxField) => {
        if (!onFilterChange) return;
        onFilterChange({
            ...selectedFilters,
            [minField]: rangeDraft[minField] || undefined,
            [maxField]: rangeDraft[maxField] || undefined,
        });
    };

    // Xử lý chọn tháng (month): ô trống = bỏ lọc
    const handleSelectMonth = (groupId, value) => {
        if (!onFilterChange) return;
        onFilterChange({
            ...selectedFilters,
            [groupId]: value || undefined,
        });
    };

    // Xóa một filter cụ thể (từ facet tag)
    const handleRemoveFacet = (facet) => {
        if (facet.type === 'filter-item') {
            const currentList = Array.isArray(selectedFilters[facet.groupId]) ? [...selectedFilters[facet.groupId]] : [];
            const nextList = currentList.filter((v) => v !== facet.value);
            onFilterChange({
                ...selectedFilters,
                [facet.groupId]: nextList,
            });
        } else if (facet.type === 'filter-single') {
            onFilterChange({
                ...selectedFilters,
                [facet.groupId]: undefined,
            });
        } else if (facet.type === 'range') {
            onFilterChange({
                ...selectedFilters,
                [facet.minField]: undefined,
                [facet.maxField]: undefined,
            });
            setRangeDraft((prev) => ({ ...prev, [facet.minField]: '', [facet.maxField]: '' }));
        } else if (facet.type === 'groupby') {
            if (onGroupByChange) onGroupByChange('');
        }
    };

    // Xóa tất cả bộ lọc và gom nhóm
    const handleClearAll = () => {
        if (onFilterChange) onFilterChange({});
        if (onGroupByChange) onGroupByChange('');
        setRangeDraft({});
        setPanelOpen(false);
    };

    // Xây dựng danh sách facets để render tag
    const facets = [];
    filterGroups.forEach((group) => {
        if (group.type === 'checkbox') {
            const vals = selectedFilters[group.id] || [];
            vals.forEach((val) => {
                const opt = group.options?.find((o) => o.value === val);
                facets.push({
                    id: `${group.id}:${val}`,
                    label: opt?.label || String(val),
                    type: 'filter-item',
                    groupId: group.id,
                    value: val,
                });
            });
        } else if (group.type === 'radio') {
            const val = selectedFilters[group.id];
            if (val !== undefined && val !== null && val !== '') {
                const opt = group.options?.find((o) => o.value === val);
                facets.push({
                    id: `${group.id}:${val}`,
                    label: `${group.label}: ${opt?.label || val}`,
                    type: 'filter-single',
                    groupId: group.id,
                    value: val,
                });
            }
        } else if (group.type === 'month') {
            // 'YYYY-MM' → thẻ "Kỳ: 11/2026"; bỏ thẻ dùng chung cách của radio (filter-single)
            const val = selectedFilters[group.id];
            if (val) {
                const [year, month] = val.split('-');
                facets.push({
                    id: `${group.id}:${val}`,
                    label: `${group.label}: ${month}/${year}`,
                    type: 'filter-single',
                    groupId: group.id,
                    value: val,
                });
            }
        } else if (group.type === 'range' || group.type === 'dateRange') {
            // dateRange: 'YYYY-MM-DD' → '01/11/2026' trên thẻ
            const show = (value) =>
                group.type === 'dateRange' && value ? value.split('-').reverse().join('/') : value;
            const min = show(selectedFilters[group.minField]);
            const max = show(selectedFilters[group.maxField]);
            if (min || max) {
                let rangeText = '';
                if (min && max) rangeText = `${min} - ${max}`;
                else if (min) rangeText = `≥ ${min}`;
                else if (max) rangeText = `≤ ${max}`;
                facets.push({
                    id: `${group.minField}:${group.maxField}`,
                    label: `${group.label}: ${rangeText}`,
                    type: 'range',
                    minField: group.minField,
                    maxField: group.maxField,
                });
            }
        }
    });

    if (selectedGroupBy) {
        const opt = groupByOptions.find((o) => o.value === selectedGroupBy);
        if (opt) {
            facets.push({
                id: `groupby:${selectedGroupBy}`,
                label: `Nhóm: ${opt.label}`,
                type: 'groupby',
            });
        }
    }

    // Gom nhóm lọc thành hàng: nhóm có beside: true đứng cạnh nhóm ngay trước (2 cột) cho bảng lọc đỡ dài
    const filterRows = [];
    filterGroups.forEach((group) => {
        if (group.beside && filterRows.length > 0) filterRows[filterRows.length - 1].push(group);
        else filterRows.push([group]);
    });

    // Xử lý phím Backspace xóa facet cuối
    const handleKeyDown = (e) => {
        if (e.key === 'Backspace' && localQuery === '' && facets.length > 0) {
            const lastFacet = facets[facets.length - 1];
            handleRemoveFacet(lastFacet);
        }
    };

    const defaultViewOptions = [
        { id: 'cards', icon: BiGridAlt, title: 'Dạng thẻ' },
        { id: 'table', icon: BiListUl, title: 'Dạng bảng' },
    ];
    const effectiveViewOptions = viewOptions || defaultViewOptions;

    return (
        <div className="flex flex-wrap items-center gap-3 py-3 px-4 bg-white border-bottom">
            {/* Cụm nút thao tác bên trái */}
            {actions && <div className="flex items-center gap-2">{actions}</div>}

            {/* Ô tìm kiếm đa năng ở giữa */}
            <div className="relative flex-1 min-w-[280px] max-w-[680px] mx-auto" ref={panelRef}>
                <div
                    className="hf-search cursor-text"
                    onClick={() => inputRef.current?.focus()}
                >
                    <BiSearch size={16} className="text-gray-500 shrink-0" />

                    {/* Facet tags */}
                    {facets.map((f) => (
                        <span key={f.id} className="hf-facet">
                            <span className={`hf-facet-ic ${f.type === 'groupby' ? 'hf-facet-gb' : ''}`}>
                                <BiFilterAlt size={12} />
                            </span>
                            <span className="px-2 text-xs font-medium text-gray-800">{f.label}</span>
                            <Button
                                variant="secondary"
                                className="hf-facet-x"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFacet(f);
                                }}
                                aria-label="Bỏ lọc"
                            >
                                <BiX size={14} />
                            </Button>
                        </span>
                    ))}

                    <Form.Control
                        plaintext
                        ref={inputRef}
                        value={localQuery}
                        onChange={(e) => setLocalQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={facets.length === 0 ? searchPlaceholder : ''}
                        aria-label="Tìm kiếm"
                    />

                    <Button
                        variant="secondary"
                        className="hf-btn-ghost w-7 h-7 flex items-center justify-center p-0 text-gray-500 hover:text-gray-900 shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            setPanelOpen((prev) => !prev);
                        }}
                        aria-label="Mở bộ lọc"
                    >
                        <BiChevronDown size={18} className={`transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
                    </Button>
                </div>

                {/* Dropdown panel lọc & nhóm theo */}
                {panelOpen && (
                    <div className="hf-drop">
                        <div className={`grid ${groupByOptions.length > 0 ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-1'}`}>
                            {/* Cột 1: Bộ lọc */}
                            <div className="flex flex-col">
                                <div className="hf-colh text-primary">
                                    <BiFilterAlt size={16} />
                                    <span>Bộ lọc</span>
                                </div>

                                {filterRows.map((row, rowIndex) => (
                                    <div key={row[0].id} className="mb-2">
                                        {rowIndex > 0 && <div className="hf-sep" />}
                                        {/* nhóm có beside: true nằm cùng hàng với nhóm trước (2 cột) */}
                                        <div className={row.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
                                            {row.map((group) => (
                                                <div key={group.id} className="min-w-0">
                                                    <div className="hf-sub">{group.label}</div>

                                                    {group.type === 'checkbox' && (
                                                        <div className={`flex flex-col gap-0.5 ${scrollClass(group)}`}>
                                                            {group.options?.map((opt) => {
                                                                const checked = (selectedFilters[group.id] || []).includes(opt.value);
                                                                return (
                                                                    <Button
                                                                        key={opt.value}
                                                                        variant="secondary"
                                                                        className="hf-opt"
                                                                        onClick={() => handleToggleCheckbox(group.id, opt.value)}
                                                                    >
                                                                        <span className={`hf-box ${checked ? 'hf-box-on' : ''}`}>
                                                                            {checked && <BiCheck size={14} />}
                                                                        </span>
                                                                        <span className="text-sm">{opt.label}</span>
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {group.type === 'radio' && (
                                                        <div className={`flex flex-col gap-0.5 ${scrollClass(group)}`}>
                                                            {group.options?.map((opt) => {
                                                                const checked = selectedFilters[group.id] === opt.value;
                                                                return (
                                                                    <Button
                                                                        key={opt.value}
                                                                        variant="secondary"
                                                                        className="hf-opt"
                                                                        onClick={() => handleSelectRadio(group.id, opt.value)}
                                                                    >
                                                                        <span className={`hf-rd ${checked ? 'hf-rd-on' : ''}`} />
                                                                        <span className="text-sm">{opt.label}</span>
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {group.type === 'month' && (
                                                        // 1 ô chọn tháng/năm của trình duyệt: gọn, chọn được tháng bất kỳ, không dài thêm theo thời gian
                                                        <div className="px-2 py-1">
                                                            <Form.Control
                                                                type="month"
                                                                size="sm"
                                                                value={selectedFilters[group.id] || ''}
                                                                max={group.max}
                                                                onChange={(e) => handleSelectMonth(group.id, e.target.value)}
                                                                aria-label={group.label}
                                                            />
                                                        </div>
                                                    )}

                                                    {(group.type === 'range' || group.type === 'dateRange') && (
                                                        <div className="flex flex-col gap-2 px-2 py-1">
                                                            <div className="flex items-center gap-2">
                                                                <Form.Control
                                                                    type={group.type === 'dateRange' ? 'date' : 'number'}
                                                                    size="sm"
                                                                    aria-label={`${group.label} từ`}
                                                                    placeholder="Từ"
                                                                    value={rangeDraft[group.minField] ?? (selectedFilters[group.minField] || '')}
                                                                    onChange={(e) => setRangeDraft((prev) => ({ ...prev, [group.minField]: e.target.value }))}
                                                                />
                                                                <span className="text-gray-400">-</span>
                                                                <Form.Control
                                                                    type={group.type === 'dateRange' ? 'date' : 'number'}
                                                                    size="sm"
                                                                    aria-label={`${group.label} đến`}
                                                                    placeholder="Đến"
                                                                    value={rangeDraft[group.maxField] ?? (selectedFilters[group.maxField] || '')}
                                                                    onChange={(e) => setRangeDraft((prev) => ({ ...prev, [group.maxField]: e.target.value }))}
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="self-start"
                                                                onClick={() => handleApplyRange(group.minField, group.maxField)}
                                                            >
                                                                Áp dụng
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Cột 2: Nhóm theo */}
                            {groupByOptions.length > 0 && (
                                <div className="flex flex-col border-t md:border-t-0 md:border-l border-(color:--bs-border-color) md:pl-3 pt-3 md:pt-0">
                                    <div className="hf-colh text-(color:--bs-link-color)">
                                        <span>Nhóm theo</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        <Button
                                            variant="secondary"
                                            className="hf-opt"
                                            onClick={() => onGroupByChange && onGroupByChange('')}
                                        >
                                            <span className={`hf-rd ${!selectedGroupBy ? 'hf-rd-on' : ''}`} />
                                            <span className="text-sm">Không nhóm</span>
                                        </Button>
                                        {groupByOptions.map((opt) => {
                                            const checked = selectedGroupBy === opt.value;
                                            return (
                                                <Button
                                                    key={opt.value}
                                                    variant="secondary"
                                                    className="hf-opt"
                                                    onClick={() => onGroupByChange && onGroupByChange(opt.value)}
                                                >
                                                    <span className={`hf-rd ${checked ? 'hf-rd-on' : ''}`} />
                                                    <span className="text-sm">{opt.label}</span>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chân dropdown: nút xóa hết */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-top px-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="hf-btn-ghost text-danger"
                                onClick={handleClearAll}
                            >
                                Xóa tất cả bộ lọc
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPanelOpen(false)}
                            >
                                Đóng
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Đếm số lượng */}
            {count !== undefined && count !== null && (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                    {typeof count === 'number' ? `${count} kết quả` : count}
                </span>
            )}

            {/* Switch chuyển đổi chế độ xem */}
            {view && onViewChange && (
                <div className="hf-vsw">
                    {effectiveViewOptions.map((opt) => {
                        const Icon = opt.icon;
                        const active = view === opt.id;
                        return (
                            <Button
                                key={opt.id}
                                variant="secondary"
                                className={`hf-vs ${active ? 'hf-vs-on' : ''}`}
                                onClick={() => onViewChange(opt.id)}
                                title={opt.title}
                                aria-label={opt.title}
                            >
                                {Icon && <Icon size={16} />}
                                {opt.label && <span>{opt.label}</span>}
                            </Button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ControlBar;
