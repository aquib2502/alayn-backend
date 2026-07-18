import { Router } from 'express';
import { ShiftController } from './shift.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createShiftSchema, assignShiftSchema, createSwapSchema, updateSwapStatusSchema } from './shift.schema';

const router = Router();
const controller = new ShiftController();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Only OWNER & MANAGER can configure shifts
router.post('/', authorize('TENANT_OWNER', 'MANAGER'), validate({ body: createShiftSchema }), controller.create);
router.post('/:id/assign', authorize('TENANT_OWNER', 'MANAGER'), validate({ body: assignShiftSchema }), controller.assign);

// Swaps
router.post('/swaps', authorize('TENANT_OWNER', 'MANAGER', 'STAFF'), validate({ body: createSwapSchema }), controller.requestSwap);
router.patch('/swaps/:id', authorize('TENANT_OWNER', 'MANAGER'), validate({ body: updateSwapStatusSchema }), controller.updateSwapStatus);

export default router;
