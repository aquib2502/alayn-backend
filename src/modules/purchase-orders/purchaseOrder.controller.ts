import { Request, Response, NextFunction } from 'express';
import { PurchaseOrderService } from './purchaseOrder.service';
import { sendSuccess } from '../../utils/response';

export class PurchaseOrderController {
  private poService = new PurchaseOrderService();

  createSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.poService.createSupplier(outletId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.poService.getSuppliers(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPOs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.poService.getPurchaseOrders(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };


  createPO = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { supplierId, items } = req.body;
      const result = await this.poService.createPO(outletId, supplierId, items);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  receivePO = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const { items } = req.body;
      const result = await this.poService.receivePO(outletId, id, items);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default PurchaseOrderController;
