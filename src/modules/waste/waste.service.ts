import { WasteRepository } from './waste.repository';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export class WasteService {
  private wasteRepository = new WasteRepository();

  async createWasteLog(outletId: string, loggedById: string, data: { itemId: string; quantity: number; reason: 'SPOILAGE' | 'OVER_PREP' | 'RETURN' | 'ERROR' }) {
    // 1. Validate item exists
    const item = await prisma.item.findFirst({
      where: { id: data.itemId, outletId, deletedAt: null },
    });
    if (!item) {
      throw new AppError('ITEM_NOT_FOUND', 'Inventory item not found', 404);
    }

    // 2. Validate current stock
    const ledgerSum = await prisma.stockLedgerEntry.aggregate({
      where: { itemId: data.itemId },
      _sum: { change: true },
    });
    const currentStock = ledgerSum._sum.change ? ledgerSum._sum.change.toNumber() : 0;

    if (currentStock < data.quantity) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        `Insufficient stock for item ${item.name} to log waste. Current stock: ${currentStock}, Waste quantity: ${data.quantity}`,
        400
      );
    }

    // 3. Calculate cost
    const costAtLoggingPaise = Math.round(data.quantity * item.unitCostPaise);

    // 4. Transaction to create waste log and ledger entries
    return prisma.$transaction(async (tx) => {
      const wasteLog = await tx.wasteLog.create({
        data: {
          itemId: data.itemId,
          quantity: new Prisma.Decimal(data.quantity),
          costAtLoggingPaise,
          reason: data.reason,
          loggedById,
          outletId,
        },
      });

      await tx.stockLedgerEntry.create({
        data: {
          outletId,
          itemId: data.itemId,
          change: new Prisma.Decimal(-data.quantity),
          reason: 'WASTE',
          referenceId: wasteLog.id,
        },
      });

      return wasteLog;
    });
  }

  async getWasteLogs(outletId: string, limit: number, offset: number) {
    return this.wasteRepository.findMany(outletId, limit, offset);
  }

  async getWasteSummary(outletId: string) {
    return this.wasteRepository.getWasteSummary(outletId);
  }
}
export default WasteService;
