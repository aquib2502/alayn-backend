import { prisma } from '../../config/prisma';

export class AttendanceRepository {
  async findEmployee(outletId: string, id: string) {
    return prisma.employee.findFirst({
      where: {
        id,
        outletId,
        deletedAt: null,
      },
    });
  }

  async findOpenAttendance(employeeId: string) {
    return prisma.attendance.findFirst({
      where: {
        employeeId,
        checkOutTime: null,
      },
    });
  }

  async createAttendance(outletId: string, employeeId: string, date: Date, checkInTime: Date) {
    return prisma.attendance.create({
      data: {
        outletId,
        employeeId,
        date,
        checkInTime,
        status: 'PRESENT',
      },
    });
  }

  async findAttendanceLogs(outletId: string) {
    const isAll = !outletId || outletId === 'all';
    const where = isAll ? {} : { outletId };
    return prisma.attendance.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: { checkInTime: 'desc' },
    });
  }

  async updateAttendance(id: string, checkOutTime: Date) {
    return prisma.attendance.update({
      where: { id },
      data: {
        checkOutTime,
      },
    });
  }

  async findOutletHoliday(outletId: string, date: Date) {
    return prisma.outletHoliday.findUnique({
      where: {
        outletId_date: {
          outletId,
          date,
        },
      },
    });
  }

  async findOutlet(outletId: string) {
    return prisma.outlet.findUnique({
      where: { id: outletId },
    });
  }

  async findEmployeeRoster(employeeId: string, dayOfWeek: any) {
    return prisma.employeeRoster.findUnique({
      where: {
        employeeId_dayOfWeek: {
          employeeId,
          dayOfWeek,
        },
      },
      include: {
        shift: true,
      },
    });
  }
}
export default AttendanceRepository;
