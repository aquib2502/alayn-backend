import { Router } from 'express';
import { MenuController } from './menu.controller';
import { InventoryController } from '../inventory/inventory.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createCategorySchema, createMenuItemSchema } from './menu.schema';

const router = Router();
const controller = new MenuController();
const inventoryController = new InventoryController();

// Public/logged-in menu fetch
router.get('/', authMiddleware, tenantMiddleware, controller.getPublicMenu);

// Category and item management (OWNER & MANAGER)
router.post('/categories', authMiddleware, tenantMiddleware, authorize('OWNER', 'MANAGER'), validate({ body: createCategorySchema }), controller.createCategory);
router.post('/items', authMiddleware, tenantMiddleware, authorize('OWNER', 'MANAGER'), validate({ body: createMenuItemSchema }), controller.createMenuItem);

// Menu item costing (OWNER & MANAGER)
router.get('/items/:id/cost', authMiddleware, tenantMiddleware, authorize('OWNER', 'MANAGER'), inventoryController.getMenuItemCost);

export default router;
