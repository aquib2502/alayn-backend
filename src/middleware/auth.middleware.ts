import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface UserPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'MANAGER' | 'STAFF' | 'KITCHEN';
  name: string;
  businessId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  outletId?: string;
  businessId?: string;
}

// Extend Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      outletId?: string;
      businessId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return next(new AppError('UNAUTHORIZED', 'No authentication token provided', 401));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    req.user = decoded;
    if (decoded.businessId) {
      req.businessId = decoded.businessId;
    }
    next();
  } catch (error) {
    return next(new AppError('UNAUTHORIZED', 'Invalid or expired token', 401));
  }
}

export default authMiddleware;
