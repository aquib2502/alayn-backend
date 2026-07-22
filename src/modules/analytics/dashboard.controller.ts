import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '../../utils/response';

export class DashboardController {
  private dashboardService = new DashboardService();

  getKpi = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId || (req.query.outletId as string);
      const businessId = req.businessId;
      const result = await this.dashboardService.getKpis(outletId, businessId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSalesForecast = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId || (req.query.outletId as string);
      const businessId = req.businessId;
      const result = await this.dashboardService.getSalesForecast(outletId, businessId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getInventoryForecast = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId || (req.query.outletId as string);
      const businessId = req.businessId;
      const result = await this.dashboardService.getInventoryForecast(outletId, businessId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
