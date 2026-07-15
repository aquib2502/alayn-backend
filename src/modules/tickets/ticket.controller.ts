import { Request, Response, NextFunction } from 'express';
import { TicketService } from './ticket.service';
import { sendSuccess, sendList } from '../../utils/response';
import { getPaginationParams } from '../../utils/pagination';

export class TicketController {
  private ticketService = new TicketService();

  createFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.ticketService.createFeedback(req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  createStaffQuery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.ticketService.createStaffQuery(outletId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { limit, offset } = getPaginationParams(req);
      const { data, total } = await this.ticketService.getTickets(outletId, limit, offset);
      return sendList(res, data, { limit, offset, total });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const { status, comment } = req.body;
      const changedById = req.user!.id; // Manager or Owner user ID

      const result = await this.ticketService.updateTicketStatus(
        outletId,
        id,
        status,
        comment,
        changedById
      );
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default TicketController;
