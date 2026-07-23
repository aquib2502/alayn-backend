import { OrderRepository } from './order.repository';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export class OrderService {
  private orderRepository = new OrderRepository();

  private async generateCustomOrderId(outletId: string): Promise<string> {
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      include: { business: true },
    });

    const restaurantName = outlet?.name || outlet?.business?.name || 'ALAYN';
    const prefix = restaurantName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}${mm}${dd}`;

    // Count today's orders for this outlet to generate atomic sequential number
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const countToday = await prisma.order.count({
      where: {
        outletId,
        createdAt: { gte: todayStart },
      },
    });

    const sequence = String(countToday + 1).padStart(5, '0');
    return `${prefix}${dateKey}${sequence}`;
  }

  async createOrder(outletId: string, data: { tableNumber?: number | string; tableNo?: number | string; source?: 'TABLE' | 'COUNTER' | 'QR' | 'DELIVERY'; orderSource?: 'TABLE' | 'COUNTER' | 'QR' | 'DELIVERY'; tableToken?: string; items: { menuItemId: string; quantity: number }[] }) {
    // 1. Fetch Outlet tax rates
    const outlet = await prisma.outlet.findFirst({
      where: { id: outletId, deletedAt: null },
    });
    if (!outlet) {
      throw new AppError('OUTLET_NOT_FOUND', 'Outlet not found', 404);
    }

    const cgstRate = outlet.cgstRateDecimal.toNumber();
    const sgstRate = outlet.sgstRateDecimal.toNumber();

    const resolvedSource = data.source || data.orderSource || 'COUNTER';
    const rawTable = data.tableNumber ?? data.tableNo;
    let resolvedTableNumber = typeof rawTable === 'number' ? rawTable : (typeof rawTable === 'string' ? parseInt(rawTable, 10) || undefined : undefined);

    if (resolvedSource === 'TABLE' && !resolvedTableNumber) {
      throw new AppError('TABLE_NUMBER_REQUIRED', 'Please select a table number for table orders', 400);
    }

    // Validate QR ordering TableToken if provided
    if (data.source === 'QR' && data.tableToken) {
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
    }

    // 2. Fetch all menu items to calculate prices for incoming items
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

    // Check if an active order exists for this table
    if (resolvedTableNumber) {
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
        // Append items to active running order
        const appended = await this.orderRepository.appendItemsToOrder(
          activeOrder.id,
          { subtotalPaise, cgstPaise, sgstPaise, taxPaise, totalPaise },
          itemDetails
        );
        await prisma.table.updateMany({
          where: { outletId, tableNumber: resolvedTableNumber },
          data: { status: 'OCCUPIED' },
        });
        return this.transformOrder(appended);
      }
    }

    // Generate custom order number (e.g. ALA2026072200001) for new order
    const orderNumber = await this.generateCustomOrderId(outletId);

    const createdOrder = await this.orderRepository.createOrder(outletId, {
      orderNumber,
      tableNumber: resolvedTableNumber,
      source: resolvedSource,
      status: 'SENT_TO_KITCHEN',
      subtotalPaise,
      cgstPaise,
      sgstPaise,
      taxPaise,
      totalPaise,
      items: itemDetails,
    });

    if (resolvedTableNumber) {
      await prisma.table.updateMany({
        where: { outletId, tableNumber: resolvedTableNumber },
        data: { status: 'OCCUPIED' },
      });
    }

    return this.transformOrder(createdOrder);
  }

  public transformOrder(order: any) {
    if (!order) return order;
    return {
      ...order,
      orderNo: order.orderNumber || `#${order.id.slice(0, 8)}`,
      orderSource: order.source,
      tableNo: order.tableNumber !== null && order.tableNumber !== undefined ? String(order.tableNumber) : undefined,
      subtotal: (order.subtotalPaise || 0) / 100,
      taxAmount: (order.taxPaise || 0) / 100,
      totalAmount: (order.totalPaise || 0) / 100,
      orderItems: (order.items || []).map((item: any) => ({
        ...item,
        unitPrice: (item.unitPricePaise || 0) / 100,
        subtotal: (item.subtotalPaise || 0) / 100,
      })),
    };
  }

  async getOrders(outletId: string, status?: string) {
    const orders = await this.orderRepository.findOrders(outletId, status);
    return orders.map((o) => this.transformOrder(o));
  }

  async getKitchenOrders(outletId: string) {
    const orders = await this.orderRepository.findKitchenOrders(outletId);
    return orders.map((o) => this.transformOrder(o));
  }

  async createPayment(outletId: string, orderId: string, data: { amountPaise: number; method: 'UPI' | 'CARD' | 'CASH'; status: 'PENDING' | 'CONFIRMED' | 'FAILED' }) {
    const order = await this.orderRepository.findOrderById(outletId, orderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }
    return this.orderRepository.createPayment(orderId, data.amountPaise, data.method, data.status);
  }

  async updateOrderStatus(
    outletId: string,
    orderId: string,
    status: 'SENT_TO_KITCHEN' | 'PREPARING' | 'READY' | 'SERVED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED',
    comment?: string,
    changedById?: string,
    paymentMethod?: 'CASH' | 'CARD' | 'UPI'
  ) {
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
      // 1. Check payment balance, auto-record payment if needed
      let confirmedPaymentsSum = order.payments
        .filter((p) => p.status === 'CONFIRMED')
        .reduce((sum, p) => sum + p.amountPaise, 0);

      if (confirmedPaymentsSum < order.totalPaise) {
        const remainingPaise = order.totalPaise - confirmedPaymentsSum;
        let method: 'CASH' | 'CARD' | 'UPI' = paymentMethod || 'CASH';
        if (!paymentMethod && comment) {
          const methodCandidate = comment.toUpperCase();
          if (methodCandidate.includes('CARD')) method = 'CARD';
          else if (methodCandidate.includes('UPI')) method = 'UPI';
        }

        await this.orderRepository.createPayment(orderId, remainingPaise, method, 'CONFIRMED');
        confirmedPaymentsSum = order.totalPaise;
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

        // Release Table back to AVAILABLE
        if (order.tableNumber !== null && order.tableNumber !== undefined) {
          await tx.table.updateMany({
            where: { outletId, tableNumber: order.tableNumber },
            data: { status: 'AVAILABLE' },
          });
        }

        // Add history entry
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: 'COMPLETED',
            changedById,
            comment: comment || 'Order completed, payment settled, and table freed',
          },
        });

        return this.transformOrder(updatedOrder);
      });
    }

    // Free table if order is cancelled
    if (status === 'CANCELLED' && order.tableNumber !== null && order.tableNumber !== undefined) {
      await prisma.table.updateMany({
        where: { outletId, tableNumber: order.tableNumber },
        data: { status: 'AVAILABLE' },
      });
    }

    // Normal status transition (not COMPLETED)
    if (status === 'PREPARING') {
      await (prisma.orderItem as any).updateMany({
        where: { orderId, status: 'SENT_TO_KITCHEN' },
        data: { status: 'PREPARING' },
      });
    } else if (status === 'READY') {
      await (prisma.orderItem as any).updateMany({
        where: { orderId, status: 'PREPARING' },
        data: { status: 'READY' },
      });
    } else if (status === 'SERVED') {
      await (prisma.orderItem as any).updateMany({
        where: { orderId, status: 'READY' },
        data: { status: 'SERVED' },
      });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    });

    await this.orderRepository.addStatusHistory(orderId, status, changedById, comment);

    const updated = await this.orderRepository.findOrderById(outletId, orderId);
    return this.transformOrder(updated);
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
