import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { businessMiddleware } from '../../middleware/business.middleware';

const router = Router();
const controller = new DashboardController();

router.use(authMiddleware);

router.get('/kpi', businessMiddleware, controller.getKpi);
router.get('/sales-forecast', businessMiddleware, controller.getSalesForecast);
router.get('/inventory-forecast', businessMiddleware, controller.getInventoryForecast);

export default router;
