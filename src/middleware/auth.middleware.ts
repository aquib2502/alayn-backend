import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface UserPayload {
  id: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF' | 'KITCHEN';
  name: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      outletId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'No authentication token provided', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError('UNAUTHORIZED', 'Invalid or expired token', 401));
  }
}

export default authMiddleware;
