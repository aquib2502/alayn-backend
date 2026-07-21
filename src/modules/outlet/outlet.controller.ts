import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { OutletService } from './outlet.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';

export class OutletController {
  private service = new OutletService();

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const businessId = req.user?.businessId;
      const userId = req.user?.id;
      if (!businessId || !userId) {
        throw new AppError('UNAUTHORIZED', 'User not associated with a business', 401);
      }
      const result = await this.service.create(businessId, userId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const businessId = req.user?.businessId;
      const userId = req.user?.id;
      if (!businessId || !userId) {
        throw new AppError('UNAUTHORIZED', 'User not associated with a business', 401);
      }

      let result;
      if (req.user?.role === 'BUSINESS_OWNER' || req.user?.role === 'SUPER_ADMIN') {
        result = await this.service.listForBusiness(businessId);
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
