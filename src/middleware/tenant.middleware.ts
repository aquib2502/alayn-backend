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

  try {
    // 1. Verify the outlet belongs to the user's tenant
    const outlet = await prisma.outlet.findFirst({
      where: {
        id: outletId,
        tenantId: req.user.tenantId || undefined,
      },
    });

    if (!outlet) {
      return next(new AppError('FORBIDDEN', 'Access to this outlet is denied or does not exist under your tenant', 403));
    }

    // 2. Tenant Owners and Super Admins have access to all outlets under their tenant
    if (req.user.role === 'TENANT_OWNER' || req.user.role === 'SUPER_ADMIN') {
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

export default tenantMiddleware;
