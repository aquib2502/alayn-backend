import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
  }

  // Retrieve outlet ID from header, query, params, or body
  const outletId = (req.headers['x-outlet-id'] as string) || 
                   (req.query.outletId as string) || 
                   (req.params.outletId as string) || 
                   (req.body.outletId as string);

  if (!outletId) {
    return next(new AppError('BAD_REQUEST', 'Outlet ID is required for this operation', 400));
  }

  // Owners have access to all outlets automatically
  if (req.user.role === 'OWNER') {
    req.outletId = outletId;
    return next();
  }

  try {
    // Check if user is assigned to this outlet
    const userOutlet = await prisma.userOutlet.findUnique({
      where: {
        userId_outletId: {
          userId: req.user.id,
          outletId: outletId,
        },
      },
    });

    if (!userOutlet) {
      return next(new AppError('FORBIDDEN', 'Access to this outlet is denied', 403));
    }

    req.outletId = outletId;
    next();
  } catch (error) {
    next(error);
  }
}

export default tenantMiddleware;
