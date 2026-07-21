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

  async getCategories(outletId: string, businessId?: string) {
    const where: any = { deletedAt: null };
    if (outletId && outletId !== "all") {
      where.outletId = outletId;
    } else if (businessId) {
      where.outlet = { businessId };
    }

    return prisma.menuCategory.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        menuItems: {
          where: { deletedAt: null },
        },
      },
    });
  }

  async getMenuItems(outletId: string, categoryId?: string, search?: string, businessId?: string, isAvailable?: string, isVeg?: string) {
    const where: any = { deletedAt: null };
    if (outletId && outletId !== "all") {
      where.outletId = outletId;
    } else if (businessId) {
      where.outlet = { businessId };
    }

    if (categoryId && categoryId !== "ALL") {
      where.categoryId = categoryId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isAvailable !== undefined && isAvailable !== null && isAvailable !== "") {
      where.isActive = isAvailable === "true" || isAvailable === "1";
    }
    if (isVeg !== undefined && isVeg !== null && isVeg !== "") {
      where.isVeg = isVeg === "true" || isVeg === "1";
    }
    return prisma.menuItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateMenuItem(outletId: string, id: string, data: any) {
    const where: any = { id, deletedAt: null };
    if (outletId && outletId !== "all") {
      where.outletId = outletId;
    }
    return prisma.menuItem.updateMany({
      where,
      data,
    });
  }

  async findCategoryById(outletId: string, id: string) {
    const where: any = { id, deletedAt: null };
    if (outletId && outletId !== "all") {
      where.outletId = outletId;
    }
    return prisma.menuCategory.findFirst({ where });
  }

  async findMenuItemById(outletId: string, id: string) {
    const where: any = { id, deletedAt: null };
    if (outletId && outletId !== "all") {
      where.outletId = outletId;
    }
    return prisma.menuItem.findFirst({
      where,
      include: {
        category: true,
      },
    });
  }

  async findPublicMenu(outletId: string) {
    const where: any = { isActive: true, deletedAt: null };
    if (outletId && outletId !== "all") {
      where.outletId = outletId;
    }
    return prisma.menuCategory.findMany({
      where,
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


