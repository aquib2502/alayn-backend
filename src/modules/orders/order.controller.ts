import { Request, Response, NextFunction } from 'express';
import { OrderService } from './order.service';
import { sendSuccess } from '../../utils/response';

export class OrderController {
  private orderService = new OrderService();

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.orderService.createOrder(outletId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  getKitchenOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.orderService.getKitchenOrders(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  createPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id: orderId } = req.params;
      const result = await this.orderService.createPayment(outletId, orderId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id: orderId } = req.params;
      const { status, comment } = req.body;
      const changedById = req.user!.id; // Logged in user ID

      const result = await this.orderService.updateOrderStatus(
        outletId,
        orderId,
        status,
        comment,
        changedById
      );
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getTableMenu = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const result = await this.orderService.getTableMenu(token);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default OrderController;
