import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createItemSchema, adjustStockSchema } from './inventory.schema';

const router = Router();
const controller = new InventoryController();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Manage inventory items (OWNER & MANAGER)
router.post('/items', authorize('TENANT_OWNER', 'MANAGER'), validate({ body: createItemSchema }), controller.create);
router.get('/items/:id/stock', authorize('TENANT_OWNER', 'MANAGER', 'STAFF', 'KITCHEN'), controller.getStock);
router.post('/items/:id/adjust', authorize('TENANT_OWNER', 'MANAGER'), validate({ body: adjustStockSchema }), controller.adjust);

// Recipes (OWNER & MANAGER)
router.post('/recipes', authorize('TENANT_OWNER', 'MANAGER'), controller.createRecipe);

export default router;
