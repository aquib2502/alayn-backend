import { Router } from 'express';
import { WasteController } from './waste.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createWasteLogSchema } from './waste.schema';

const router = Router();
const controller = new WasteController();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Only OWNER, MANAGER, and KITCHEN can manage waste logs
router.post('/', authorize('OWNER', 'MANAGER', 'KITCHEN'), validate({ body: createWasteLogSchema }), controller.create);
router.get('/', authorize('OWNER', 'MANAGER'), controller.list);
router.get('/summary', authorize('OWNER', 'MANAGER'), controller.summary);

export default router;
