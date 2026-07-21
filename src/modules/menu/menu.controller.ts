import { Request, Response, NextFunction } from 'express';
import { MenuService } from './menu.service';
import { sendSuccess } from '../../utils/response';

export class MenuController {
  private menuService = new MenuService();

  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const businessId = req.user?.businessId || undefined;
      const result = await this.menuService.createCategory(outletId, req.body, businessId);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const businessId = req.user?.businessId || undefined;
      const result = await this.menuService.getCategories(outletId, businessId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  createMenuItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const businessId = req.user?.businessId || undefined;
      const result = await this.menuService.createMenuItem(outletId, req.body, businessId);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  getMenuItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const businessId = req.user?.businessId || undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const search = req.query.search as string | undefined;
      const isAvailable = req.query.isAvailable as string | undefined;
      const isVeg = req.query.isVeg as string | undefined;
      const result = await this.menuService.getMenuItems(outletId, categoryId, search, businessId, isAvailable, isVeg);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };



  updateMenuItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const result = await this.menuService.updateMenuItem(outletId, id, req.body);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  toggleMenuItemStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outletId = req.outletId!;
      const { id } = req.params;
      const { isAvailable } = req.body;
      const result = await this.menuService.toggleMenuItemStatus(outletId, id, isAvailable);
      return sendSuccess(res, result);
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

