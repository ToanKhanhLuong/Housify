// UC-21: quản lý dịch vụ (Admin). Bấm dòng để sửa, xóa (xóa mềm) nằm trong form sửa
import { useCallback, useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import serviceApi from './service.api';
import ServiceFormModal from './components/ServiceFormModal';

const ServiceListPage = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null); // null: đóng form · {}: thêm mới · dịch vụ: sửa
    const [deleting, setDeleting] = useState(null); // dịch vụ đang chờ xác nhận xóa
    const [submitting, setSubmitting] = useState(false);

    // dùng .then thay vì await: setState nằm trong callback, không chạy đồng bộ trong useEffect
    // (luật react-hooks/set-state-in-effect)
    const loadServices = useCallback(
        () =>
            serviceApi
                .list()
                .then((response) => setServices(response.data))
                .catch((error) => toast.error(error.message))
                .finally(() => setLoading(false)),
        [],
    );

    useEffect(() => {
        loadServices();
    }, [loadServices]);

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await serviceApi.remove(deleting._id);
            toast.success('Xóa dịch vụ thành công');
            setDeleting(null);
            loadServices();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        { key: 'name', title: 'Tên dịch vụ', className: 'fw-semibold' },
        { key: 'unit', title: 'Đơn vị tính' },
        {
            key: 'isFixed',
            title: 'Cách tính',
            render: (row) => (row.isFixed ? 'Cố định' : 'Theo chỉ số'),
        },
    ];

    return (
        <>
            <PageHeader
                title="Dịch vụ"
                actions={
                    <>
                        <Button variant="primary" onClick={() => setEditing({})}>
                            Thêm dịch vụ
                        </Button>
                        {/* UC-22 */}
                        <Button variant="secondary" onClick={() => navigate('/services/prices')}>
                            Giá dịch vụ
                        </Button>
                    </>
                }
            />

            <DataTable
                columns={columns}
                data={services}
                loading={loading}
                emptyMessage="Chưa có dịch vụ nào"
                onRowClick={(row) => setEditing(row)}
            />

            {/* render có điều kiện: mỗi lần mở là một form mới, không sót dữ liệu lần trước */}
            {editing && (
                <ServiceFormModal
                    service={editing}
                    onHide={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        loadServices();
                    }}
                    onDelete={() => {
                        setDeleting(editing); // đóng form rồi mới mở hộp xác nhận, không chồng 2 modal
                        setEditing(null);
                    }}
                />
            )}

            <ConfirmModal
                show={Boolean(deleting)}
                title="Xóa dịch vụ"
                message={`Bạn chắc chắn muốn xóa dịch vụ "${deleting?.name}"? Dịch vụ sẽ không còn trên hóa đơn mới, hóa đơn đã lập vẫn giữ nguyên.`}
                confirmText="Xóa"
                variant="danger"
                loading={submitting}
                onConfirm={handleDelete}
                onCancel={() => setDeleting(null)}
            />
        </>
    );
};

export default ServiceListPage;
