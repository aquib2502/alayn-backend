import { prisma } from '../../config/prisma';

export class MenuRepository {
  async createCategory(outletId: string, data: any) {
    return prisma.menuCategory.create({
      data: {
        ...data,
        outletId,
      },
    });
  }

  async createMenuItem(outletId: string, data: any) {
    return prisma.menuItem.create({
      data: {
        ...data,
        outletId,
      },
    });
  }

  async findCategoryById(outletId: string, id: string) {
    return prisma.menuCategory.findFirst({
      where: { id, outletId, deletedAt: null },
    });
  }

  async findMenuItemById(outletId: string, id: string) {
    return prisma.menuItem.findFirst({
      where: { id, outletId, deletedAt: null },
      include: {
        category: true,
      },
    });
  }

  async findPublicMenu(outletId: string) {
    return prisma.menuCategory.findMany({
      where: {
        outletId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        menuItems: {
          where: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
    });
  }
}
export default MenuRepository;
