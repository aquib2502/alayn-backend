import { OrderRepository } from './order.repository';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export class OrderService {
  private orderRepository = new OrderRepository();

  async createOrder(outletId: string, data: { tableNumber?: number; source: 'COUNTER' | 'QR' | 'DELIVERY'; tableToken?: string; items: { menuItemId: string; quantity: number }[] }) {
    // 1. Fetch Outlet tax rates
    const outlet = await prisma.outlet.findFirst({
      where: { id: outletId, deletedAt: null },
    });
    if (!outlet) {
      throw new AppError('OUTLET_NOT_FOUND', 'Outlet not found', 404);
    }

    const cgstRate = outlet.cgstRateDecimal.toNumber();
    const sgstRate = outlet.sgstRateDecimal.toNumber();

    let resolvedTableNumber = data.tableNumber;

    // Validate QR ordering TableToken
    if (data.source === 'QR') {
      if (!data.tableToken) {
        throw new AppError('TABLE_TOKEN_REQUIRED', 'Table token is required for QR ordering', 400);
      }

      const tokenRecord = await prisma.tableToken.findUnique({
        where: { token: data.tableToken },
      });

      if (!tokenRecord) {
        throw new AppError('INVALID_TOKEN', 'Table token is invalid', 400);
      }

      if (new Date() > tokenRecord.expiresAt) {
        throw new AppError('EXPIRED_TOKEN', 'Table token has expired', 400);
      }

      if (tokenRecord.outletId !== outletId) {
        throw new AppError('FORBIDDEN', 'Table token belongs to a different outlet', 403);
      }

      resolvedTableNumber = tokenRecord.tableNumber;

      // Ensure only one active order exists for this table
      const activeOrder = await prisma.order.findFirst({
        where: {
          outletId,
          tableNumber: resolvedTableNumber,
          status: {
            notIn: ['COMPLETED', 'CANCELLED'],
          },
          deletedAt: null,
        },
      });

      if (activeOrder) {
        throw new AppError('ACTIVE_ORDER_EXISTS', 'There is already an active order for this table', 400);
      }
    }

    // 2. Fetch all menu items to calculate prices
    const itemDetails: { menuItemId: string; quantity: number; unitPricePaise: number; subtotalPaise: number }[] = [];
    let subtotalPaise = 0;

    for (const item of data.items) {
      const menuItem = await prisma.menuItem.findFirst({
        where: { id: item.menuItemId, outletId, deletedAt: null },
      });
      if (!menuItem) {
        throw new AppError('MENU_ITEM_NOT_FOUND', `Menu item ${item.menuItemId} not found`, 404);
      }
      if (!menuItem.isActive) {
        throw new AppError('MENU_ITEM_INACTIVE', `Menu item ${menuItem.name} is inactive`, 400);
      }

      const itemSubtotal = menuItem.pricePaise * item.quantity;
      subtotalPaise += itemSubtotal;

      itemDetails.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPricePaise: menuItem.pricePaise,
        subtotalPaise: itemSubtotal,
      });
    }

    // 3. Tax calculations
    const cgstPaise = Math.round(subtotalPaise * (cgstRate / 100));
    const sgstPaise = Math.round(subtotalPaise * (sgstRate / 100));
    const taxPaise = cgstPaise + sgstPaise;
    const totalPaise = subtotalPaise + taxPaise;

    return this.orderRepository.createOrder(outletId, {
      tableNumber: resolvedTableNumber,
      source: data.source,
      status: 'RECEIVED',
      subtotalPaise,
      cgstPaise,
      sgstPaise,
      taxPaise,
      totalPaise,
      items: itemDetails,
    });
  }

  async getKitchenOrders(outletId: string) {
    return this.orderRepository.findKitchenOrders(outletId);
  }

  async createPayment(outletId: string, orderId: string, data: { amountPaise: number; method: 'UPI' | 'CARD' | 'CASH'; status: 'PENDING' | 'CONFIRMED' | 'FAILED' }) {
    const order = await this.orderRepository.findOrderById(outletId, orderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }
    return this.orderRepository.createPayment(orderId, data.amountPaise, data.method, data.status);
  }

  async updateOrderStatus(outletId: string, orderId: string, status: 'RECEIVED' | 'PREPARING' | 'READY' | 'SERVED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED', comment?: string, changedById?: string) {
    const order = await this.orderRepository.findOrderById(outletId, orderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    // Basic state transitions checks
    const current = order.status;
    if (current === 'COMPLETED' || current === 'CANCELLED') {
      throw new AppError('INVALID_STATE_TRANSITION', `Cannot change status of a ${current} order`, 400);
    }

    if (status === 'COMPLETED') {
      // 1. Check payment balance
      const confirmedPaymentsSum = order.payments
        .filter((p) => p.status === 'CONFIRMED')
        .reduce((sum, p) => sum + p.amountPaise, 0);

      if (confirmedPaymentsSum !== order.totalPaise) {
        throw new AppError(
          'PAYMENT_MISMATCH',
          `Cannot complete order: Confirmed payments total ₹${confirmedPaymentsSum / 100} does not match order total ₹${order.totalPaise / 100}`,
          400
        );
      }

      // 2. Perform Order stock deduction & status change in a single transaction
      return prisma.$transaction(async (tx) => {
        // Collect all ingredient requirements
        const ingredientRequirements: { [itemId: string]: { name: string; quantity: number } } = {};

        for (const orderItem of order.items) {
          const recipes = await tx.recipe.findMany({
            where: { menuItemId: orderItem.menuItemId },
            include: { item: true },
          });

          for (const recipe of recipes) {
            const qtyNeeded = recipe.quantityPerUnit.toNumber() * orderItem.quantity;
            if (ingredientRequirements[recipe.itemId]) {
              ingredientRequirements[recipe.itemId].quantity += qtyNeeded;
            } else {
              ingredientRequirements[recipe.itemId] = {
                name: recipe.item.name,
                quantity: qtyNeeded,
              };
            }
          }
        }

        // Validate stock for each ingredient
        for (const itemId of Object.keys(ingredientRequirements)) {
          const req = ingredientRequirements[itemId];

          const ledgerSum = await tx.stockLedgerEntry.aggregate({
            where: { itemId },
            _sum: {
              change: true,
            },
          });

          const currentStock = ledgerSum._sum.change ? ledgerSum._sum.change.toNumber() : 0;
          if (currentStock < req.quantity) {
            throw new AppError(
              'INSUFFICIENT_STOCK',
              `Insufficient stock for ingredient: ${req.name}. Current: ${currentStock}, Required: ${req.quantity}`,
              400
            );
          }
        }

        // Deduct stock by writing negative SALE ledger entries
        for (const itemId of Object.keys(ingredientRequirements)) {
          const req = ingredientRequirements[itemId];
          await tx.stockLedgerEntry.create({
            data: {
              outletId,
              itemId,
              change: new Prisma.Decimal(-req.quantity),
              reason: 'SALE',
              referenceId: orderId,
            },
          });
        }

        // Update Order to COMPLETED
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: 'COMPLETED' },
          include: { items: true, statusHistory: true },
        });

        // Add history entry
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: 'COMPLETED',
            changedById,
            comment: comment || 'Order completed and stock deducted',
          },
        });

        return updatedOrder;
      });
    }

    // Normal status transition (not COMPLETED)
    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    await this.orderRepository.addStatusHistory(orderId, status, changedById, comment);

    return this.orderRepository.findOrderById(outletId, orderId);
  }

  async getTableMenu(token: string) {
    const tokenRecord = await prisma.tableToken.findUnique({
      where: { token },
    });
    if (!tokenRecord) {
      throw new AppError('INVALID_TOKEN', 'Table token is invalid', 400);
    }
    if (new Date() > tokenRecord.expiresAt) {
      throw new AppError('EXPIRED_TOKEN', 'Table token has expired', 400);
    }

    return prisma.menuCategory.findMany({
      where: {
        outletId: tokenRecord.outletId,
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
export default OrderService;
