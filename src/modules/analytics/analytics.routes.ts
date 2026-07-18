import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authorize } from '../../middleware/role.middleware';

const router = Router();
const controller = new AnalyticsController();

router.use(authMiddleware);

// Only OWNER & MANAGER can access analytics
router.get('/daily-summary', tenantMiddleware, authorize('TENANT_OWNER', 'MANAGER'), controller.getDailySummary);
router.get('/best-worst-sellers', tenantMiddleware, authorize('TENANT_OWNER', 'MANAGER'), controller.getBestWorstSellers);
router.get('/reports', tenantMiddleware, authorize('TENANT_OWNER', 'MANAGER'), controller.getReports);

// Outlet comparison aggregates data across outlets, so it doesn't scope to a single tenant ID
router.get('/outlet-comparison', authorize('TENANT_OWNER', 'MANAGER'), controller.getOutletComparison);

export default router;
