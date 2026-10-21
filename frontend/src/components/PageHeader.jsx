// Đầu mỗi trang: tiêu đề bên trái, nút thao tác bên phải (truyền qua children)
// <PageHeader title="Danh sách phòng"><Button variant="primary">Thêm phòng</Button></PageHeader>
// Trang chi tiết thêm backTo="/rooms" để có nút quay lại
import { Link } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';

const PageHeader = ({ title, subtitle, backTo, children }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
            {backTo && (
                <Link to={backTo} className="text-secondary" aria-label="Quay lại">
                    <BiArrowBack size={22} />
                </Link>
            )}
            <div>
                <h1 className="h4 fw-bold mb-0">{title}</h1>
                {subtitle && <div className="text-secondary small mt-1">{subtitle}</div>}
            </div>
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
);

export default PageHeader;