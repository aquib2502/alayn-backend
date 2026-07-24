import { AttendanceRepository } from './attendance.repository';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/prisma';

export class AttendanceService {
  private attendanceRepository = new AttendanceRepository();

  async checkIn(outletId: string, employeeId?: string, userId?: string) {
    let targetEmployeeId = employeeId;
    if (!targetEmployeeId && userId) {
      const emp = await this.attendanceRepository.findEmployeeByUserId(userId);
      if (emp) {
        targetEmployeeId = emp.id;
        outletId = emp.outletId;
      }
    }
    if (!targetEmployeeId) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee profile not found for logged in user', 404);
    }

    const employee = await this.attendanceRepository.findEmployee(outletId, targetEmployeeId);
    if (!employee) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee not found', 404);
    }
    if (employee.status !== 'ACTIVE') {
      throw new AppError('INACTIVE_EMPLOYEE', 'Inactive employees cannot check in', 400);
    }

    const openRecord = await this.attendanceRepository.findOpenAttendance(targetEmployeeId);
    if (openRecord) {
      throw new AppError('ALREADY_CHECKED_IN', 'Employee already has an open attendance record', 400);
    }

    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Check Outlet Holiday
    const holiday = await this.attendanceRepository.findOutletHoliday(outletId, date);
    if (holiday) {
      throw new AppError('HOLIDAY_CLOSED', `Cannot clock in: Today is an official holiday (${holiday.name}).`, 400);
    }

    // 2. Check Outlet Operating Days
    const outlet = await this.attendanceRepository.findOutlet(outletId);
    if (outlet && outlet.operatingDays) {
      try {
        const operatingDaysArr: string[] = JSON.parse(outlet.operatingDays);
        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const currentDayName = dayNames[now.getDay()];
        if (!operatingDaysArr.includes(currentDayName)) {
          throw new AppError('OUTLET_CLOSED', `Cannot clock in: The outlet is closed on ${currentDayName}s.`, 400);
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
      }
    }

    // 3. Check Employee Roster Weekly Off
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayName = dayNames[now.getDay()];
    const roster = await this.attendanceRepository.findEmployeeRoster(targetEmployeeId, currentDayName);
    if (roster && roster.shiftId === null) {
      throw new AppError('WEEKLY_OFF', 'Cannot clock in: Today is your scheduled weekly off.', 400);
    }

    // 4. Check Shift timing for early clock-in buffer window & late status tagging
    const shiftAssignment = await prisma.shiftAssignment.findFirst({
      where: {
        employeeId: targetEmployeeId,
        date: date,
      },
      include: {
        shift: true,
      },
    });

    let attendanceStatus: 'PRESENT' | 'LATE' = 'PRESENT';

    if (shiftAssignment && shiftAssignment.shift) {
      const { startTime, name: shiftName } = shiftAssignment.shift;
      const [h, m] = startTime.split(':').map(Number);

      const shiftStartTime = new Date(now);
      shiftStartTime.setHours(h, m, 0, 0);

      // Default early buffer: 30 minutes prior to shift start
      const earlyBufferMinutes = 30;
      const earliestAllowed = new Date(shiftStartTime.getTime() - earlyBufferMinutes * 60 * 1000);

      if (now < earliestAllowed) {
        const earliestStr = earliestAllowed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        throw new AppError(
          'TOO_EARLY',
          `Cannot clock in yet: Your ${shiftName} starts at ${startTime}. Early clock-in opens ${earlyBufferMinutes} minutes prior (at ${earliestStr}).`,
          400
        );
      }

      // Late threshold: 15 minutes past shift start time
      const lateThreshold = new Date(shiftStartTime.getTime() + 15 * 60 * 1000);
      if (now > lateThreshold) {
        attendanceStatus = 'LATE';
      }
    }

    return this.attendanceRepository.createAttendance(outletId, targetEmployeeId, date, now, attendanceStatus);
  }

  async checkOut(outletId: string, employeeId?: string, userId?: string) {
    let targetEmployeeId = employeeId;
    if (!targetEmployeeId && userId) {
      const emp = await this.attendanceRepository.findEmployeeByUserId(userId);
      if (emp) {
        targetEmployeeId = emp.id;
        outletId = emp.outletId;
      }
    }
    if (!targetEmployeeId) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee profile not found for logged in user', 404);
    }

    const employee = await this.attendanceRepository.findEmployee(outletId, targetEmployeeId);
    if (!employee) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee not found', 404);
    }

    const openRecord = await this.attendanceRepository.findOpenAttendance(targetEmployeeId);
    if (!openRecord) {
      throw new AppError('NO_OPEN_ATTENDANCE', 'No open attendance record found for this employee', 400);
    }

    const now = new Date();
    if (now <= openRecord.checkInTime) {
      throw new AppError('INVALID_CHECKOUT_TIME', 'Check-out time must be after check-in time', 400);
    }

    return this.attendanceRepository.updateAttendance(openRecord.id, now);
  }

  async getAttendanceLogs(outletId: string) {
    return this.attendanceRepository.findAttendanceLogs(outletId);
  }
}
export default AttendanceService;
