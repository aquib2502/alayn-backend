import { AttendanceRepository } from './attendance.repository';
import { AppError } from '../../utils/AppError';

export class AttendanceService {
  private attendanceRepository = new AttendanceRepository();

  async checkIn(outletId: string, employeeId: string) {
    const employee = await this.attendanceRepository.findEmployee(outletId, employeeId);
    if (!employee) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee not found', 404);
    }
    if (employee.status !== 'ACTIVE') {
      throw new AppError('INACTIVE_EMPLOYEE', 'Inactive employees cannot check in', 400);
    }

    const openRecord = await this.attendanceRepository.findOpenAttendance(employeeId);
    if (openRecord) {
      throw new AppError('ALREADY_CHECKED_IN', 'Employee already has an open attendance record', 400);
    }

    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return this.attendanceRepository.createAttendance(outletId, employeeId, date, now);
  }

  async checkOut(outletId: string, employeeId: string) {
    const employee = await this.attendanceRepository.findEmployee(outletId, employeeId);
    if (!employee) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee not found', 404);
    }

    const openRecord = await this.attendanceRepository.findOpenAttendance(employeeId);
    if (!openRecord) {
      throw new AppError('NO_OPEN_ATTENDANCE', 'No open attendance record found for this employee', 400);
    }

    const now = new Date();
    if (now <= openRecord.checkInTime) {
      throw new AppError('INVALID_CHECKOUT_TIME', 'Check-out time must be after check-in time', 400);
    }

    return this.attendanceRepository.updateAttendance(openRecord.id, now);
  }
}
export default AttendanceService;
