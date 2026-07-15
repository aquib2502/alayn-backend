import { MenuRepository } from './menu.repository';
import { AppError } from '../../utils/AppError';

export class MenuService {
  private menuRepository = new MenuRepository();

  async createCategory(outletId: string, data: any) {
    return this.menuRepository.createCategory(outletId, data);
  }

  async createMenuItem(outletId: string, data: any) {
    const category = await this.menuRepository.findCategoryById(outletId, data.categoryId);
    if (!category) {
      throw new AppError('CATEGORY_NOT_FOUND', 'Menu category not found', 404);
    }
    return this.menuRepository.createMenuItem(outletId, data);
  }

  async getPublicMenu(outletId: string) {
    return this.menuRepository.findPublicMenu(outletId);
  }
}
export default MenuService;
