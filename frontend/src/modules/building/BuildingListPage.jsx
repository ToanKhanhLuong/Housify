// UC-13: danh sách tòa nhà đang hoạt động (Admin). Bấm dòng mở chi tiết; "Thêm tòa nhà" mở form UC-12
import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import buildingApi from './building.api';
import BuildingFormModal from './components/BuildingFormModal';

const BuildingListPage = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    buildingApi
      .list()
      .then((response) => setBuildings(response.data?.items ?? response.data ?? []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'name', title: 'Tên tòa nhà', className: 'fw-semibold' },
    { key: 'address', title: 'Địa chỉ' },
    { key: 'floorCount', title: 'Số tầng', align: 'end' },
    { key: 'roomCount', title: 'Số phòng', align: 'end' },
    {
      key: 'manager',
      title: 'Manager phụ trách',
      render: (row) => row.manager?.name ?? <span className="text-secondary">Chưa có Manager</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Tòa nhà"
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Thêm tòa nhà
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={buildings}
        loading={loading}
        emptyMessage="Chưa có tòa nhà nào"
        onRowClick={(row) => navigate(`/buildings/${row._id}`)}
      />

      {/* UC-12 bước 4: tạo xong chuyển sang trang chi tiết tòa */}
      {showForm && (
        <BuildingFormModal
          building={{}}
          onHide={() => setShowForm(false)}
          onSaved={(building) => navigate(`/buildings/${building._id}`)}
        />
      )}
    </>
  );
};

export default BuildingListPage;
