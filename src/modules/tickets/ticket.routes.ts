import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { TicketController } from './ticket.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createFeedbackSchema, createStaffQuerySchema, updateTicketStatusSchema } from './ticket.schema';

const router = Router();
const controller = new TicketController();

// Stricter rate limiter for customer feedback submission (max 5 per 15 minutes)
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many feedback requests. Please try again later.',
    },
  },
});

// 1. Customer Feedback (Public, rate-limited)
router.post('/feedback', feedbackLimiter, validate({ body: createFeedbackSchema }), controller.createFeedback);

// 2. Staff Queries (Requires auth & tenant)
router.post(
  '/staff-queries',
  authMiddleware,
  tenantMiddleware,
  authorize('TENANT_OWNER', 'MANAGER', 'STAFF', 'KITCHEN'),
  validate({ body: createStaffQuerySchema }),
  controller.createStaffQuery
);

// 3. Tickets Management (Requires auth, tenant, OWNER or MANAGER)
router.get(
  '/tickets',
  authMiddleware,
  tenantMiddleware,
  authorize('TENANT_OWNER', 'MANAGER'),
  controller.list
);

router.patch(
  '/tickets/:id',
  authMiddleware,
  tenantMiddleware,
  authorize('TENANT_OWNER', 'MANAGER'),
  validate({ body: updateTicketStatusSchema }),
  controller.updateStatus
);

export default router;
