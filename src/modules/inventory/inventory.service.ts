import { InventoryRepository } from './inventory.repository';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';


export class InventoryService {
  private inventoryRepository = new InventoryRepository();

  async createItem(outletId: string, data: any) {
    const existing = await this.inventoryRepository.findItemBySku(outletId, data.sku);
    if (existing) {
      throw new AppError('SKU_ALREADY_EXISTS', 'An item with this SKU already exists', 400);
    }
    return this.inventoryRepository.createItem(outletId, data);
  }

  async getItemStock(outletId: string, itemId: string) {
    const item = await this.inventoryRepository.findItemById(outletId, itemId);
    if (!item) {
      throw new AppError('ITEM_NOT_FOUND', 'Inventory item not found', 404);
    }
    const balance = await this.inventoryRepository.getStockBalance(itemId);
    return {
      itemId,
      name: item.name,
      sku: item.sku,
      currentStock: balance,
      unit: item.unit,
    };
  }

  async adjustStock(outletId: string, itemId: string, change: number, reason: 'SALE' | 'WASTE' | 'PURCHASE' | 'ADJUSTMENT', referenceId?: string, loggedById?: string) {
    const item = await this.inventoryRepository.findItemById(outletId, itemId);
    if (!item) {
      throw new AppError('ITEM_NOT_FOUND', 'Inventory item not found', 404);
    }

    // If change is negative (deduction), check current stock
    if (change < 0) {
      const currentStock = await this.inventoryRepository.getStockBalance(itemId);
      if (currentStock + change < 0) {
        throw new AppError('INSUFFICIENT_STOCK', `Insufficient stock for ${item.name}. Current: ${currentStock}, Requested deduction: ${Math.abs(change)}`, 400);
      }
    }

    if (reason === 'WASTE' && change < 0) {
      const wasteQty = Math.abs(change);
      const costAtLoggingPaise = Math.round(wasteQty * item.unitCostPaise);
      
      // Get logged in user or fallback to first employee/user
      let userId = loggedById;
      if (!userId) {
        const fallbackUser = await prisma.user.findFirst();
        userId = fallbackUser?.id || "00000000-0000-0000-0000-000000000000";
      }

      return prisma.$transaction(async (tx) => {
        const wasteLog = await tx.wasteLog.create({
          data: {
            itemId,
            quantity: new Prisma.Decimal(wasteQty),
            costAtLoggingPaise,
            reason: 'SPOILAGE',
            outletId,
            loggedById: userId,
          },
        });



        return tx.stockLedgerEntry.create({
          data: {
            outletId,
            itemId,
            change: new Prisma.Decimal(change),
            reason: 'WASTE',
            referenceId: wasteLog.id,
          },
        });
      });
    }

    return this.inventoryRepository.createLedgerEntry(outletId, itemId, change, reason, referenceId);
  }


  async createRecipe(outletId: string, data: { menuItemId: string; itemId: string; quantityPerUnit: number }) {
    // Verify item exists under business
    const item = await this.inventoryRepository.findItemById(outletId, data.itemId);
    if (!item) {
      throw new AppError('ITEM_NOT_FOUND', 'Inventory item not found', 404);
    }

    // Note: menuItem exist check will happen in menu service or direct prisma check if required
    return this.inventoryRepository.createRecipe(data.menuItemId, data.itemId, data.quantityPerUnit);
  }

  async calculateMenuItemCost(outletId: string, menuItemId: string) {
    const recipes = await this.inventoryRepository.findRecipesForMenuItem(menuItemId);
    if (recipes.length === 0) {
      return {
        menuItemId,
        totalCostPaise: 0,
        breakdown: [],
      };
    }

    let totalCost = 0;
    const breakdown = recipes.map((r) => {
      const qty = r.quantityPerUnit.toNumber();
      const costPerUnit = r.item.unitCostPaise;
      const subtotal = Math.round(qty * costPerUnit);
      totalCost += subtotal;

      return {
        itemId: r.itemId,
        itemName: r.item.name,
        quantityUsed: qty,
        unit: r.item.unit,
        unitCostPaise: costPerUnit,
        costContributionPaise: subtotal,
      };
    });

    return {
      menuItemId,
      totalCostPaise: totalCost,
      breakdown,
    };
  }

  async getAllItems(outletId: string) {
    const items = await this.inventoryRepository.findManyItems(outletId);
    return { items, total: items.length };
  }

  async getAlerts(outletId: string) {
    return this.inventoryRepository.getLowStockAndExpiryAlerts(outletId);
  }
}
export default InventoryService;

