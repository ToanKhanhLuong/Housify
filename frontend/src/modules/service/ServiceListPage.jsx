// UC-21: quản lý dịch vụ (Admin). Bấm dòng để sửa, xóa (xóa mềm) nằm trong form sửa
import { useCallback, useEffect, useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BiReset, BiSearch } from 'react-icons/bi';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import serviceApi from './service.api';
import ServiceFormModal from './components/ServiceFormModal';

const FIXED_OPTIONS = [
  { value: '', label: 'Tất cả cách tính' },
  { value: 'true', label: 'Cố định' },
  { value: 'false', label: 'Theo chỉ số' },
];

const ServiceListPage = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [isFixed, setIsFixed] = useState('');
  const [editing, setEditing] = useState(null); // null: đóng form · {}: thêm mới · dịch vụ: sửa
  const [deleting, setDeleting] = useState(null); // dịch vụ đang chờ xác nhận xóa
  const [submitting, setSubmitting] = useState(false);

  const loadServices = useCallback(() => {
    const params = {};
    if (keyword.trim()) params.q = keyword.trim();
    if (isFixed !== '') params.isFixed = isFixed;

    serviceApi
      .list(params)
      .then((response) => setServices(Array.isArray(response.data) ? response.data : []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [keyword, isFixed]);

  useEffect(() => {
    const timer = setTimeout(loadServices, 300);
    return () => clearTimeout(timer);
  }, [loadServices]);

  const handleResetFilters = () => {
    setKeyword('');
    setIsFixed('');
  };

  const isFiltered = Boolean(keyword.trim() || isFixed !== '');

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
        subtitle="Quản lý các loại dịch vụ tiện ích áp dụng trong hệ thống"
        actions={
          <>
            <Button variant="primary" onClick={() => setEditing({})}>
              Thêm dịch vụ
            </Button>
            <Button variant="secondary" onClick={() => navigate('/services/prices')}>
              Giá dịch vụ
            </Button>
          </>
        }
      />

      {/* Thanh tìm kiếm và bộ lọc cách tính */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <InputGroup className="w-full md:w-80">
          <InputGroup.Text className="text-secondary">
            <BiSearch size={16} aria-hidden="true" />
          </InputGroup.Text>
          <Form.Control
            type="search"
            placeholder="Tìm tên dịch vụ..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </InputGroup>
        <Form.Select
          className="w-auto"
          value={isFixed}
          onChange={(e) => setIsFixed(e.target.value)}
        >
          {FIXED_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Form.Select>
        {isFiltered && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetFilters}
            className="flex items-center gap-1 ms-auto"
          >
            <BiReset />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={services}
        loading={loading}
        emptyMessage="Chưa có dịch vụ nào"
        onRowClick={(row) => setEditing(row)}
      />

      {editing && (
        <ServiceFormModal
          service={editing}
          onHide={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadServices();
          }}
          onDelete={() => {
            setDeleting(editing);
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
