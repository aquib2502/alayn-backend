import { prisma } from '../../config/prisma';

export class ShiftRepository {
  async createShift(outletId: string, data: any) {
    return prisma.shift.create({
      data: {
        ...data,
        outletId,
      },
    });
  }

  async findShiftById(outletId: string, id: string) {
    return prisma.shift.findFirst({
      where: {
        id,
        outletId,
        deletedAt: null,
      },
    });
  }

  async findShiftAssignmentsForEmployee(employeeId: string, date: Date) {
    return prisma.shiftAssignment.findMany({
      where: {
        employeeId,
        date,
      },
      include: {
        shift: true,
      },
    });
  }

  async createShiftAssignment(outletId: string, employeeId: string, shiftId: string, date: Date) {
    return prisma.shiftAssignment.create({
      data: {
        outletId,
        employeeId,
        shiftId,
        date,
      },
    });
  }

  async createSwapRequest(outletId: string, data: any) {
    return prisma.shiftSwapRequest.create({
      data: {
        ...data,
        outletId,
      },
    });
  }

  async findSwapRequestById(outletId: string, id: string) {
    return prisma.shiftSwapRequest.findFirst({
      where: { id, outletId },
      include: {
        shift: true,
      },
    });
  }

  async updateSwapRequestStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    return prisma.shiftSwapRequest.update({
      where: { id },
      data: { status },
    });
  }

  async findShiftAssignment(employeeId: string, shiftId: string, date: Date) {
    return prisma.shiftAssignment.findUnique({
      where: {
        employeeId_shiftId_date: {
          employeeId,
          shiftId,
          date,
        },
      },
    });
  }

  async updateShiftAssignmentEmployee(id: string, employeeId: string) {
    return prisma.shiftAssignment.update({
      where: { id },
      data: { employeeId },
    });
  }
}
export default ShiftRepository;
