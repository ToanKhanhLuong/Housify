// UC-30, 31 (Customer, /my-room): "Thành viên phòng". Bố cục 2 cột:
// - Trái: ảnh bìa (ảnh phòng → ảnh tòa → icon giường) + phòng (tòa, địa chỉ, tầng, loại phòng, sức chứa dạng chấm), ô thành viên (avatar, vai trò, SĐT, ngày vào)
//   và ô "Chỗ trống" nét đứt theo sức chứa. Bấm một người → hồ sơ + ảnh CCCD; người ở cùng sửa được (UC-31)
// - Phải: tóm tắt hợp đồng (giá, thời hạn, còn bao nhiêu ngày), quản lý tòa (gọi điện), lối tắt
// Dữ liệu: GET /me/room-members, rồi GET /contracts/:id (lỗi thì chỉ ẩn phần tóm tắt hợp đồng). Thêm / bớt người do Manager làm
import { useCallback, useEffect, useState } from 'react';
import { Card, Image } from 'react-bootstrap';
import { BiBed, BiBuildings, BiChevronLeft, BiChevronRight, BiGroup, BiMap } from 'react-icons/bi';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { OCCUPANT_STATUS } from '../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../constants/statusLabels';
import occupantApi from './occupant.api';
import { groupByRoom } from './occupantFormat';
import CapacityDots from './components/CapacityDots';
import EditOccupantModal from './components/EditOccupantModal';
import MemberModal from './components/MemberModal';
import MemberTile, { EmptySlotTile } from './components/MemberTile';
import MyRoomSidebar from './components/MyRoomSidebar';

const DAY_MS = 24 * 60 * 60 * 1000;

// còn bao nhiêu ngày + % thời hạn đã qua – tính lúc tải dữ liệu, không tính trong render
const termOf = (contract) => {
  const start = new Date(contract.startDate).getTime();
  const end = new Date(contract.endDate).getTime();
  const now = Date.now();
  if (!start || !end || end <= start) return null;
  return {
    daysLeft: Math.max(Math.ceil((end - now) / DAY_MS), 0),
    percent: Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100),
  };
};

