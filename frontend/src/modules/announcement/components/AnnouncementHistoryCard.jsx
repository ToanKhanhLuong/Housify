// Khung lịch sử các đợt thông báo chung mà Manager đã gửi (UC-40)
// Hỗ trợ lọc theo phân loại mẫu, khoảng ngày, từ khóa tìm kiếm, cuộn dọc và phân trang
import { useEffect, useState } from 'react';
import { Button, Card, Form, Modal } from 'react-bootstrap';
import {
  BiCalendar,
  BiCheckDouble,
  BiChevronLeft,
  BiChevronRight,
  BiCopy,
  BiFilterAlt,
  BiHistory,
  BiSearch,
  BiX,
} from 'react-icons/bi';
import SkeletonRows from '../../../components/SkeletonRows';
import { formatDateTime } from '../../../utils/format';
import announcementApi from '../announcement.api';

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả mẫu thông báo' },
  { value: 'MAINTENANCE', label: 'Lịch bảo trì' },
  { value: 'RULE', label: 'Thay đổi nội quy' },
  { value: 'REMINDER', label: 'Nhắc nhở' },
  { value: 'GENERAL', label: 'Thông tin chung' },
];

const CATEGORY_META = {
  MAINTENANCE: { label: 'Lịch bảo trì', badgeClass: 'hf-b-warn' },
  RULE: { label: 'Thay đổi nội quy', badgeClass: 'hf-b-plum' },
  REMINDER: { label: 'Nhắc nhở', badgeClass: 'hf-b-red' },
  GENERAL: { label: 'Thông tin chung', badgeClass: 'hf-b-gray' },
};

const PAGE_LIMIT = 8;

