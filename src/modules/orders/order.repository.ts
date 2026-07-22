import { prisma } from '../../config/prisma';

export class OrderRepository {
  async createOrder(outletId: string, data: {
    tableNumber?: number;
    source: 'COUNTER' | 'QR' | 'DELIVERY';
    status: 'RECEIVED';
    subtotalPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    taxPaise: number;
    totalPaise: number;
    items: { menuItemId: string; quantity: number; unitPricePaise: number; subtotalPaise: number }[];
  }) {
    return prisma.order.create({
      data: {
        outletId,
        tableNumber: data.tableNumber,
        source: data.source,
        status: data.status,
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
            status: 'RECEIVED',
            comment: 'Order created',
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

  async findKitchenOrders(outletId: string) {
    const isAll = !outletId || outletId === 'all';
    const where = isAll
      ? { status: { in: ['RECEIVED', 'PREPARING', 'READY'] as any }, deletedAt: null }
      : { outletId, status: { in: ['RECEIVED', 'PREPARING', 'READY'] as any }, deletedAt: null };

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
