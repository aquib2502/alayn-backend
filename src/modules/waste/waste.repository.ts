import { prisma } from '../../config/prisma';

export class WasteRepository {
  async findMany(outletId: string, limit: number, offset: number) {
    const where = { outletId };
    const [data, total] = await Promise.all([
      prisma.wasteLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wasteLog.count({ where }),
    ]);
    return { data, total };
  }

  async getWasteSummary(outletId: string) {
    const aggregate = await prisma.wasteLog.groupBy({
      by: ['reason'],
      where: { outletId },
      _sum: {
        quantity: true,
        costAtLoggingPaise: true,
      },
      _count: {
        id: true,
      },
    });

    return aggregate.map((group) => ({
      reason: group.reason,
      count: group._count.id,
      totalQuantity: group._sum.quantity ? group._sum.quantity.toNumber() : 0,
      totalCostPaise: group._sum.costAtLoggingPaise || 0,
    }));
  }
}
export default WasteRepository;