const AnnouncementHistoryCard = ({ refreshKey = 0, onReuse, className = '' }) => {
  const [filters, setFilters] = useState({
    q: '',
    category: 'ALL',
    from: '',
    to: '',
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let active = true;
    const params = {
      page,
      limit: PAGE_LIMIT,
      ...(filters.q.trim() && { q: filters.q.trim() }),
      ...(filters.category !== 'ALL' && { category: filters.category }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
    };

    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return announcementApi.list(params);
      })
      .then((response) => {
        if (!active) return;
        setData(
          response.data || {
            items: [],
            total: 0,
            page: 1,
            totalPages: 1,
          },
        );
      })
      .catch(() => {
        if (!active) return;
        setData({ items: [], total: 0, page: 1, totalPages: 1 });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, filters, refreshKey]);

  const updateFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const hasActiveFilter =
    Boolean(filters.q.trim()) ||
    filters.category !== 'ALL' ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  const resetFilters = () => {
    setFilters({ q: '', category: 'ALL', from: '', to: '' });
    setPage(1);
  };

  return (
    <>
      {/* màn hình lớn: khung cao vừa phần còn lại của cột, danh sách cuộn bên trong thay vì kéo cả trang */}
      <Card className={className}>
        <Card.Body className="flex flex-col gap-3 min-h-0">
          {/* Tiêu đề & Tổng số đợt đã gửi */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="hf-av w-8 h-8 shrink-0">
                <BiHistory size={18} />
              </span>
              <div>
                <h2 className="h6 fw-bold mb-0">Lịch sử thông báo đã gửi</h2>
                <span className="text-[11px] text-secondary">
                  Theo dõi các thông báo đã phát tới cư dân trong tòa
                </span>
              </div>
            </div>
            <span className="hf-badge hf-b-gray font-medium">
              {data.total} đợt gửi
            </span>
          </div>

          {/* Bộ lọc: Phân loại mẫu, Từ ngày, Đến ngày & Tìm kiếm */}
          <div className="flex flex-col gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Ô 1: Phân loại mẫu thông báo */}
              <div>
                <label className="text-[11px] text-slate-600 font-medium mb-1 flex items-center gap-1">
                  <BiFilterAlt size={12} /> Phân loại mẫu
                </label>
                <Form.Select
                  size="sm"
                  value={filters.category}
                  onChange={(event) => updateFilter({ category: event.target.value })}
                  className="text-xs"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* Ô 2: Từ ngày */}
              <div>
                <label className="text-[11px] text-slate-600 font-medium mb-1 flex items-center gap-1">
                  <BiCalendar size={12} /> Từ ngày
                </label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(event) => updateFilter({ from: event.target.value })}
                  className="text-xs"
                />
              </div>

              {/* Ô 3: Đến ngày */}
              <div>
                <label className="text-[11px] text-slate-600 font-medium mb-1 flex items-center gap-1">
                  <BiCalendar size={12} /> Đến ngày
                </label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(event) => updateFilter({ to: event.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Ô tìm kiếm từ khóa + nút xóa bộ lọc */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <BiSearch
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <Form.Control
                  type="text"
                  size="sm"
                  placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
                  value={filters.q}
                  onChange={(event) => updateFilter({ q: event.target.value })}
                  className="ps-4 text-xs"
                />
              </div>
              {hasActiveFilter && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs flex items-center gap-1 shrink-0"
                >
                  <BiX size={15} /> Xóa lọc
                </Button>
              )}
            </div>
          </div>

          {/* Danh sách lịch sử cuộn dọc */}
          {loading ? (
            <SkeletonRows rows={4} columns={2} />
          ) : data.items.length === 0 ? (
            <div className="py-8 text-center text-xs text-secondary border rounded-xl bg-slate-50/40">
              {hasActiveFilter
                ? 'Không tìm thấy thông báo nào khớp với bộ lọc đã chọn.'
                : 'Chưa có thông báo chung nào được gửi trước đây.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1 xl:max-h-none xl:flex-1 xl:min-h-0">
              {data.items.map((item) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.GENERAL;
                const roomListText =
                  Array.isArray(item.roomNumbers) && item.roomNumbers.length > 0
                    ? item.roomNumbers.length <= 5
                      ? `P.${item.roomNumbers.join(', P.')}`
                      : `P.${item.roomNumbers.slice(0, 5).join(', P.')} (+${item.roomNumbers.length - 5} phòng)`
                    : `${item.recipientCount} tài khoản`;

                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedItem(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedItem(item);
                    }}
                    className="p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer flex flex-col gap-1.5 text-left"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`hf-badge ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-slate-800 line-clamp-1">
                      {item.title}
                    </div>

                    <div className="text-xs text-slate-500 line-clamp-2 whitespace-pre-line">
                      {item.message}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 text-[11px] text-slate-500">
                      <span className="text-truncate">
                        Người nhận: <strong className="text-slate-700">{item.recipientCount} phòng</strong> ({roomListText})
                      </span>
                      <span className="shrink-0 flex items-center gap-1 text-slate-600 font-medium">
                        <BiCheckDouble size={14} className="text-secondary" /> Đã đọc {item.readCount}/{item.recipientCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Thanh phân trang */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Trang <strong>{data.page}</strong> / {data.totalPages} ({data.total} đợt)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 flex items-center"
                >
                  <BiChevronLeft size={16} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.totalPages || loading}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  className="px-2 py-1 flex items-center"
                >
                  <BiChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal xem chi tiết thông báo đã gửi */}
      {selectedItem && (
        <Modal show onHide={() => setSelectedItem(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title className="h6 fw-bold">Chi tiết thông báo đã gửi</Modal.Title>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`hf-badge ${
                  (CATEGORY_META[selectedItem.category] || CATEGORY_META.GENERAL).badgeClass
                }`}
              >
                {(CATEGORY_META[selectedItem.category] || CATEGORY_META.GENERAL).label}
              </span>
              <span className="text-xs text-secondary">
                Gửi lúc: <strong>{formatDateTime(selectedItem.createdAt)}</strong>
              </span>
            </div>

            <div>
              <div className="text-xs text-secondary mb-1">Tiêu đề</div>
              <div className="fw-bold text-slate-800">{selectedItem.title}</div>
            </div>

            <div>
              <div className="text-xs text-secondary mb-1">Nội dung thông báo</div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 whitespace-pre-line text-slate-700 text-xs leading-relaxed">
                {selectedItem.message}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">
                  Số tài khoản nhận: <strong>{selectedItem.recipientCount} đại diện phòng</strong>
                </span>
                <span className="text-slate-700 font-semibold">
                  Đã xem: {selectedItem.readCount}/{selectedItem.recipientCount}
                </span>
              </div>
              {Array.isArray(selectedItem.roomNumbers) && selectedItem.roomNumbers.length > 0 && (
                <div className="text-slate-500 mt-1">
                  Danh sách phòng: <strong>P.{selectedItem.roomNumbers.join(', P.')}</strong>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            {onReuse && (
              <Button
                variant="primary"
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => {
                  onReuse({
                    title: selectedItem.title,
                    message: selectedItem.message,
                  });
                  setSelectedItem(null);
                }}
              >
                <BiCopy size={15} /> Sử dụng lại nội dung này
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setSelectedItem(null)}>
              Đóng
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default AnnouncementHistoryCard;
