// Đầu trang: nút quay lại → tiêu đề / breadcrumbs → nút thao tác (actions) ngay sau tiêu đề → bên phải (children): ô tìm, bộ lọc, Pager, StatusSteps
// Danh sách: <PageHeader title="Phòng" actions={<Button variant="primary">Thêm phòng</Button>}><Pager … /></PageHeader>
// Chi tiết:  <PageHeader backTo="/buildings" breadcrumbs={['Tòa nhà', 'Housify Cầu Giấy']} actions={…nút theo trạng thái…}><StatusSteps … /></PageHeader>
import { Link } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';

const PageHeader = ({ title, subtitle, backTo, breadcrumbs, actions, children }) => (
    <div className="flex flex-wrap items-center gap-3 mb-3 py-1">
        {backTo && (
            <Link to={backTo} className="text-secondary flex items-center p-1 rounded hover:bg-gray-100" aria-label="Quay lại">
                <BiArrowBack size={20} />
            </Link>
        )}

        {/* Tiêu đề dạng Breadcrumbs hoặc chuỗi đơn giản */}
        {breadcrumbs && Array.isArray(breadcrumbs) ? (
            <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    const crumbText = typeof crumb === 'string' ? crumb : crumb.label;
                    const crumbTo = typeof crumb === 'object' ? crumb.to : null;

                    return (
                        <span key={idx} className="flex items-center gap-2">
                            {idx > 0 && <span className="text-gray-400 font-normal">/</span>}
                            {crumbTo && !isLast ? (
                                <Link to={crumbTo} className="text-[#017e84] hover:underline">
                                    {crumbText}
                                </Link>
                            ) : (
                                <span className={isLast ? 'text-gray-900 font-bold' : 'text-gray-600'}>
                                    {crumbText}
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>
        ) : (
            title && (
                <div>
                    <h1 className="h5 fw-semibold mb-0 text-gray-900">{title}</h1>
                    {subtitle && <div className="small text-secondary">{subtitle}</div>}
                </div>
            )
        )}

        {/* Nút thao tác nằm ngay sau tiêu đề (bên trái) */}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}

        {/* Khối bên phải (StatusSteps, Pager, search...) */}
        {children && <div className="ms-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
);

export default PageHeader;
