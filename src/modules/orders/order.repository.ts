import { prisma } from '../../config/prisma';

export class OrderRepository {
  async createOrder(outletId: string, data: {
    orderNumber?: string;
    tableNumber?: number;
    source: 'TABLE' | 'COUNTER' | 'QR' | 'DELIVERY';
    status: 'SENT_TO_KITCHEN';
    subtotalPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    taxPaise: number;
    totalPaise: number;
    items: { menuItemId: string; quantity: number; unitPricePaise: number; subtotalPaise: number }[];
  }) {
    const order = await prisma.order.create({
      data: {
        outletId,
        tableNumber: isNaN(data.tableNumber as number) ? null : data.tableNumber,
        source: data.source,
        status: data.status as any,
        subtotalPaise: data.subtotalPaise,
        cgstPaise: data.cgstPaise,
        sgstPaise: data.sgstPaise,
        taxPaise: data.taxPaise,
        totalPaise: data.totalPaise,
        items: {
          create: data.items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPricePaise: item.unitPricePaise,
            subtotalPaise: item.subtotalPaise,
          })),
        },
        statusHistory: {
          create: {
            status: 'SENT_TO_KITCHEN' as any,
            comment: 'Order created and sent to kitchen',
          },
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        statusHistory: true,
      },
    });

    if (data.orderNumber) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Order" SET "orderNumber" = $1 WHERE "id" = $2::uuid`,
          data.orderNumber,
          order.id
        );
        (order as any).orderNumber = data.orderNumber;
      } catch {
        // In case column is not pushed yet
        (order as any).orderNumber = data.orderNumber;
      }
    }

    return order;
  }

  async appendItemsToOrder(
    activeOrderId: string,
    additionalTotals: {
      subtotalPaise: number;
      cgstPaise: number;
      sgstPaise: number;
      taxPaise: number;
      totalPaise: number;
    },
    newItems: { menuItemId: string; quantity: number; unitPricePaise: number; subtotalPaise: number }[]
  ) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: activeOrderId },
      include: { items: true },
    });

    if (!existingOrder) throw new Error("Order not found");

    const maxKotNo = existingOrder.items.reduce((max: number, item: any) => Math.max(max, item.kotNo || 1), 1);
    const nextKotNo = maxKotNo + 1;

    for (const newItem of newItems) {
      await (prisma.orderItem as any).create({
        data: {
          orderId: activeOrderId,
          menuItemId: newItem.menuItemId,
          quantity: newItem.quantity,
          unitPricePaise: newItem.unitPricePaise,
          subtotalPaise: newItem.subtotalPaise,
          status: 'SENT_TO_KITCHEN',
          kotNo: nextKotNo,
        },
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: activeOrderId },
      data: {
        subtotalPaise: existingOrder.subtotalPaise + additionalTotals.subtotalPaise,
        cgstPaise: existingOrder.cgstPaise + additionalTotals.cgstPaise,
        sgstPaise: existingOrder.sgstPaise + additionalTotals.sgstPaise,
        taxPaise: existingOrder.taxPaise + additionalTotals.taxPaise,
        totalPaise: existingOrder.totalPaise + additionalTotals.totalPaise,
        status: 'SENT_TO_KITCHEN' as any,
        statusHistory: {
          create: {
            status: 'SENT_TO_KITCHEN' as any,
            comment: `Added ${newItems.reduce((acc, i) => acc + i.quantity, 0)} new item(s) to table order`,
          },
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        statusHistory: true,
      },
    });

    return updatedOrder;
  }

  async findOrderById(outletId: string, id: string) {
    return prisma.order.findFirst({
      where: { id, outletId, deletedAt: null },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        payments: true,
        statusHistory: true,
      },
    });
  }

  async findOrders(outletId?: string, status?: string) {
    const isAll = !outletId || outletId === 'all';
    const where: any = { deletedAt: null };
    if (!isAll) {
      where.outletId = outletId;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    return prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        payments: true,
        statusHistory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findKitchenOrders(outletId: string) {
    const isAll = !outletId || outletId === 'all';
    const where = isAll
      ? { status: { in: ['SENT_TO_KITCHEN', 'PREPARING', 'READY'] as any }, deletedAt: null }
      : { outletId, status: { in: ['SENT_TO_KITCHEN', 'PREPARING', 'READY'] as any }, deletedAt: null };

    return prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        statusHistory: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async createPayment(orderId: string, amountPaise: number, method: 'UPI' | 'CARD' | 'CASH', status: 'PENDING' | 'CONFIRMED' | 'FAILED') {
    return prisma.payment.create({
      data: {
        orderId,
        amountPaise,
        method,
        status,
      },
    });
  }

  async addStatusHistory(orderId: string, status: any, changedById?: string, comment?: string) {
    return prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        changedById,
        comment,
      },
    });
  }
}
export default OrderRepository;
