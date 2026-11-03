// UC-30 (Customer): xem hồ sơ một thành viên trong phòng mình, kể cả ảnh CCCD (link có ký tạm thời)
// Người ở cùng đang ở → nút Sửa thông tin (UC-31). Chính người đại diện → sửa ở trang Hồ sơ (UC-05), BE chặn sửa ở đây
import { Button, Modal } from 'react-bootstrap';
import { BiEditAlt, BiUser } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import { OCCUPANT_STATUS } from '../../../constants/enums';
import OccupantInfo from './OccupantInfo';

const MemberModal = ({ member, onHide, onEdit }) => {
  const canEdit = !member.isRepresentative && member.status === OCCUPANT_STATUS.STAYED;

  return (
    <Modal show onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <div>
          <Modal.Title className="h5">{member.name}</Modal.Title>
          <div className="small text-secondary">
            {member.roleLabel} · Phòng {member.room?.roomNumber ?? '—'}
          </div>
        </div>
      </Modal.Header>
      <Modal.Body>
        <OccupantInfo occupant={member} />
      </Modal.Body>
      <Modal.Footer className="justify-content-start">
        {canEdit && (
          <Button variant="primary" className="flex items-center gap-2" onClick={onEdit}>
            <BiEditAlt />
            Sửa thông tin
          </Button>
        )}
        {member.isRepresentative && (
          <Button
            as={Link}
            to="/profile"
            variant="primary"
            className="flex items-center gap-2 no-underline"
          >
            <BiUser />
            Sửa ở trang Hồ sơ
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MemberModal;
