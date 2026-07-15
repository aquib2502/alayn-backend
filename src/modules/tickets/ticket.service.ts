import { TicketRepository } from './ticket.repository';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/prisma';

const ESCALATION_KEYWORDS = [
  'food safety',
  'food poisoning',
  'allergy',
  'billing dispute',
  'charged twice',
  'fraud',
];

export class TicketService {
  private ticketRepository = new TicketRepository();

  private determinePriority(text: string): 'HIGH' | 'NORMAL' {
    const lowerText = text.toLowerCase();
    const matches = ESCALATION_KEYWORDS.some((keyword) => lowerText.includes(keyword));
    return matches ? 'HIGH' : 'NORMAL';
  }

  async createFeedback(data: { orderId: string; rating: number; comment: string; source: string }) {
    // Validate order exists
    const order = await prisma.order.findFirst({
      where: { id: data.orderId, deletedAt: null },
    });
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    const outletId = order.outletId;

    // 1. Create Feedback
    const feedback = await this.ticketRepository.createFeedback(outletId, data);

    // 2. Determine escalation priority
    const priority = this.determinePriority(data.comment);

    // 3. Auto-generate Ticket
    await this.ticketRepository.createTicket(outletId, {
      title: `Customer Feedback - Rating ${data.rating}/5`,
      description: data.comment,
      priority,
      sourceTable: 'Feedback',
      sourceId: feedback.id,
    });

    return feedback;
  }

  async createStaffQuery(outletId: string, data: { employeeId: string; category: string; description: string }) {
    // Validate employee exists in outlet
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, outletId, deletedAt: null },
    });
    if (!employee) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee not found', 404);
    }

    // 1. Create StaffQuery
    const query = await this.ticketRepository.createStaffQuery(outletId, data);

    // 2. Determine escalation priority
    const priority = this.determinePriority(`${data.category} ${data.description}`);

    // 3. Auto-generate Ticket
    await this.ticketRepository.createTicket(outletId, {
      title: `Staff Query - ${data.category}`,
      description: data.description,
      priority,
      sourceTable: 'StaffQuery',
      sourceId: query.id,
    });

    return query;
  }

  async getTickets(outletId: string, limit: number, offset: number) {
    return this.ticketRepository.findTickets(outletId, limit, offset);
  }

  async updateTicketStatus(outletId: string, ticketId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED', comment?: string, changedById?: string) {
    const ticket = await this.ticketRepository.findTicketById(outletId, ticketId);
    if (!ticket) {
      throw new AppError('TICKET_NOT_FOUND', 'Ticket not found', 404);
    }

    const currentStatus = ticket.status;

    // Allowed status transitions:
    // OPEN -> IN_PROGRESS
    // OPEN -> RESOLVED
    // IN_PROGRESS -> RESOLVED
    const isValidTransition =
      (currentStatus === 'OPEN' && status === 'IN_PROGRESS') ||
      (currentStatus === 'OPEN' && status === 'RESOLVED') ||
      (currentStatus === 'IN_PROGRESS' && status === 'RESOLVED');

    if (!isValidTransition && currentStatus !== status) {
      throw new AppError('INVALID_STATE_TRANSITION', `Invalid status transition from ${currentStatus} to ${status}`, 400);
    }

    if (currentStatus === status) {
      return ticket;
    }

    // Update and write history
    const updated = await this.ticketRepository.updateTicket(ticketId, status);
    await this.ticketRepository.addTicketHistory(ticketId, status, changedById, comment);

    return updated;
  }
}
export default TicketService;
