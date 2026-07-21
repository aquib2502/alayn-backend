import { Request, Response, NextFunction } from 'express';
import { ShiftService } from './shift.service';
import { sendSuccess } from '../../utils/response';

export class ShiftController {
  private shiftService = new ShiftService();

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.shiftService.createShift(outletId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.shiftService.getShifts(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  assign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id: shiftId } = req.params;
      const { employeeId, date } = req.body;

      const result = await this.shiftService.assignShift(outletId, shiftId, employeeId, date);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  requestSwap = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.shiftService.createSwapRequest(outletId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  updateSwapStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const { status } = req.body;
      const result = await this.shiftService.updateSwapStatus(outletId, id, status);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getEmployeeRoster = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const result = await this.shiftService.getEmployeeRoster(employeeId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getOutletRosters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.shiftService.getOutletRosters(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  setWeeklyRoster = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { employeeId, weeklySchedule } = req.body;
      const result = await this.shiftService.setWeeklyRoster(outletId, employeeId, weeklySchedule);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default ShiftController;
