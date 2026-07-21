import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export async function businessMiddleware(req: Request, res: Response, next: NextFunction) {
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

  // Support 'all' outlets for business owners/super admins
  if (outletId === 'all') {
    if (req.user.role === 'BUSINESS_OWNER' || req.user.role === 'SUPER_ADMIN') {
      req.outletId = 'all';
      return next();
    } else {
      return next(new AppError('FORBIDDEN', 'Only business owners can access aggregated data across all outlets', 403));
    }
  }

  try {
    // 1. Verify the outlet belongs to the user's business
    const outlet = await prisma.outlet.findFirst({
      where: {
        id: outletId,
        businessId: req.user.businessId || undefined,
      },
    });

    if (!outlet) {
      return next(new AppError('FORBIDDEN', 'Access to this outlet is denied or does not exist under your business', 403));
    }

    // 2. Business Owners and Super Admins have access to all outlets under their business
    if (req.user.role === 'BUSINESS_OWNER' || req.user.role === 'SUPER_ADMIN') {
      req.outletId = outletId;
      return next();
    }

    // 3. Otherwise (Managers, Staff, etc.), check explicit assignment to this outlet
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

export default businessMiddleware;
