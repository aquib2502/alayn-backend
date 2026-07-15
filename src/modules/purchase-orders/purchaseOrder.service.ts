import { PurchaseOrderRepository } from './purchaseOrder.repository';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export class PurchaseOrderService {
  private poRepository = new PurchaseOrderRepository();

  async createSupplier(outletId: string, data: any) {
    return this.poRepository.createSupplier(outletId, data);
  }

  async createPO(outletId: string, supplierId: string, items: { itemId: string; orderedQuantity: number; unitCostPaise: number }[]) {
    const supplier = await this.poRepository.findSupplierById(outletId, supplierId);
    if (!supplier) {
      throw new AppError('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
    }

    // Calculate total amount
    let totalAmountPaise = 0;
    for (const item of items) {
      // Validate item existence
      const itemRecord = await prisma.item.findFirst({
        where: { id: item.itemId, outletId, deletedAt: null },
      });
      if (!itemRecord) {
        throw new AppError('ITEM_NOT_FOUND', `Inventory item ${item.itemId} not found`, 404);
      }
      totalAmountPaise += Math.round(item.orderedQuantity * item.unitCostPaise);
    }

    return this.poRepository.createPO(outletId, supplierId, totalAmountPaise, items);
  }

  async receivePO(outletId: string, poId: string, receivedItems: { itemId: string; receivedQuantity: number; batchNumber: string; expiryDate: Date }[]) {
    const po = await this.poRepository.findPOById(outletId, poId);
    if (!po) {
      throw new AppError('PO_NOT_FOUND', 'Purchase order not found', 404);
    }
    if (po.status === 'CLOSED' || po.status === 'RECEIVED') {
      throw new AppError('PO_ALREADY_COMPLETED', 'Cannot receive items on a completed/closed purchase order', 400);
    }

    // Process receiving inside a transaction
    return prisma.$transaction(async (tx) => {
      for (const itemToReceive of receivedItems) {
        // Find matching item in PO
        const poItem = po.items.find((i) => i.itemId === itemToReceive.itemId);
        if (!poItem) {
          throw new AppError('ITEM_NOT_IN_PO', `Item ${itemToReceive.itemId} is not in this purchase order`, 400);
        }

        const currentReceived = poItem.receivedQuantity.toNumber();
        const ordered = poItem.orderedQuantity.toNumber();
        const newlyReceived = itemToReceive.receivedQuantity;
        const totalReceived = currentReceived + newlyReceived;

        if (totalReceived > ordered) {
          throw new AppError(
            'RECEIVE_OVER_ORDER',
            `Cannot receive quantity ${newlyReceived} for item ${poItem.item.name}. Total received (${totalReceived}) would exceed ordered (${ordered})`,
            400
          );
        }

        // 1. Update received quantity in PurchaseOrderItem
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            receivedQuantity: new Prisma.Decimal(totalReceived),
          },
        });

        // 2. Create StockBatch
        await tx.stockBatch.create({
          data: {
            outletId,
            itemId: poItem.itemId,
            quantity: new Prisma.Decimal(newlyReceived),
            expiryDate: itemToReceive.expiryDate,
            batchNumber: itemToReceive.batchNumber,
            unitCostPaise: poItem.unitCostPaise,
          },
        });

        // 3. Create positive PURCHASE StockLedgerEntry
        await tx.stockLedgerEntry.create({
          data: {
            outletId,
            itemId: poItem.itemId,
            change: new Prisma.Decimal(newlyReceived),
            reason: 'PURCHASE',
            referenceId: poId,
          },
        });
      }

      // Reload PO items inside transaction to compute status
      const updatedPOItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: poId },
      });

      let allFullyReceived = true;
      let anyReceived = false;

      for (const item of updatedPOItems) {
        const received = item.receivedQuantity.toNumber();
        const ordered = item.orderedQuantity.toNumber();

        if (received < ordered) {
          allFullyReceived = false;
        }
        if (received > 0) {
          anyReceived = true;
        }
      }

      let newStatus: 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'SENT' = 'SENT';
      if (allFullyReceived) {
        newStatus = 'RECEIVED';
      } else if (anyReceived) {
        newStatus = 'PARTIALLY_RECEIVED';
      }

      // 4. Update PO status
      return tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: newStatus,
        },
        include: {
          items: true,
        },
      });
    });
  }
}
export default PurchaseOrderService;
