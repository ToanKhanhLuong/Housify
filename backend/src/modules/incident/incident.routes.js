// Khai báo routes cho module incident (UC-43, UC-44)
import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { ROLE } from '../../constants/enums.js';
import {
    createIncidentSchema,
    incidentIdParamSchema,
    listIncidentsSchema,
    rejectIncidentSchema,
    resolveIncidentSchema,
} from './incident.validation.js';
import * as incidentController from './incident.controller.js';

const router = Router();

// UC-43: Customer có hợp đồng đang hiệu lực gửi báo cáo sự cố
router.post(
    '/incidents',
    auth,
    requireRole(ROLE.CUSTOMER),
    validate(createIncidentSchema),
    incidentController.createIncident,
);

// UC-43, UC-44: Customer xem đơn mình gửi, Manager xem đơn của tòa mình
router.get(
    '/incidents',
    auth,
    requireRole(ROLE.MANAGER, ROLE.CUSTOMER),
    validate(listIncidentsSchema, 'query'),
    incidentController.getIncidents,
);

router.get(
    '/incidents/:id',
    auth,
    requireRole(ROLE.MANAGER, ROLE.CUSTOMER),
    validate(incidentIdParamSchema, 'params'),
    incidentController.getIncidentById,
);

// UC-44: Manager tiếp nhận, giải quyết, từ chối
router.patch(
    '/incidents/:id/accept',
    auth,
    requireRole(ROLE.MANAGER),
    validate(incidentIdParamSchema, 'params'),
    incidentController.acceptIncident,
);

router.patch(
    '/incidents/:id/resolve',
    auth,
    requireRole(ROLE.MANAGER),
    validate(incidentIdParamSchema, 'params'),
    validate(resolveIncidentSchema),
    incidentController.resolveIncident,
);

router.patch(
    '/incidents/:id/reject',
    auth,
    requireRole(ROLE.MANAGER),
    validate(incidentIdParamSchema, 'params'),
    validate(rejectIncidentSchema),
    incidentController.rejectIncident,
);

export default router;
