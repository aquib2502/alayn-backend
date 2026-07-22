import { prisma } from '../../config/prisma';

export class WasteRepository {
  async findMany(outletId: string, limit: number, offset: number) {
    const isAll = !outletId || outletId === 'all';
    const where = isAll ? {} : { outletId };
    const [data, total] = await Promise.all([
      prisma.wasteLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wasteLog.count({ where }),
    ]);

    // Fetch items for the waste logs
    const itemIds = Array.from(new Set(data.map((log) => log.itemId)));
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const mappedData = data.map((log) => ({
      ...log,
      quantity: log.quantity.toNumber(),
      item: itemMap.get(log.itemId) || null,
    }));

    return { data: mappedData, total };
  }

  async getWasteSummary(outletId: string) {
    const isAll = !outletId || outletId === 'all';
    const groupWhere = isAll ? {} : { outletId };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const aggregate = await prisma.wasteLog.groupBy({
      by: ['reason'],
      where: groupWhere,
      _sum: {
        quantity: true,
        costAtLoggingPaise: true,
      },
      _count: {
        id: true,
      },
    });

    const currentMonthWhere = isAll
      ? { createdAt: { gte: startOfMonth } }
      : { outletId, createdAt: { gte: startOfMonth } };

    const currentMonthAggregate = await prisma.wasteLog.aggregate({
      where: currentMonthWhere,
      _sum: {
        costAtLoggingPaise: true,
      },
    });

    const currentMonthWastePaise = currentMonthAggregate._sum.costAtLoggingPaise || 0;

    const byReason = aggregate.map((group) => ({
      reason: group.reason,
      count: group._count.id,
      totalQuantity: group._sum.quantity ? group._sum.quantity.toNumber() : 0,
      totalCostPaise: group._sum.costAtLoggingPaise || 0,
    }));

    return {
      currentMonthWastePaise,
      byReason,
    };
  }
}
export default WasteRepository;

