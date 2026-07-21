import { prisma } from '../../config/prisma';

export class OutletRepository {
  async createOutlet(businessId: string, userId: string, data: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.create({
        data: {
          businessId,
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

  async getOutletsByBusiness(businessId: string) {
    return prisma.outlet.findMany({
      where: { businessId },
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

  async getHolidays(outletId: string) {
    return prisma.outletHoliday.findMany({
      where: { outletId },
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(outletId: string, name: string, date: Date, applyToAllOutlets?: boolean) {
    if (applyToAllOutlets) {
      const currentOutlet = await prisma.outlet.findUnique({ where: { id: outletId } });
      if (currentOutlet) {
        const allOutlets = await prisma.outlet.findMany({
          where: { businessId: currentOutlet.businessId, deletedAt: null },
        });
        const promises = allOutlets.map((o) =>
          prisma.outletHoliday.upsert({
            where: { outletId_date: { outletId: o.id, date } },
            update: { name },
            create: { outletId: o.id, name, date },
          })
        );
        return Promise.all(promises);
      }
    }
    return prisma.outletHoliday.upsert({
      where: { outletId_date: { outletId, date } },
      update: { name },
      create: {
        outletId,
        name,
        date,
      },
    });
  }

  async deleteHoliday(outletId: string, id: string) {
    return prisma.outletHoliday.delete({
      where: { id },
    });
  }

  async updateOperatingDays(outletId: string, operatingDays: string[]) {
    return prisma.outlet.update({
      where: { id: outletId },
      data: {
        operatingDays: JSON.stringify(operatingDays),
      },
    });
  }
}
