import { Router } from 'express';
import { PurchaseOrderController } from './purchaseOrder.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createPOSchema, receivePOSchema } from './purchaseOrder.schema';

const router = Router();
const controller = new PurchaseOrderController();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Only OWNER & MANAGER can perform PO activities
router.post('/suppliers', authorize('TENANT_OWNER', 'MANAGER'), controller.createSupplier);
router.post('/', authorize('TENANT_OWNER', 'MANAGER'), validate({ body: createPOSchema }), controller.createPO);
router.patch('/:id/receive', authorize('TENANT_OWNER', 'MANAGER'), validate({ body: receivePOSchema }), controller.receivePO);

export default router;
