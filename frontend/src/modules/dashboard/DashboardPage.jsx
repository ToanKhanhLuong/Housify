// UC-07, 47: trang tổng quan /dashboard. Admin xem toàn hệ thống, lọc được theo tòa; Manager xem tòa mình phụ trách
// Các ô số liệu bấm được sang trang chi tiết tương ứng. Trang chỉ đọc
// Tải lại lỗi mà còn số liệu lần trước thì vẫn hiện, kèm ghi chú "Dữ liệu có thể chưa cập nhật" (UC-07)
import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Form } from 'react-bootstrap';
import {
  BiBuildings,
  BiErrorCircle,
  BiFile,
  BiGroup,
  BiLogIn,
  BiLogOut,
  BiMoney,
  BiReceipt,
  BiTimeFive,
  BiUser,
} from 'react-icons/bi';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import MoneyText from '../../components/MoneyText';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import dashboardApi from './dashboard.api';
import RoomStatusChart from './components/RoomStatusChart';
import StatTile from './components/StatTile';

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  // loading → ok | noBuilding | error; data giữ số liệu lần tải được gần nhất
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    dashboardApi
      .buildings()
      .then((response) => {
        const data = response.data;
        setBuildings(Array.isArray(data) ? data : (data?.items ?? []));
      })
      .catch(() => setBuildings([]));
  }, [isAdmin]);

  const loadData = useCallback(() => {
    const request = isAdmin
      ? dashboardApi.admin(buildingId ? { buildingId } : {})
      : dashboardApi.manager();
    return request
      .then((response) => setState({ status: 'ok', data: response.data, error: '' }))
      .catch((error) =>
        setState((prev) => ({
          status: error.status === 403 && !isAdmin ? 'noBuilding' : 'error',
          data: prev.data,
          error: error.message,
        })),
      );
  }, [isAdmin, buildingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { status, data, error } = state;

  if (status === 'noBuilding') {
    return <EmptyState message={error || 'Bạn chưa được cấp quyền quản lý tòa nhà'} />;
  }
  if (status === 'loading' && !data) {
    return (
      <Card>
        <Card.Body>
          <SkeletonRows rows={5} columns={4} />
        </Card.Body>
      </Card>
    );
  }
  if (status === 'error' && !data) {
    return <ErrorState message="Không tải được số liệu tổng quan" detail={error} onRetry={loadData} />;
  }

  const roomsPath = isAdmin ? '/buildings' : '/my-building';

  return (
    <div className="flex flex-col gap-3">
      {isAdmin && (
        <Card>
          <Card.Body className="flex flex-wrap items-center gap-3 py-2">
            <Form.Label htmlFor="dashboard-building" className="mb-0 fw-semibold">
              Phạm vi
            </Form.Label>
            <Form.Select
              id="dashboard-building"
              className="w-auto min-w-64"
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
            >
              <option value="">Toàn hệ thống</option>
              {buildings.map((building) => (
                <option key={building._id} value={building._id}>
                  {building.name}
                </option>
              ))}
            </Form.Select>
          </Card.Body>
        </Card>
      )}

      {status === 'error' && (
        <Alert variant="warning" className="mb-0 small">
          Dữ liệu có thể chưa cập nhật: {error}
        </Alert>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile
          icon={BiMoney}
          label="Doanh thu tháng này"
          value={<MoneyText value={data.monthlyRevenue} />}
          to="/reports"
        />
        {isAdmin ? (
          <>
            <StatTile icon={BiBuildings} label="Tòa nhà" value={data.buildings} to="/buildings" />
            <StatTile icon={BiFile} label="Hợp đồng đang hiệu lực" value={data.activeContracts} />
            <StatTile icon={BiErrorCircle} label="Sự cố chưa xử lý" value={data.openIncidents} />
            <StatTile icon={BiUser} label="Người dùng" value={data.users} to="/managers" />
            <StatTile icon={BiGroup} label="Người đang ở" value={data.residents} />
            <StatTile icon={BiLogIn} label="Chuyển vào tháng này" value={data.movedIn} />
            <StatTile icon={BiLogOut} label="Chuyển đi tháng này" value={data.movedOut} />
          </>
        ) : (
          <>
            <StatTile
              icon={BiReceipt}
              label="Hóa đơn chờ thanh toán"
              value={data.pendingInvoices.count}
              sub={
                <>
                  Chưa thu <MoneyText value={data.pendingInvoices.totalAmount} className="fw-semibold" />
                  {data.pendingInvoices.overdueCount > 0 && ` · ${data.pendingInvoices.overdueCount} quá hạn`}
                </>
              }
              to="/invoices"
            />
            <StatTile icon={BiErrorCircle} label="Sự cố chưa xử lý" value={data.openIncidents} to="/incidents" />
            <StatTile
              icon={BiTimeFive}
              label="Hợp đồng hết hạn trong 30 ngày"
              value={data.expiringContracts}
              to="/contracts"
            />
          </>
        )}
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="h6 fw-bold mb-0">Phòng theo trạng thái</h2>
            <Link to={roomsPath} className="small">
              Xem phòng
            </Link>
          </div>
          <RoomStatusChart rooms={data.rooms} />
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardPage;
