// Mount TOÀN BỘ module vào /api
// Mỗi module tự khai báo đường dẫn đầy đủ trong <ten>.routes.js
// Khi làm xong một module: bỏ comment ĐÚNG HAI DÒNG của module đó (import + router.use)
import { Router } from 'express';

// --- Iteration 1 ---
import authRoutes from './modules/auth/auth.routes.js';                     // An    | UC-01..05
import managerRoutes from './modules/manager/manager.routes.js';            // An    | UC-08..11
import activationRoutes from './modules/activation/activation.routes.js';   // An    | iter 1: link kích hoạt Manager (UC-08), iter 2: thêm Customer (UC-06)
import notificationRoutes from './modules/notification/notification.routes.js'; // An | UC-41
import buildingRoutes from './modules/building/building.routes.js';         // Toàn  | UC-12..15, 23
// import roomRoutes from './modules/room/room.routes.js';                     // Toàn  | UC-16..19
import roomTypeRoutes from './modules/roomType/roomType.routes.js';         // Toàn  | UC-20
// import serviceRoutes from './modules/service/service.routes.js';            // Toàn  | UC-21, 22
import uploadRoutes from './modules/upload/upload.routes.js';               // Toàn  | Cloudinary

// --- Iteration 2 ---
// import contractRoutes from './modules/contract/contract.routes.js';         // An    | UC-24..27, 46 (UC-45 thêm ở iter 3)
// import occupantRoutes from './modules/occupant/occupant.routes.js';         // An    | UC-30..33
// import invoiceRoutes from './modules/invoice/invoice.routes.js';            // Toàn  | UC-34..37
// import paymentRoutes from './modules/payment/payment.routes.js';            // Toàn  | UC-38, 39, 42 (webhook SePay)
// import announcementRoutes from './modules/announcement/announcement.routes.js'; // Toàn | UC-40
// import devRoutes from './modules/dev/dev.routes.js';                        // Toàn  | giả lập webhook, bật bằng ENABLE_DEV_ROUTES
// import incidentRoutes from './modules/incident/incident.routes.js';         // Hiếu  | UC-43, 44

// --- Iteration 3 ---
// import terminationRoutes from './modules/termination/termination.routes.js'; // An   | UC-28, 29
// import dashboardRoutes from './modules/dashboard/dashboard.routes.js';      // Hiếu  | UC-07, 47, 48
// import ocrRoutes from './modules/ocr/ocr.routes.js';                        // Toàn  | làm nếu kịp

const router = Router();

// --- Iteration 1 ---
router.use(authRoutes);
router.use(managerRoutes);
router.use(activationRoutes);
router.use(notificationRoutes);
router.use(buildingRoutes);
// router.use(roomRoutes);
router.use(roomTypeRoutes);
// router.use(serviceRoutes);
router.use(uploadRoutes);

// --- Iteration 2 ---
// router.use(contractRoutes);
// router.use(occupantRoutes);
// router.use(invoiceRoutes);
// router.use(paymentRoutes);
// router.use(announcementRoutes);
// router.use(devRoutes);
// router.use(incidentRoutes);

// --- Iteration 3 ---
// router.use(terminationRoutes);
// router.use(dashboardRoutes);
// router.use(ocrRoutes);

export default router;
