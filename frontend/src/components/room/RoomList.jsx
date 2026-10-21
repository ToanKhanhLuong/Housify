// Danh sách phòng của một tòa + bộ lọc (UC-19): trạng thái, tầng, loại phòng, khoảng giá
// Dùng chung: Admin (tab Phòng trong chi tiết tòa, có nút Thêm phòng) và Manager (tab Phòng, chỉ xem)
import { useMemo, useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { roomApi } from '../../api/room.api.js';
import { roomTypeApi } from '../../api/roomType.api.js';
import useFetch from '../../hooks/useFetch.js';
import useDebounce from '../../hooks/useDebounce.js';
import { STATUS_LABELS } from '../../constants/statusLabels.js';
import DataTable from '../common/DataTable.jsx';
import MoneyInput from '../common/MoneyInput.jsx';
import MoneyText from '../common/MoneyText.jsx';
import StatusBadge from '../common/StatusBadge.jsx';

const EMPTY_FILTERS = { status: '', floor: '', roomTypeId: '', minPrice: '', maxPrice: '' };
const STATUS_OPTIONS = Object.entries(STATUS_LABELS.ROOM_STATUS).map(([value, { label }]) => ({ value, label }));

const columns = [
  { key: 'roomNumber', title: 'Mã phòng', render: (r) => <span className="fw-semibold">{r.roomNumber}</span> },
  { key: 'floorNumber', title: 'Tầng' },
  { key: 'roomTypeId', title: 'Loại phòng', render: (r) => r.roomTypeId?.name },
  { key: 'area', title: 'Diện tích', render: (r) => `${r.area} m²` },
  { key: 'capacity', title: 'Sức chứa', render: (r) => `${r.capacity} người` },
  { key: 'rentPrice', title: 'Giá thuê / tháng', className: 'text-end', render: (r) => <MoneyText value={r.rentPrice} /> },
  { key: 'status', title: 'Trạng thái', render: (r) => <StatusBadge group="ROOM_STATUS" value={r.status} /> },
];

export default function RoomList({ buildingId, floorCount, detailPath, createPath }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // Ô giá gõ liên tục nên đợi ngừng gõ mới gọi API
  const debouncedFilters = useDebounce(filters, 350);
  const { data: rooms, loading } = useFetch(
    () => roomApi.listByBuilding(buildingId, debouncedFilters),
    [buildingId, debouncedFilters],
  );
  const { data: roomTypes } = useFetch(() => roomTypeApi.list(), []);

  const hasFilter = useMemo(() => Object.values(filters).some((v) => v !== ''), [filters]);
  const setFilter = (name, value) => setFilters((f) => ({ ...f, [name]: value }));

  return (
    <Card>
      <Card.Header className="bg-white">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <Form.Select size="sm" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Lọc trạng thái">
            <option value="">Mọi trạng thái</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Form.Select>
          <Form.Select size="sm" value={filters.floor} onChange={(e) => setFilter('floor', e.target.value)} aria-label="Lọc tầng">
            <option value="">Mọi tầng</option>
            {Array.from({ length: floorCount || 0 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Tầng {i + 1}
              </option>
            ))}
          </Form.Select>
          <Form.Select size="sm" value={filters.roomTypeId} onChange={(e) => setFilter('roomTypeId', e.target.value)} aria-label="Lọc loại phòng">
            <option value="">Mọi loại phòng</option>
            {roomTypes?.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </Form.Select>
          <MoneyInput name="minPrice" size="sm" className="mb-0" placeholder="Giá từ" value={filters.minPrice} onChange={(v) => setFilter('minPrice', v)} />
          <MoneyInput name="maxPrice" size="sm" className="mb-0" placeholder="Giá đến" value={filters.maxPrice} onChange={(v) => setFilter('maxPrice', v)} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="small text-muted">
            {loading ? 'Đang tải...' : `${rooms?.length || 0} phòng`}
            {hasFilter && (
              <Button size="sm" variant="link" className="ms-2 p-0 align-baseline" onClick={() => setFilters(EMPTY_FILTERS)}>
                <FaTimes className="me-1" />
                Xóa lọc
              </Button>
            )}
          </span>
          {createPath && (
            <Button size="sm" onClick={() => navigate(createPath)} className="flex items-center gap-2">
              <FaPlus /> Thêm phòng
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <DataTable
          columns={columns}
          data={rooms ?? []}
          loading={loading}
          onRowClick={(r) => navigate(detailPath(r))}
          emptyMessage={
            hasFilter
              ? 'Không tìm thấy phòng phù hợp'
              : createPath
                ? 'Tòa nhà chưa có phòng. Bấm "Thêm phòng" để bắt đầu cho thuê.'
                : 'Tòa nhà chưa có phòng.'
          }
        />
      </Card.Body>
    </Card>
  );
}
