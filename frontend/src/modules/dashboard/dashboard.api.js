// API của module dashboard (UC-07, 47, 48): mỗi hàm gọi 1 endpoint trong docs/api.md, trả về { success, data, message }
import api from '../../api/axios';

const dashboardApi = {
  // UC-07: { buildings, rooms{ total, available, occupied, maintenance }, monthlyRevenue, activeContracts, openIncidents, users, residents, movedIn, movedOut, buildingOverview, featuredRooms, recentActivities }
  admin: (params) => api.get('/dashboard/admin', { params }),

  // UC-47: { rooms{…}, pendingInvoices{ count, totalAmount, overdueCount }, openIncidents, expiringContracts, monthlyRevenue, buildingOverview, featuredRooms, recentActivities }
  manager: () => api.get('/dashboard/manager'),

  // UC-48: ?from=&to=&buildingId= → { totalRevenue, revenueByMonth[{ month, revenue }], rooms{…, occupancyRate}, contracts{ new, ended }, latePayments[] }
  report: (params) => api.get('/reports', { params }),

  // Danh sách tòa (Admin): lọc báo cáo theo tòa; ?hasManager=false → tòa chưa có Manager (việc cần xử lý UC-07)
  buildings: (params) => api.get('/buildings', { params }),

  // Đếm đơn chấm dứt chờ xử lý cho khối "Việc cần xử lý": ?type=&status=PENDING&limit=1 → đọc total
  terminations: (params) => api.get('/terminations', { params }),
};

export default dashboardApi;
