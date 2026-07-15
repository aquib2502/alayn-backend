import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export class InventoryRepository {
  async createItem(outletId: string, data: any) {
    return prisma.item.create({
      data: {
        ...data,
        outletId,
      },
    });
  }

  async findItemById(outletId: string, id: string) {
    return prisma.item.findFirst({
      where: {
        id,
        outletId,
        deletedAt: null,
      },
    });
  }

  async findItemBySku(outletId: string, sku: string) {
    return prisma.item.findFirst({
      where: {
        sku,
        outletId,
        deletedAt: null,
      },
    });
  }

  async getStockBalance(itemId: string): Promise<number> {
    const aggregate = await prisma.stockLedgerEntry.aggregate({
      where: { itemId },
      _sum: {
        change: true,
      },
    });
    return aggregate._sum.change ? aggregate._sum.change.toNumber() : 0;
  }

  async createLedgerEntry(outletId: string, itemId: string, change: number, reason: 'SALE' | 'WASTE' | 'PURCHASE' | 'ADJUSTMENT', referenceId?: string) {
    return prisma.stockLedgerEntry.create({
      data: {
        outletId,
        itemId,
        change: new Prisma.Decimal(change),
        reason,
        referenceId,
      },
    });
  }

  async createRecipe(menuItemId: string, itemId: string, quantityPerUnit: number) {
    return prisma.recipe.upsert({
      where: {
        menuItemId_itemId: {
          menuItemId,
          itemId,
        },
      },
      update: {
        quantityPerUnit: new Prisma.Decimal(quantityPerUnit),
      },
      create: {
        menuItemId,
        itemId,
        quantityPerUnit: new Prisma.Decimal(quantityPerUnit),
      },
    });
  }

  async findRecipesForMenuItem(menuItemId: string) {
    return prisma.recipe.findMany({
      where: { menuItemId },
      include: { item: true },
    });
  }
}
export default InventoryRepository;
