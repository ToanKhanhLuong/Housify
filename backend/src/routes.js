// Mount TOÀN BỘ module vào /api
// Mỗi module tự khai báo đường dẫn đầy đủ trong <ten>.routes.js
// Khi làm xong một module: bỏ comment ĐÚNG HAI DÒNG của module đó (import + router.use)
import { Router } from 'express';

// --- Iteration 1 ---
// import authRoutes from './modules/auth/auth.routes.js';                     // UC-01..05
// import activationRoutes from './modules/activation/activation.routes.js';   // UC-06, 08
// import managerRoutes from './modules/manager/manager.routes.js';            // UC-08..11
// import buildingRoutes from './modules/building/building.routes.js';         // UC-12..15, 23
// import roomRoutes from './modules/room/room.routes.js';                     // UC-16..19
// import roomTypeRoutes from './modules/roomType/roomType.routes.js';         // UC-20
// import serviceRoutes from './modules/service/service.routes.js';            // UC-21, 22
// import uploadRoutes from './modules/upload/upload.routes.js';
// import notificationRoutes from './modules/notification/notification.routes.js'; // UC-41

// --- Iteration 2 ---
// import contractRoutes from './modules/contract/contract.routes.js';         // UC-24..27, 45, 46
// import terminationRoutes from './modules/termination/termination.routes.js'; // UC-28, 29
// import occupantRoutes from './modules/occupant/occupant.routes.js';         // UC-30..33
// import invoiceRoutes from './modules/invoice/invoice.routes.js';            // UC-34..37
// import paymentRoutes from './modules/payment/payment.routes.js';            // UC-38, 39, 42
// import announcementRoutes from './modules/announcement/announcement.routes.js'; // UC-40
// import incidentRoutes from './modules/incident/incident.routes.js';         // UC-43, 44
// import devRoutes from './modules/dev/dev.routes.js';                        // chỉ dev / demo

// --- Iteration 3 ---
// import dashboardRoutes from './modules/dashboard/dashboard.routes.js';      // UC-07, 47, 48
// import ocrRoutes from './modules/ocr/ocr.routes.js';                        // làm nếu kịp

const router = Router();

// --- Iteration 1 ---
// router.use(authRoutes);
// router.use(activationRoutes);
// router.use(managerRoutes);
// router.use(buildingRoutes);
// router.use(roomRoutes);
// router.use(roomTypeRoutes);
// router.use(serviceRoutes);
// router.use(uploadRoutes);
// router.use(notificationRoutes);

// --- Iteration 2 ---
// router.use(contractRoutes);
// router.use(terminationRoutes);
// router.use(occupantRoutes);
// router.use(invoiceRoutes);
// router.use(paymentRoutes);
// router.use(announcementRoutes);
// router.use(incidentRoutes);
// router.use(devRoutes);

// --- Iteration 3 ---
// router.use(dashboardRoutes);
// router.use(ocrRoutes);

export default router;
