import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { sendSuccess } from '../../utils/response';

export class AttendanceController {
  private attendanceService = new AttendanceService();

  checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { employeeId } = req.body;
      const userId = req.user?.id;
      const result = await this.attendanceService.checkIn(outletId, employeeId, userId);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  checkOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { employeeId } = req.body;
      const userId = req.user?.id;
      const result = await this.attendanceService.checkOut(outletId, employeeId, userId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  listLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.attendanceService.getAttendanceLogs(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default AttendanceController;
