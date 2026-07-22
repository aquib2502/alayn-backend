import { Router } from 'express';
import { PurchaseOrderController } from './purchaseOrder.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { businessMiddleware } from '../../middleware/business.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createPOSchema, receivePOSchema } from './purchaseOrder.schema';

const router = Router();
const controller = new PurchaseOrderController();

router.use(authMiddleware);
router.use(businessMiddleware);

// Only OWNER & MANAGER can perform PO activities
router.get('/suppliers', authorize('BUSINESS_OWNER', 'MANAGER', 'STAFF'), controller.getSuppliers);
router.post('/suppliers', authorize('BUSINESS_OWNER', 'MANAGER'), controller.createSupplier);
router.delete('/suppliers/:id', authorize('BUSINESS_OWNER', 'MANAGER'), controller.deleteSupplier);
router.get('/', authorize('BUSINESS_OWNER', 'MANAGER', 'STAFF'), controller.getPOs);
router.post('/', authorize('BUSINESS_OWNER', 'MANAGER'), validate({ body: createPOSchema }), controller.createPO);
router.patch('/:id/receive', authorize('BUSINESS_OWNER', 'MANAGER'), validate({ body: receivePOSchema }), controller.receivePO);

export default router;

