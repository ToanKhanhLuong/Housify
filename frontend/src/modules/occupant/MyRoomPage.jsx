// UC-30, 31 (Customer, /my-room): "Thành viên phòng". Bố cục 2 cột:
// - Trái: ảnh bìa (ảnh phòng → ảnh tòa → icon giường) + phòng (tòa, địa chỉ, tầng, loại phòng, sức chứa dạng chấm), ô thành viên (avatar, vai trò, SĐT, ngày vào)
//   và ô "Chỗ trống" nét đứt theo sức chứa. Bấm một người → hồ sơ + ảnh CCCD; người ở cùng sửa được (UC-31)
// - Phải: tóm tắt hợp đồng (giá, thời hạn, còn bao nhiêu ngày), quản lý tòa (gọi điện), lối tắt
// Dữ liệu: GET /me/room-members, rồi GET /contracts/:id (lỗi thì chỉ ẩn phần tóm tắt hợp đồng). Thêm / bớt người do Manager làm
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Image, Modal, Row } from 'react-bootstrap';
import { BiBed, BiBuildings, BiChevronLeft, BiChevronRight, BiExpandAlt, BiGroup, BiMap } from 'react-icons/bi';
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
  const [showPreview, setShowPreview] = useState(false); // mở modal xem phóng to ảnh phòng

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
  const handlePrevCover = (event) => {
    event?.stopPropagation();
    setCoverIndex((prev) => (prev - 1 + coverImages.length) % coverImages.length);
  };
  const handleNextCover = (event) => {
    event?.stopPropagation();
    setCoverIndex((prev) => (prev + 1) % coverImages.length);
  };

  return (
    <>
      <div className="grid xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 w-full">
        <div className="flex flex-col gap-4">
          {/* phòng: ảnh 4:3 bên trái (bấm mở xem phóng to) + thông tin phòng bên phải */}
          <Card>
            <Card.Body className="p-4">
              <Row className="g-4 align-items-stretch">
                <Col md={6}>
                  {cover ? (
                    <div className="flex flex-col gap-2">
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded border bg-body-tertiary">
                        <Image
                          src={cover}
                          alt={`Phòng ${room.roomNumber} - ảnh ${safeCoverIndex + 1}`}
                          role="button"
                          onClick={() => setShowPreview(true)}
                          className="h-full w-full object-cover cursor-pointer transition-transform duration-200 hover:scale-105 motion-reduce:transition-none"
                          title="Bấm để phóng to ảnh"
                        />
                        {hasMultipleCovers && (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handlePrevCover}
                              aria-label="Ảnh phòng trước"
                              className="position-absolute start-0 top-50 translate-middle-y ms-2 rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
                            >
                              <BiChevronLeft size={20} />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleNextCover}
                              aria-label="Ảnh phòng tiếp theo"
                              className="position-absolute end-0 top-50 translate-middle-y me-2 rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
                            >
                              <BiChevronRight size={20} />
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowPreview(true)}
                          aria-label="Phóng to ảnh phòng"
                          title="Phóng to ảnh"
                          className="position-absolute bottom-0 end-0 m-2 d-inline-flex align-items-center gap-1"
                        >
                          <BiExpandAlt size={15} />
                          <span className="tabular-nums">
                            {safeCoverIndex + 1}/{coverImages.length}
                          </span>
                        </Button>
                      </div>

                      {hasMultipleCovers && (
                        <div className="flex flex-wrap gap-2">
                          {coverImages.map((imgUrl, idx) => (
                            <Button
                              key={`${imgUrl}-${idx}`}
                              type="button"
                              variant="secondary"
                              onClick={() => setCoverIndex(idx)}
                              aria-label={`Xem ảnh ${idx + 1}`}
                              className={`p-0 w-16 h-12 overflow-hidden rounded ${idx === safeCoverIndex ? 'border-2 border-primary' : 'border opacity-75'
                                }`}
                            >
                              <Image
                                src={imgUrl}
                                alt={`Phòng ${room.roomNumber} - thu nhỏ ${idx + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="hf-cover aspect-[4/3] w-full rounded">
                      <BiBed size={72} />
                    </div>
                  )}
                </Col>

                <Col md={6} className="flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <h1 className="h2 fw-bold mb-0">Phòng {room.roomNumber}</h1>
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

                  <div className="flex flex-col gap-2 border-top pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-secondary">Người đang ở / sức chứa</span>
                      <CapacityDots count={stayedCount} capacity={room.capacity} size="lg" />
                    </div>
                    {cover && (
                      <span className="small text-secondary">
                        Bấm vào ảnh phòng để mở xem phóng to.
                      </span>
                    )}
                  </div>
                </Col>
              </Row>
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
      {cover && (
        <Modal
          show={showPreview}
          onHide={() => setShowPreview(false)}
          centered
          size="xl"
        >
          <Modal.Header closeButton>
            <Modal.Title className="h5">
              Phòng {room.roomNumber} · Ảnh {safeCoverIndex + 1}/{coverImages.length}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-body-tertiary p-3">
            <div className="relative flex items-center justify-center min-h-80">
              {hasMultipleCovers && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePrevCover}
                  aria-label="Ảnh phòng trước"
                  className="position-absolute start-0 top-50 translate-middle-y ms-2 rounded-circle p-2 d-inline-flex align-items-center justify-content-center"
                >
                  <BiChevronLeft size={22} />
                </Button>
              )}
              <Image
                src={cover}
                alt={`Phòng ${room.roomNumber} - ảnh ${safeCoverIndex + 1}`}
                className="max-h-[70vh] w-auto max-w-full rounded object-contain"
              />
              {hasMultipleCovers && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleNextCover}
                  aria-label="Ảnh phòng tiếp theo"
                  className="position-absolute end-0 top-50 translate-middle-y me-2 rounded-circle p-2 d-inline-flex align-items-center justify-content-center"
                >
                  <BiChevronRight size={22} />
                </Button>
              )}
            </div>
            {hasMultipleCovers && (
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {coverImages.map((imgUrl, idx) => (
                  <Button
                    key={`modal-${imgUrl}-${idx}`}
                    type="button"
                    variant="secondary"
                    onClick={() => setCoverIndex(idx)}
                    aria-label={`Chọn ảnh ${idx + 1}`}
                    className={`p-0 w-16 h-12 overflow-hidden rounded ${idx === safeCoverIndex ? 'border-2 border-primary' : 'border opacity-75'
                      }`}
                  >
                    <Image
                      src={imgUrl}
                      alt={`Phòng ${room.roomNumber} - thu nhỏ ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </Button>
                ))}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="justify-content-start">
            <Button type="button" variant="primary" onClick={() => setShowPreview(false)}>
              Đóng
            </Button>
            <Button
              as="a"
              href={cover}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              className="no-underline"
            >
              Mở ảnh gốc
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default MyRoomPage;
