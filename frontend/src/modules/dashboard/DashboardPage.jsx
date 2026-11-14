// UC-07, 47: Trang Tổng quan điều hành /dashboard phân tách 2 giao diện riêng biệt cho Admin và Manager
// Admin: Theo thiết kế Ảnh 1 (4 KPI, Biểu đồ hoạt động 7 ngày, Donut cơ cấu phòng, Hoạt động gần đây)
// Manager: Theo thiết kế Ảnh 2 (4 KPI, Tình hình cơ sở với Segmented Progress Bar, Hoạt động gần đây, Công việc cần xử lý - phủ 1 screen không cuộn)
import { useCallback, useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import SkeletonRows from '../../components/SkeletonRows';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../constants/enums';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import dashboardApi from './dashboard.api';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user.role === ROLE.ADMIN;

  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const loadData = useCallback((silent = false) => {
    const request = isAdmin ? dashboardApi.admin({}) : dashboardApi.manager();

    return request
      .then((response) => setState({ status: 'ok', data: response.data, error: '' }))
      .catch((error) => {
        if (silent) return;
        setState((prev) => ({
          status: error.status === 403 && !isAdmin ? 'noBuilding' : 'error',
          data: prev.data,
          error: error.message,
        }));
      });
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData(true), { enabled: state.status === 'ok' });

  const { status, data, error } = state;

  if (status === 'noBuilding') {
    return <EmptyState message={error || 'Bạn chưa được cấp quyền quản lý tòa nhà'} />;
  }

  if (status === 'loading' && !data) {
    return (
      <Card className="rounded-2xl border-slate-100 shadow-xs">
        <Card.Body className="p-4">
          <SkeletonRows rows={6} columns={4} />
        </Card.Body>
      </Card>
    );
  }

  if (status === 'error' && !data) {
    return (
      <ErrorState
        message="Không tải được số liệu tổng quan"
        detail={error}
        onRetry={loadData}
      />
    );
  }

  if (isAdmin) {
    return <AdminDashboard data={data} />;
  }

  return <ManagerDashboard data={data} />;
};

export default DashboardPage;
