// Khối Hoạt động gần đây (thanh cuộn dọc khi > 5 dòng) và Không gian Phòng theo tầng (chỉ hiện khi chọn tòa, thanh cuộn ngang khi > 3 phòng) (UC-07, 47)
import { useMemo, useState } from 'react';
import { Card } from 'react-bootstrap';
import { BiDoorOpen, BiHistory, BiUser } from 'react-icons/bi';
import MoneyText from '../../../components/MoneyText';
import Select from '../../../components/Select';
import { ROOM_STATUS } from '../../../constants/enums';
import { ROOM_STATUS_LABEL } from '../../../constants/statusLabels';
import { formatDate, formatDateTime, formatMoney } from '../../../utils/format';

const BADGE_CLASS_BY_TONE = {
  plum: 'hf-b-plum',
  ok: 'hf-b-ok',
  warn: 'hf-b-warn',
  red: 'hf-b-red',
  info: 'hf-b-info',
  gray: 'hf-b-gray',
};

const ROOM_BADGE_CLASS = {
  [ROOM_STATUS.AVAILABLE]: 'hf-b-ok',
  [ROOM_STATUS.OCCUPIED]: 'hf-b-plum',
  [ROOM_STATUS.MAINTENANCE]: 'hf-b-warn',
};

const RecentActivitiesSection = ({ data, reportData, showRooms = false }) => {
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Gộp hoạt động gần đây từ BE (audit_logs, hợp đồng mới ký, sự cố...) và danh sách hóa đơn quá hạn
  const activities = useMemo(() => {
    const fromBackend = Array.isArray(data?.recentActivities) ? data.recentActivities : [];
    const lateList = Array.isArray(reportData?.latePayments) ? reportData.latePayments : [];
    const lateItems = lateList.map((item) => ({
      _id: `late-${item._id}`,
      code: item.roomNumber ? `P.${item.roomNumber}` : item.invoiceCode,
      category: 'Hóa đơn quá hạn',
      title: `Hóa đơn ${item.invoiceCode} (${formatMoney(item.amount)})`,
      actorName: `Kỳ ${item.month}`,
      timeText: `Trễ ${item.overdueDays} ngày`,
      badgeText: 'Quá hạn',
      badgeTone: 'red',
      detail: `Phòng ${item.roomNumber} chưa thanh toán hóa đơn ${item.invoiceCode} (hạn ${formatDate(item.dueDate)}).`,
    }));

    return [...lateItems, ...fromBackend];
  }, [data, reportData]);

  const featuredRooms = useMemo(
    () => (Array.isArray(data?.featuredRooms) ? data.featuredRooms : []),
    [data],
  );

  const floorOptions = useMemo(() => {
    const floors = new Set();
    featuredRooms.forEach((room) => {
      if (room.floorNumber) floors.add(room.floorNumber);
    });
    return Array.from(floors).sort((a, b) => a - b);
  }, [featuredRooms]);

  const filteredRooms = useMemo(() => {
    if (!selectedFloor) return featuredRooms;
    return featuredRooms.filter((room) => String(room.floorNumber) === String(selectedFloor));
  }, [featuredRooms, selectedFloor]);

  const activeActivity = activities.find((item) => String(item._id) === String(selectedActivityId));
  const activeRoom = filteredRooms.find((item) => String(item._id) === String(selectedRoomId));

  return (
    <div className="flex flex-col gap-4">
      {/* Khối 1: Hoạt động & Cần xử lý gần đây (cuộn dọc bằng thanh scroll khi > 5 dòng) */}
      <Card>
        <Card.Header className="flex items-center justify-between gap-2 py-3 px-4">
          <span className="fw-semibold text-body">Hoạt động & Cần xử lý gần đây</span>
          <span className="small text-secondary">{activities.length} ghi nhận</span>
        </Card.Header>
        <Card.Body className="p-4 flex flex-col gap-2">
          {activities.length === 0 ? (
            <div className="hf-ph py-4">
              <BiHistory size={22} />
              <span>Chưa có phát sinh hay nhật ký mới trong phạm vi này</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {activities.map((item) => {
                const isSelected = String(item._id) === String(selectedActivityId);
                const badgeClass = BADGE_CLASS_BY_TONE[item.badgeTone] || 'hf-b-plum';
                const timeDisplay =
                  item.timeText || (item.createdAt ? formatDateTime(item.createdAt) : '');

                return (
                  <div
                    key={item._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedActivityId(isSelected ? '' : item._id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedActivityId(isSelected ? '' : item._id);
                      }
                    }}
                    className={`flex flex-wrap items-center justify-between gap-3 p-2 rounded cursor-pointer border shrink-0 ${
                      isSelected ? 'border-primary bg-body-tertiary' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="fw-semibold text-body tabular-nums w-20 shrink-0 text-truncate">
                        {item.code || item.roomNumber || 'Hệ thống'}
                      </span>
                      <span className="small text-secondary w-32 shrink-0 text-truncate hidden sm:inline">
                        {item.category || 'Hoạt động'}
                      </span>
                      <span className="text-body text-truncate flex-1">{item.title}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.actorName && (
                        <span className="small text-secondary flex items-center gap-2">
                          <span className="hf-av w-6 h-6">
                            <BiUser size={13} />
                          </span>
                          <span className="max-w-32 text-truncate">{item.actorName}</span>
                        </span>
                      )}
                      {timeDisplay && (
                        <span className="small text-secondary tabular-nums hidden md:inline">
                          {timeDisplay}
                        </span>
                      )}
                      <span className={`hf-badge ${badgeClass}`}>
                        {item.badgeText || 'Mới'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeActivity?.detail && (
            <div className="border-top pt-2 mt-1 small text-secondary">
              <strong className="text-body">{activeActivity.title}:</strong> {activeActivity.detail}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Khối 2: Không gian Phòng theo tầng (chỉ hiện khi đã chọn 1 tòa nhà cụ thể, cuộn ngang bằng thanh scroll khi > 3 phòng) */}
      {showRooms && (
        <Card>
          <Card.Header className="flex flex-wrap items-center justify-between gap-2 py-3 px-4">
            <div className="flex items-center gap-2">
              <span className="fw-semibold text-body">Không gian Phòng theo tầng</span>
              <span className="hf-badge hf-b-gray">{filteredRooms.length} phòng</span>
            </div>

            <Select
              name="selectedFloor"
              size="sm"
              aria-label="Lọc theo tầng"
              className="mb-0 w-auto"
              placeholder="Tất cả tầng"
              options={floorOptions.map((floor) => ({
                value: floor,
                label: `Tầng ${floor}`,
              }))}
              value={selectedFloor}
              onChange={(event) => setSelectedFloor(event.target.value)}
            />
          </Card.Header>
          <Card.Body className="p-4 flex flex-col gap-3">
            {filteredRooms.length === 0 ? (
              <div className="hf-ph py-5">
                <BiDoorOpen size={24} />
                <span>Chưa có phòng nào trong tầng này</span>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {filteredRooms.map((room) => {
                  const isSelected = String(room._id) === String(selectedRoomId);
                  const statusInfo = ROOM_STATUS_LABEL[room.status] ?? { label: room.status };
                  const badgeClass = ROOM_BADGE_CLASS[room.status] ?? 'hf-b-gray';

                  return (
                    <div
                      key={room._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedRoomId(isSelected ? '' : room._id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedRoomId(isSelected ? '' : room._id);
                        }
                      }}
                      className={`hf-tcard p-2 gap-2 w-64 shrink-0 ${
                        isSelected ? 'border-primary bg-body-tertiary' : ''
                      }`}
                    >
                      {room.images?.[0] ? (
                        <img
                          src={room.images[0]}
                          alt={`Phòng ${room.roomNumber}`}
                          className="w-full h-32 object-cover rounded"
                        />
                      ) : (
                        <div className="hf-cover h-32 rounded flex-col gap-1">
                          <BiDoorOpen size={26} />
                          <span className="small fw-semibold">Phòng {room.roomNumber}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="fw-bold text-body">Phòng {room.roomNumber}</span>
                        <span className="fw-semibold tabular-nums small">
                          <MoneyText value={room.rentPrice} />/tháng
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 small text-secondary">
                        <span className="text-truncate">
                          Tầng {room.floorNumber} · {room.area} m²
                        </span>
                        <span className={`hf-badge ${badgeClass}`}>{statusInfo.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeRoom && (
              <div className="border-top pt-2 small text-secondary flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong className="text-body">
                    Phòng {activeRoom.roomNumber} ({activeRoom.buildingName || 'Tòa hiện tại'}):
                  </strong>{' '}
                  Loại {activeRoom.roomTypeName || 'Tiêu chuẩn'} · Đang ở {activeRoom.occupantCount ?? 0}/
                  {activeRoom.capacity ?? 0} người · Tiền cọc <MoneyText value={activeRoom.deposit ?? 0} />
                </span>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default RecentActivitiesSection;
