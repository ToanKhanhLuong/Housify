// UC-30, 31 (Customer, /my-room): "Thành viên phòng" – phòng đang thuê, số người so với sức chứa, danh sách thành viên
// của hợp đồng đang hiệu lực (GET /me/room-members). Bấm một người → xem hồ sơ + ảnh CCCD; người ở cùng sửa được
// Thêm / bớt người ở cùng do Manager làm (UC-32, 33) → hiện SĐT Manager để liên hệ
import { useCallback, useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import FieldRow from '../../components/FieldRow';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { OCCUPANT_STATUS } from '../../constants/enums';
import { OCCUPANT_STATUS_LABEL, ROOM_STATUS_LABEL } from '../../constants/statusLabels';
import { formatDate } from '../../utils/format';
import occupantApi from './occupant.api';
import EditOccupantModal from './components/EditOccupantModal';
import MemberModal from './components/MemberModal';

const columns = [
  { key: 'name', title: 'Họ tên', className: 'fw-semibold' },
  { key: 'roleLabel', title: 'Vai trò' },
  { key: 'relationship', title: 'Quan hệ', render: (row) => (row.isRepresentative ? '—' : row.relationship || '—') },
  { key: 'cccd', title: 'CCCD' },
  { key: 'phone', title: 'Số điện thoại' },
  { key: 'joinDate', title: 'Ngày vào ở', render: (row) => formatDate(row.joinDate) },
  {
    key: 'status',
    title: 'Trạng thái',
    render: (row) => <StatusBadge map={OCCUPANT_STATUS_LABEL} value={row.status} />,
  },
];

const MyRoomPage = () => {
  const { user } = useAuth();
  // loading → ok | empty | error
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [selected, setSelected] = useState(null); // thành viên đang xem
  const [editing, setEditing] = useState(null); // thành viên đang sửa

  const loadMembers = useCallback(
    () =>
      occupantApi
        .myRoomMembers()
        .then((response) => {
          const data = response.data;
          setState({ status: data?.room ? 'ok' : 'empty', data, error: '' });
        })
        .catch((error) => setState({ status: 'error', data: null, error: error.message })),
    [],
  );

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRetry = () => {
    setState({ status: 'loading', data: null, error: '' });
    loadMembers();
  };

  if (state.status === 'loading') {
    return (
      <Card>
        <Card.Body>
          <SkeletonRows rows={5} columns={5} />
        </Card.Body>
      </Card>
    );
  }
  if (state.status === 'error') {
    return (
      <ErrorState message="Không tải được thành viên phòng" detail={state.error} onRetry={handleRetry} />
    );
  }
  if (state.status === 'empty') {
    return (
      <Card>
        <Card.Body>
          <EmptyState message="Bạn chưa có phòng đang thuê. Khi hợp đồng được kích hoạt, thành viên phòng sẽ hiện ở đây." />
        </Card.Body>
      </Card>
    );
  }

  const { room, items } = state.data;
  // gắn phòng vào từng người để popup hiện "Phòng 101" (API trả phòng một lần ở ngoài)
  const members = items.map((member) => ({ ...member, room }));
  const stayedCount = members.filter((member) => member.status === OCCUPANT_STATUS.STAYED).length;
  const manager = user.building?.manager;

  return (
    <>
      <Card className="hf-paper">
        <div className="flex flex-col gap-1">
          <span className="small text-secondary">
            Thành viên phòng{user.building?.name ? ` · ${user.building.name}` : ''}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <h1 className="h3 fw-bold mb-0">Phòng {room.roomNumber}</h1>
            <StatusBadge map={ROOM_STATUS_LABEL} value={room.status} />
          </span>
        </div>

        <div className="grid lg:grid-cols-2 column-gap-5">
          <div>
            <FieldRow label="Tầng">{room.floorNumber}</FieldRow>
            <FieldRow label="Số người đang ở">
              <span className="fw-semibold">{stayedCount}</span> / {room.capacity ?? '—'} người
              (sức chứa tối đa)
            </FieldRow>
          </div>
          <div>
            <FieldRow label="Thêm / bớt người">
              <span className="text-secondary">
                Liên hệ quản lý tòa
                {manager?.name ? ` ${manager.name}` : ''}
                {manager?.phone ? ` – ${manager.phone}` : ''}
              </span>
            </FieldRow>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="h6 fw-bold mb-0">
            Thành viên <span className="fw-normal text-secondary">({members.length})</span>
          </h2>
          <DataTable
            columns={columns}
            data={members}
            emptyMessage="Chưa có thành viên nào."
            onRowClick={setSelected}
          />
          <span className="small text-secondary">
            Bấm vào một người để xem hồ sơ và ảnh CCCD. Thông tin của bạn sửa ở trang Hồ sơ.
          </span>
        </section>
      </Card>

      {selected && (
        <MemberModal
          member={selected}
          onHide={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
          }}
        />
      )}
      {editing && (
        <EditOccupantModal
          occupant={editing}
          onHide={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadMembers();
          }}
        />
      )}
    </>
  );
};

export default MyRoomPage;
