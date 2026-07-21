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

  async findShifts(outletId: string) {
    return prisma.shift.findMany({
      where: { outletId, deletedAt: null },
      include: {
        assignments: {
          include: {
            employee: true,
          },
        },
        swapRequests: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateShiftAssignmentEmployee(id: string, employeeId: string) {
    return prisma.shiftAssignment.update({
      where: { id },
      data: { employeeId },
    });
  }

  async findEmployeeRoster(employeeId: string) {
    return prisma.employeeRoster.findMany({
      where: { employeeId },
      include: {
        shift: true,
      },
    });
  }

  async findOutletRosters(outletId: string) {
    return prisma.employeeRoster.findMany({
      where: { outletId },
      include: {
        employee: true,
        shift: true,
      },
    });
  }

  async upsertEmployeeRoster(outletId: string, employeeId: string, dayOfWeek: any, shiftId: string | null) {
    return prisma.employeeRoster.upsert({
      where: {
        employeeId_dayOfWeek: {
          employeeId,
          dayOfWeek,
        },
      },
      update: {
        shiftId,
        outletId,
      },
      create: {
        employeeId,
        dayOfWeek,
        shiftId,
        outletId,
      },
    });
  }
}
export default ShiftRepository;
