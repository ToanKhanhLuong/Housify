// API của module dashboard (UC-07, 47, 48): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const dashboardApi = {
  // UC-07: { buildings, rooms{ total, available, occupied, maintenance }, monthlyRevenue, activeContracts, openIncidents, users, residents, movedIn, movedOut }
  admin: (params) => api.get('/dashboard/admin', { params }),

  // UC-47: { rooms{…}, pendingInvoices{ count, totalAmount, overdueCount }, openIncidents, expiringContracts, monthlyRevenue }
  manager: () => api.get('/dashboard/manager'),

  // UC-48: ?from=&to=&buildingId= → { totalRevenue, revenueByMonth[{ month, revenue }], rooms{…, occupancyRate}, contracts{ new, ended }, latePayments[] }
  report: (params) => api.get('/reports', { params }),

  // danh sách tòa để Admin lọc
  buildings: () => api.get('/buildings'),
};

export default dashboardApi;
