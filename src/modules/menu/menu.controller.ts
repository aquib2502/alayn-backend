import { Request, Response, NextFunction } from 'express';
import { MenuService } from './menu.service';
import { sendSuccess } from '../../utils/response';

export class MenuController {
  private menuService = new MenuService();

  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.menuService.createCategory(outletId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  createMenuItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.menuService.createMenuItem(outletId, req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  getPublicMenu = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const result = await this.menuService.getPublicMenu(outletId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default MenuController;
