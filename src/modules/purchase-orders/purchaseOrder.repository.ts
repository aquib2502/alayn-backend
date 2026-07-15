import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export class PurchaseOrderRepository {
  async createSupplier(outletId: string, data: any) {
    return prisma.supplier.create({
      data: {
        ...data,
        outletId,
      },
    });
  }

  async findSupplierById(outletId: string, id: string) {
    return prisma.supplier.findFirst({
      where: { id, outletId, deletedAt: null },
    });
  }

  async createPO(outletId: string, supplierId: string, totalAmountPaise: number, items: { itemId: string; orderedQuantity: number; unitCostPaise: number }[]) {
    return prisma.purchaseOrder.create({
      data: {
        outletId,
        supplierId,
        totalAmountPaise,
        items: {
          create: items.map(item => ({
            itemId: item.itemId,
            orderedQuantity: new Prisma.Decimal(item.orderedQuantity),
            unitCostPaise: item.unitCostPaise,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async findPOById(outletId: string, id: string) {
    return prisma.purchaseOrder.findFirst({
      where: { id, outletId, deletedAt: null },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });
  }
}
export default PurchaseOrderRepository;
