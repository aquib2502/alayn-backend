import { Router } from 'express';
import { MenuController } from './menu.controller';
import { InventoryController } from '../inventory/inventory.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { businessMiddleware } from '../../middleware/business.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createCategorySchema, createMenuItemSchema, updateMenuItemSchema } from './menu.schema';

const router = Router();
const controller = new MenuController();
const inventoryController = new InventoryController();

// Public/logged-in menu fetch
router.get('/', authMiddleware, businessMiddleware, controller.getPublicMenu);

// Category management
router.get('/categories', authMiddleware, businessMiddleware, controller.getCategories);
router.post('/categories', authMiddleware, businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER'), validate({ body: createCategorySchema }), controller.createCategory);

// Item management
router.get('/items', authMiddleware, businessMiddleware, controller.getMenuItems);
router.post('/items', authMiddleware, businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER'), validate({ body: createMenuItemSchema }), controller.createMenuItem);
router.patch('/items/:id', authMiddleware, businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER'), validate({ body: updateMenuItemSchema }), controller.updateMenuItem);
router.patch('/items/:id/status', authMiddleware, businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER'), controller.toggleMenuItemStatus);

// Menu item costing (OWNER & MANAGER)
router.get('/items/:id/cost', authMiddleware, businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER'), inventoryController.getMenuItemCost);

export default router;

