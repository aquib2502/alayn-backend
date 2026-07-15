import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from './employee.service';
import { sendSuccess, sendList } from '../../utils/response';
import { getPaginationParams } from '../../utils/pagination';
import { AppError } from '../../utils/AppError';

export class EmployeeController {
  private employeeService = new EmployeeService();

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.employeeService.createEmployee(outletId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { limit, offset } = getPaginationParams(req);
      const { data, total } = await this.employeeService.getEmployees(outletId, limit, offset);
      return sendList(res, data, { limit, offset, total });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const result = await this.employeeService.updateEmployee(outletId, id, req.body);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      await this.employeeService.deleteEmployee(outletId, id);
      return sendSuccess(res, { message: 'Employee profile deleted' });
    } catch (error) {
      next(error);
    }
  };

  uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;

      if (!req.file) {
        throw new AppError('FILE_REQUIRED', 'Please upload a file', 400);
      }

      const doc = await this.employeeService.addDocument(
        outletId,
        id,
        req.file.originalname,
        req.file.path,
        req.file.mimetype,
        req.file.size
      );

      return sendSuccess(res, doc, 201);
    } catch (error) {
      next(error);
    }
  };

  createLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.employeeService.createLeaveRequest(outletId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  updateLeaveStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const { status } = req.body;
      const approvedById = req.user!.id; // Manager or Owner user ID
      const result = await this.employeeService.updateLeaveRequestStatus(outletId, id, status, approvedById);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default EmployeeController;
