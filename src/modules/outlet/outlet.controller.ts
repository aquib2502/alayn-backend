import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { OutletService } from './outlet.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';

export class OutletController {
  private service = new OutletService();

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) {
        throw new AppError('UNAUTHORIZED', 'User not associated with a tenant', 401);
      }
      const result = await this.service.create(tenantId, userId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) {
        throw new AppError('UNAUTHORIZED', 'User not associated with a tenant', 401);
      }

      let result;
      if (req.user?.role === 'TENANT_OWNER' || req.user?.role === 'SUPER_ADMIN') {
        result = await this.service.listForTenant(tenantId);
      } else {
        result = await this.service.listForUser(userId);
      }
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default OutletController;
