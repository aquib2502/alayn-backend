import { prisma } from '../../config/prisma';

export class OutletRepository {
  async createOutlet(tenantId: string, userId: string, data: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.create({
        data: {
          tenantId,
          ...data,
        },
      });

      await tx.userOutlet.create({
        data: {
          userId,
          outletId: outlet.id,
        },
      });

      return outlet;
    });
  }

  async getOutletsByTenant(tenantId: string) {
    return prisma.outlet.findMany({
      where: { tenantId },
    });
  }

  async getOutletsByUser(userId: string) {
    return prisma.outlet.findMany({
      where: {
        users: {
          some: { userId },
        },
      },
    });
  }
}
