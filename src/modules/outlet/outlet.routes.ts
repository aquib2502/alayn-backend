import { Router } from 'express';
import { OutletController } from './outlet.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createOutletSchema } from './outlet.schema';
import { authorize } from '../../middleware/role.middleware';

import { businessMiddleware } from '../../middleware/business.middleware';

const router = Router();
const controller = new OutletController();

router.use(authMiddleware);

router.post('/', authorize('BUSINESS_OWNER', 'SUPER_ADMIN'), validate({ body: createOutletSchema }), controller.create);
router.get('/', controller.list);

// Outlet Holidays & Operating Days (requires businessMiddleware for outletId context)
router.get('/holidays', businessMiddleware, controller.getHolidays);
router.post('/holidays', businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER'), controller.createHoliday);
router.delete('/holidays/:id', businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER'), controller.deleteHoliday);
router.patch('/operating-days', businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER'), controller.updateOperatingDays);

export default router;
