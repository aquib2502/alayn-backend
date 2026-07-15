import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { sendSuccess } from '../../utils/response';

export class AnalyticsController {
  private analyticsService = new AnalyticsService();

  getDailySummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { startDate, endDate } = req.query;
      const result = await this.analyticsService.getDailySummary(
        outletId,
        startDate as string,
        endDate as string
      );
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getBestWorstSellers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.analyticsService.getBestWorstSellers(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getOutletComparison = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Note: Outlet comparison compares all outlets, so it doesn't restrict to one outletId
      const result = await this.analyticsService.getOutletComparison();
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { startDate, endDate } = req.query;
      const result = await this.analyticsService.getReports(
        outletId,
        startDate as string,
        endDate as string
      );
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default AnalyticsController;