const MyRoomPage = () => {
  const { user } = useAuth();
  // loading → ok | empty | error
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [contractInfo, setContractInfo] = useState({ contract: null, term: null });
  const [selected, setSelected] = useState(null); // thành viên đang xem
  const [editing, setEditing] = useState(null); // thành viên đang sửa
  const [coverIndex, setCoverIndex] = useState(0); // vị trí ảnh phòng đang xem trên slide

  const loadMembers = useCallback(
    () =>
      occupantApi
        .myRoomMembers()
        .then((response) => {
          const data = response.data;
          setState({ status: data?.room ? 'ok' : 'empty', data, error: '' });
          if (!data?.contractId) return;
          // tóm tắt hợp đồng chỉ là phần thêm: lỗi thì bỏ qua, trang vẫn hiện thành viên
          occupantApi
            .contract(data.contractId)
            .then((detail) =>
              setContractInfo({ contract: detail.data, term: termOf(detail.data) }),
            )
            .catch(() => setContractInfo({ contract: null, term: null }));
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
  const building = user.building;
  const { contract, term } = contractInfo;
  // gắn phòng vào từng người để popup hiện "Phòng 101"; xếp đại diện trước, người đã chuyển đi cuối
  const members = groupByRoom(items.map((member) => ({ ...member, room })))[0]?.members ?? [];
  const stayedCount = members.filter((member) => member.status === OCCUPANT_STATUS.STAYED).length;
  const emptySlots = Math.max((room.capacity ?? 0) - stayedCount, 0);
  const roomTypeName = contract?.room?.roomType?.name;
  // ảnh bìa: ưu tiên toàn bộ ảnh phòng (lướt slide nếu nhiều ảnh) → ảnh tòa → icon giường
  const coverImages =
    room.images?.length > 0
      ? room.images
      : building?.images?.[0]
        ? [building.images[0]]
        : [];
  const safeCoverIndex = coverImages.length > 0 ? coverIndex % coverImages.length : 0;
  const cover = coverImages[safeCoverIndex];
  const hasMultipleCovers = coverImages.length > 1;
  const handlePrevCover = () =>
    setCoverIndex((prev) => (prev - 1 + coverImages.length) % coverImages.length);
  const handleNextCover = () =>
    setCoverIndex((prev) => (prev + 1) % coverImages.length);

  return (
    <>
      <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 w-full">
        <div className="flex flex-col gap-4">
          {/* phòng: ảnh bìa (carousel nếu có nhiều ảnh) + thông tin phòng */}
          <Card className="overflow-hidden">
            {cover ? (
              <div className="relative h-64 w-full bg-body-tertiary">
                <Image
                  src={cover}
                  alt={`Phòng ${room.roomNumber} - ảnh ${safeCoverIndex + 1}`}
                  className="h-full w-full object-cover"
                />
                {hasMultipleCovers && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevCover}
                      aria-label="Ảnh phòng trước"
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white border-0 hover:bg-black/70 transition-colors"
                    >
                      <BiChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextCover}
                      aria-label="Ảnh phòng tiếp theo"
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white border-0 hover:bg-black/70 transition-colors"
                    >
                      <BiChevronRight size={22} />
                    </button>
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1">
                      {coverImages.map((imgUrl, idx) => (
                        <button
                          key={`${imgUrl}-${idx}`}
                          type="button"
                          onClick={() => setCoverIndex(idx)}
                          aria-label={`Xem ảnh ${idx + 1}`}
                          className={`h-2 rounded-full border-0 transition-all ${
                            idx === safeCoverIndex ? 'w-5 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="absolute bottom-2.5 right-3 rounded bg-black/55 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
                      {safeCoverIndex + 1}/{coverImages.length}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="hf-cover h-56 rounded-none">
                <BiBed size={88} />
              </div>
            )}
            <Card.Body className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="flex flex-col gap-2">
                <span className="flex flex-wrap items-center gap-3">
                  <h1 className="display-6 fw-bold mb-0">Phòng {room.roomNumber}</h1>
                  <StatusBadge map={ROOM_STATUS_LABEL} value={room.status} />
                </span>
                <span className="flex items-center gap-2 fs-6 text-secondary">
                  <BiBuildings />
                  {building?.name ? `${building.name} · ` : ''}Tầng {room.floorNumber}
                  {roomTypeName ? ` · ${roomTypeName}` : ''}
                </span>
                {building?.address && (
                  <span className="flex items-center gap-2 text-secondary">
                    <BiMap />
                    {building.address}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <CapacityDots count={stayedCount} capacity={room.capacity} size="lg" />
                <span className="text-secondary">người đang ở / sức chứa</span>
              </div>
            </Card.Body>
          </Card>

          {/* thành viên */}
          <Card>
            <Card.Body className="flex flex-col gap-4 p-4">
              <h2 className="h5 fw-bold mb-0 flex items-center gap-2">
                <BiGroup className="text-secondary" />
                Thành viên phòng <span className="fw-normal text-secondary">({members.length})</span>
              </h2>
              <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                {members.map((member) => (
                  <MemberTile key={member._id} member={member} onClick={() => setSelected(member)} />
                ))}
                {Array.from({ length: emptySlots }, (_, index) => (
                  <EmptySlotTile key={`slot-${index}`} />
                ))}
              </div>
              <span className="small text-secondary">
                Bấm vào một người để xem hồ sơ và ảnh CCCD. Thông tin của bạn sửa ở trang Hồ sơ.
              </span>
            </Card.Body>
          </Card>
        </div>

        <MyRoomSidebar contract={contract} term={term} manager={building?.manager} />
      </div>

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
