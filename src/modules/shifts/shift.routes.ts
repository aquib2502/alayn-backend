import { Router } from 'express';
import { ShiftController } from './shift.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { businessMiddleware } from '../../middleware/business.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createShiftSchema, assignShiftSchema, createSwapSchema, updateSwapStatusSchema } from './shift.schema';

const router = Router();
const controller = new ShiftController();

router.use(authMiddleware);
router.use(businessMiddleware);

// Only OWNER & MANAGER can configure shifts, but all roles can view shifts
router.get('/', authorize('BUSINESS_OWNER', 'MANAGER', 'STAFF', 'KITCHEN'), controller.list);
router.post('/', authorize('BUSINESS_OWNER', 'MANAGER'), validate({ body: createShiftSchema }), controller.create);
router.post('/:id/assign', authorize('BUSINESS_OWNER', 'MANAGER'), validate({ body: assignShiftSchema }), controller.assign);

// Swaps
router.post('/swaps', authorize('BUSINESS_OWNER', 'MANAGER', 'STAFF'), validate({ body: createSwapSchema }), controller.requestSwap);
router.patch('/swaps/:id', authorize('BUSINESS_OWNER', 'MANAGER'), validate({ body: updateSwapStatusSchema }), controller.updateSwapStatus);

// Rosters (Weekly Templates)
router.get('/rosters/outlet', authorize('BUSINESS_OWNER', 'MANAGER'), controller.getOutletRosters);
router.get('/rosters/employee/:employeeId', authorize('BUSINESS_OWNER', 'MANAGER', 'STAFF', 'KITCHEN'), controller.getEmployeeRoster);
router.post('/rosters', authorize('BUSINESS_OWNER', 'MANAGER'), controller.setWeeklyRoster);

export default router;
