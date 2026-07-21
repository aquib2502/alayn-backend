import { MenuRepository } from './menu.repository';
import { AppError } from '../../utils/AppError';
import { saveBase64Image } from '../../utils/file.utils';
import { prisma } from '../../config/prisma';

export class MenuService {
  private menuRepository = new MenuRepository();

  private formatItem(item: any) {
    if (!item) return item;
    return {
      ...item,
      price: item.pricePaise ? item.pricePaise / 100 : 0,
      isAvailable: item.isActive ?? true,
    };
  }

  async createCategory(outletId: string, data: any, businessId?: string) {
    let targetOutletId = outletId;
    if (targetOutletId === 'all') {
      if (businessId) {
        const firstOutlet = await prisma.outlet.findFirst({
          where: { businessId },
          select: { id: true },
        });
        if (firstOutlet) {
          targetOutletId = firstOutlet.id;
        }
      }
      if (targetOutletId === 'all') {
        throw new AppError('BAD_REQUEST', 'Please select a specific branch/outlet to create a category', 400);
      }
    }

    if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:image/')) {
      const savedPath = saveBase64Image(data.imageUrl, 'menu-categories');
      if (savedPath) {
        data.imageUrl = savedPath;
      }
    } else if (!data.imageUrl) {
      data.imageUrl = null;
    }
    return this.menuRepository.createCategory(targetOutletId, data);
  }

  async getCategories(outletId: string, businessId?: string) {
    const categories = await this.menuRepository.getCategories(outletId, businessId);
    return categories.map((cat) => ({
      ...cat,
      items: (cat.menuItems || []).map((item) => this.formatItem(item)),
    }));
  }

  async createMenuItem(outletId: string, data: any, businessId?: string) {
    let targetOutletId = outletId;
    if (targetOutletId === 'all') {
      if (data.categoryId) {
        const cat = await this.menuRepository.findCategoryById('all', data.categoryId);
        if (cat) {
          targetOutletId = cat.outletId;
        }
      }
      if (targetOutletId === 'all' && businessId) {
        const firstOutlet = await prisma.outlet.findFirst({
          where: { businessId },
          select: { id: true },
        });
        if (firstOutlet) targetOutletId = firstOutlet.id;
      }
      if (targetOutletId === 'all') {
        throw new AppError('BAD_REQUEST', 'Please select a specific branch/outlet to create a menu item', 400);
      }
    }

    const category = await this.menuRepository.findCategoryById(targetOutletId, data.categoryId);
    if (!category) {
      throw new AppError('CATEGORY_NOT_FOUND', 'Menu category not found', 404);
    }
    
    if (data.price !== undefined && !data.pricePaise) {
      data.pricePaise = Math.round(Number(data.price) * 100);
      delete data.price;
    }
    if (data.isAvailable !== undefined) {
      data.isActive = data.isAvailable;
      delete data.isAvailable;
    }

    if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:image/')) {
      const savedPath = saveBase64Image(data.imageUrl, 'menu-items');
      if (savedPath) {
        data.imageUrl = savedPath;
      }
    } else if (!data.imageUrl) {
      data.imageUrl = null;
    }

    const created = await this.menuRepository.createMenuItem(targetOutletId, data);
    const itemWithCat = await this.menuRepository.findMenuItemById(targetOutletId, created.id);
    return this.formatItem(itemWithCat || created);
  }

  async getMenuItems(outletId: string, categoryId?: string, search?: string, businessId?: string, isAvailable?: string, isVeg?: string) {
    const items = await this.menuRepository.getMenuItems(outletId, categoryId, search, businessId, isAvailable, isVeg);
    return items.map((item) => this.formatItem(item));
  }

  async updateMenuItem(outletId: string, id: string, data: any) {
    if (data.price !== undefined) {
      data.pricePaise = Math.round(Number(data.price) * 100);
      delete data.price;
    }
    if (data.isAvailable !== undefined) {
      data.isActive = data.isAvailable;
      delete data.isAvailable;
    }
    if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:image/')) {
      const savedPath = saveBase64Image(data.imageUrl, 'menu-items');
      if (savedPath) {
        data.imageUrl = savedPath;
      }
    }

    await this.menuRepository.updateMenuItem(outletId, id, data);
    const updated = await this.menuRepository.findMenuItemById(outletId, id);
    return this.formatItem(updated);
  }

  async toggleMenuItemStatus(outletId: string, id: string, isAvailable: boolean) {
    return this.updateMenuItem(outletId, id, { isAvailable });
  }

  async getPublicMenu(outletId: string) {
    const categories = await this.menuRepository.findPublicMenu(outletId);
    return categories.map((cat) => ({
      ...cat,
      items: (cat.menuItems || []).map((item) => this.formatItem(item)),
    }));
  }
}
export default MenuService;


