// Bảng cư dân gom theo phòng (UC-30): mỗi dòng chính là người đại diện (chữ to, đậm), bấm "n người ở cùng" để sổ
// xuống các người ở cùng (thụt vào, chữ nhỏ, nền nhạt). Bấm vào một người → chi tiết cư dân
// groups: kết quả groupByRoom (người đại diện đứng đầu members)
// highlightIds: Set _id người khớp ô tìm → tô nền nhạt dòng đó (đặt biến màu nền của bảng trên dòng)
import { Button, Card, Table } from 'react-bootstrap';
import { BiChevronDown, BiChevronRight } from 'react-icons/bi';
import EmptyState from '../../../components/EmptyState';
import StatusBadge from '../../../components/StatusBadge';
import { OCCUPANT_STATUS_LABEL } from '../../../constants/statusLabels';
import { formatDate } from '../../../utils/format';
import OccupantAvatar from './OccupantAvatar';

const roomKey = (group) => group.room._id ?? 'none';
const HIGHLIGHT_ROW = '[--bs-table-bg:var(--bs-primary-bg-subtle)]';

const RepresentativeTable = ({ groups, expanded, onToggle, onOpen, highlightIds }) => {
  const highlight = (member) => (highlightIds?.has(member._id) ? HIGHLIGHT_ROW : '');
  if (groups.length === 0) {
    return (
      <Card>
        <Card.Body>
          <EmptyState message="Không có cư dân nào." />
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Body className="p-0">
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr>
              <th className="ps-3 w-10" aria-label="Mở rộng" />
              <th>Họ tên</th>
              <th>Phòng</th>
              <th>CCCD</th>
              <th>Số điện thoại</th>
              <th>Ngày vào ở</th>
              <th className="pe-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const [head, ...others] = group.members;
              const key = roomKey(group);
              const isOpen = expanded.has(key);
              return [
                // dòng chính: người đại diện
                <tr
                  key={key}
                  className={`cursor-pointer ${highlight(head)}`}
                  onClick={() => onOpen(head)}
                >
                  <td className="ps-3">
                    {others.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="hf-btn-ghost flex items-center p-1"
                        aria-label={isOpen ? 'Thu gọn người ở cùng' : 'Xem người ở cùng'}
                        aria-expanded={isOpen}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggle(key);
                        }}
                      >
                        {isOpen ? <BiChevronDown size={18} /> : <BiChevronRight size={18} />}
                      </Button>
                    )}
                  </td>
                  <td>
                    <span className="flex items-center gap-3">
                      <OccupantAvatar name={head.name} isRepresentative={head.isRepresentative} size="md" />
                      <span className="flex flex-col">
                        <span className="flex items-center gap-2">
                          <span className="fs-6 fw-bold">{head.name}</span>
                          {head.isRepresentative && <span className="hf-badge hf-b-plum">Đại diện</span>}
                        </span>
                        {others.length > 0 ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="hf-btn-ghost self-start p-0 small text-secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggle(key);
                            }}
                          >
                            {isOpen ? 'Ẩn' : '+'} {others.length} người ở cùng
                          </Button>
                        ) : (
                          <span className="small text-secondary">Ở một mình</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="fw-semibold">
                    {group.room.roomNumber ? `${group.room.roomNumber} · Tầng ${group.room.floorNumber}` : '—'}
                  </td>
                  <td className="tabular-nums">{head.cccd}</td>
                  <td>{head.phone}</td>
                  <td>{formatDate(head.joinDate)}</td>
                  <td className="pe-3">
                    <StatusBadge map={OCCUPANT_STATUS_LABEL} value={head.status} />
                  </td>
                </tr>,
                // dòng phụ: người ở cùng (chỉ khi mở)
                ...(isOpen
                  ? others.map((member) => (
                      <tr
                        key={member._id}
                        className={`cursor-pointer bg-body-tertiary small ${highlight(member)}`}
                        onClick={() => onOpen(member)}
                      >
                        <td className="ps-3" />
                        <td>
                          <span className="flex items-center gap-2 ps-4 border-start">
                            <OccupantAvatar name={member.name} isRepresentative={member.isRepresentative} />
                            <span className="flex flex-col">
                              <span className="fw-medium">{member.name}</span>
                              <span className="text-secondary">{member.relationship || 'Người ở cùng'}</span>
                            </span>
                          </span>
                        </td>
                        <td className="text-secondary">—</td>
                        <td className="tabular-nums">{member.cccd}</td>
                        <td>{member.phone}</td>
                        <td>{formatDate(member.joinDate)}</td>
                        <td className="pe-3">
                          <StatusBadge map={OCCUPANT_STATUS_LABEL} value={member.status} />
                        </td>
                      </tr>
                    ))
                  : []),
              ];
            })}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default RepresentativeTable;
