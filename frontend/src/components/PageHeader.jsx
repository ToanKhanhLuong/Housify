// Đầu trang: tiêu đề → nút thao tác (actions) ngay sau tiêu đề → bên phải (children): ô tìm, bộ lọc, Pager, StatusSteps
// Danh sách: <PageHeader title="Phòng" actions={<Button variant="primary">Thêm phòng</Button>}><Pager … /></PageHeader>
// Chi tiết:  <PageHeader backTo="/contracts" actions={…nút theo trạng thái…}><StatusSteps … /></PageHeader>
import { Link } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';

const PageHeader = ({ title, subtitle, backTo, actions, children }) => (
    <div className="flex flex-wrap items-center gap-3 mb-3">
        {backTo && (
            <Link to={backTo} className="text-secondary flex" aria-label="Quay lại">
                <BiArrowBack size={20} />
            </Link>
        )}
        {title && (
            <div>
                <h1 className="h5 fw-semibold mb-0">{title}</h1>
                {subtitle && <div className="small text-secondary">{subtitle}</div>}
            </div>
        )}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        {children && <div className="ms-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
);

export default PageHeader;