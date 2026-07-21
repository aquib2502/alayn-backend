import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { businessMiddleware } from '../../middleware/business.middleware';
import { validate } from '../../middleware/validate.middleware';
import { checkInSchema, checkOutSchema } from './attendance.schema';

const router = Router();
const controller = new AttendanceController();

router.use(authMiddleware);
router.use(businessMiddleware);

router.post('/check-in', validate({ body: checkInSchema }), controller.checkIn);
router.post('/check-out', validate({ body: checkOutSchema }), controller.checkOut);

export default router;
