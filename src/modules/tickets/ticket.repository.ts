import { prisma } from '../../config/prisma';

export class TicketRepository {
  async createFeedback(outletId: string, data: any) {
    return prisma.feedback.create({
      data: {
        outletId,
        orderId: data.orderId,
        rating: data.rating,
        comment: data.comment,
        source: data.source,
      },
    });
  }

  async createStaffQuery(outletId: string, data: any) {
    return prisma.staffQuery.create({
      data: {
        outletId,
        employeeId: data.employeeId,
        category: data.category,
        description: data.description,
      },
    });
  }

  async createTicket(outletId: string, data: { title: string; description: string; priority: 'LOW' | 'NORMAL' | 'HIGH'; sourceTable: string; sourceId: string }) {
    return prisma.ticket.create({
      data: {
        outletId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        sourceTable: data.sourceTable,
        sourceId: data.sourceId,
        status: 'OPEN',
        histories: {
          create: {
            status: 'OPEN',
            comment: 'Ticket automatically created',
          },
        },
      },
      include: {
        histories: true,
      },
    });
  }

  async findTickets(outletId: string, limit: number, offset: number) {
    const where = { outletId };
    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: { histories: true },
      }),
      prisma.ticket.count({ where }),
    ]);
    return { data, total };
  }

  async findTicketById(outletId: string, id: string) {
    return prisma.ticket.findFirst({
      where: { id, outletId },
      include: { histories: true },
    });
  }

  async updateTicket(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') {
    return prisma.ticket.update({
      where: { id },
      data: { status },
    });
  }

  async addTicketHistory(ticketId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED', changedById?: string, comment?: string) {
    return prisma.ticketHistory.create({
      data: {
        ticketId,
        status,
        changedById,
        comment,
      },
    });
  }
}
export default TicketRepository;
