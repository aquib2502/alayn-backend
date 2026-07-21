import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { OrderController } from './order.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { businessMiddleware } from '../../middleware/business.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createOrderSchema, updateOrderStatusSchema, createPaymentSchema } from './order.schema';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

// Stricter rate limits for QR interactions
const qrLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many QR requests. Please try again later.',
    },
  },
});

const router = Router();
const controller = new OrderController();

// Flexible auth middleware for ordering:
// If Bearer token is passed, authenticate user and check business.
// If not, allow only if request source is QR and has valid TableToken.
async function flexibleOrderAuth(req: Request, res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    return authMiddleware(req, res, (err) => {
      if (err) return next(err);
      return businessMiddleware(req, res, next);
    });
  }

  // QR order customer access
  if (req.body && req.body.source === 'QR' && req.body.tableToken) {
    try {
      const tokenRecord = await prisma.tableToken.findUnique({
        where: { token: req.body.tableToken },
      });
      if (!tokenRecord) {
        return next(new AppError('INVALID_TOKEN', 'Table token is invalid', 400));
      }
      if (new Date() > tokenRecord.expiresAt) {
        return next(new AppError('EXPIRED_TOKEN', 'Table token has expired', 400));
      }
      req.outletId = tokenRecord.outletId;
      req.user = {
        id: '00000000-0000-0000-0000-000000000000', // customer placeholder
        email: 'customer@table.com',
        role: 'STAFF', // Allowed to create orders
        name: `Table ${tokenRecord.tableNumber} Customer`,
      };
      return next();
    } catch (err) {
      return next(err);
    }
  }

  return next(new AppError('UNAUTHORIZED', 'Authentication token or Table token is required', 401));
}

// 1. Public Table Menu fetching (no user auth, rate-limited)
router.get('/tables/:token/menu', qrLimiter, controller.getTableMenu);

// 2. Order placement (requires flexible auth: employee or valid table token)
router.post('/', flexibleOrderAuth, validate({ body: createOrderSchema }), controller.create);

// 3. Management routes (require full user auth)
router.patch('/:id/status', authMiddleware, businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER', 'STAFF', 'KITCHEN'), validate({ body: updateOrderStatusSchema }), controller.updateStatus);
router.post('/:id/payments', authMiddleware, businessMiddleware, authorize('BUSINESS_OWNER', 'MANAGER', 'STAFF'), validate({ body: createPaymentSchema }), controller.createPayment);

// Kitchen orders router
const kitchenRouter = Router();
kitchenRouter.use(authMiddleware);
kitchenRouter.use(businessMiddleware);
kitchenRouter.get('/orders', authorize('BUSINESS_OWNER', 'MANAGER', 'KITCHEN'), controller.getKitchenOrders);

export { kitchenRouter };
export default router;
