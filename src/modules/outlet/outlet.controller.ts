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

  getHolidays = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const outletId = (req as any).outletId;
      if (!outletId) {
        throw new AppError('OUTLET_REQUIRED', 'Outlet context required', 400);
      }
      const result = await this.service.getHolidays(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  createHoliday = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const outletId = (req as any).outletId;
      const { name, date, applyToAllOutlets } = req.body;
      if (!outletId || !name || !date) {
        throw new AppError('VALIDATION_ERROR', 'Outlet ID, holiday name, and date are required', 400);
      }
      const result = await this.service.createHoliday(outletId, name, date, applyToAllOutlets);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  deleteHoliday = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const outletId = (req as any).outletId;
      const { id } = req.params;
      const result = await this.service.deleteHoliday(outletId, id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateOperatingDays = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const outletId = (req as any).outletId;
      const { operatingDays } = req.body;
      if (!outletId || !Array.isArray(operatingDays)) {
        throw new AppError('VALIDATION_ERROR', 'Outlet ID and operatingDays array are required', 400);
      }
      const result = await this.service.updateOperatingDays(outletId, operatingDays);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default OutletController;
