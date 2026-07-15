import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { sendError } from '../utils/response';

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  // Log the error
  logger.error(err);

  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode);
  }

  // Handle Prisma Known Errors (like unique constraints) or Validation Issues
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    // Prisma error
    return sendError(res, 'DATABASE_ERROR', 'A database operations error occurred', 500);
  }

  // Fallback generic error
  return sendError(res, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred', 500);
}
export default errorMiddleware;
