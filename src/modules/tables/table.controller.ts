import { Request, Response, NextFunction } from 'express';
import { TableService } from './table.service';
import { sendSuccess } from '../../utils/response';

export class TableController {
  private service = new TableService();

  getTables = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.service.getTables(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  createBulkTables = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { acCount, nonAcCount } = req.body;
      const result = await this.service.createBulkTables(outletId, acCount || 0, nonAcCount || 0);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  updateTable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const result = await this.service.updateTable(outletId, id, req.body);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  regenerateQRToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const result = await this.service.regenerateQRToken(outletId, id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  deleteTable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const result = await this.service.deleteTable(outletId, id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default TableController;
