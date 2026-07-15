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

  async updateAttendance(id: string, checkOutTime: Date) {
    return prisma.attendance.update({
      where: { id },
      data: {
        checkOutTime,
      },
    });
  }
}
export default AttendanceRepository;
