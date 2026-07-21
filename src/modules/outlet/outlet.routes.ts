import { Router } from 'express';
import { OutletController } from './outlet.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createOutletSchema } from './outlet.schema';
import { authorize } from '../../middleware/role.middleware';

const router = Router();
const controller = new OutletController();

router.use(authMiddleware);

router.post('/', authorize('BUSINESS_OWNER', 'SUPER_ADMIN'), validate({ body: createOutletSchema }), controller.create);
router.get('/', controller.list);

export default router;
