import { ShiftRepository } from './shift.repository';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/prisma';

export class ShiftService {
  private shiftRepository = new ShiftRepository();

  async createShift(outletId: string, data: any) {
    return this.shiftRepository.createShift(outletId, data);
  }

  async getShifts(outletId: string) {
    return this.shiftRepository.findShifts(outletId);
  }

  async assignShift(outletId: string, shiftId: string, employeeId: string, date: Date) {
    // 1. Load shift details
    const targetShift = await this.shiftRepository.findShiftById(outletId, shiftId);
    if (!targetShift) {
      throw new AppError('SHIFT_NOT_FOUND', 'Shift not found', 404);
    }

    // 2. Fetch existing assignments on this date
    const existingAssignments = await this.shiftRepository.findShiftAssignmentsForEmployee(employeeId, date);

    // 3. Check for overlaps: existingStart < newEnd AND existingEnd > newStart
    const newStart = targetShift.startTime;
    const newEnd = targetShift.endTime;

    for (const assignment of existingAssignments) {
      const existingStart = assignment.shift.startTime;
      const existingEnd = assignment.shift.endTime;

      if (existingStart < newEnd && existingEnd > newStart) {
        throw new AppError(
          'SHIFT_OVERLAP',
          `Shift overlaps with existing shift: ${assignment.shift.name} (${existingStart} - ${existingEnd})`,
          400
        );
      }
    }

    // 4. Assign shift
    return this.shiftRepository.createShiftAssignment(outletId, employeeId, shiftId, date);
  }

  async assignShiftBulk(outletId: string, shiftId: string, employeeIds: string[], date: Date): Promise<{ assignedCount: number; total: number; results: any[]; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];

    for (const empId of employeeIds) {
      try {
        const assigned = await this.assignShift(outletId, shiftId, empId, date);
        results.push(assigned);
      } catch (err: any) {
        errors.push({ employeeId: empId, error: err.message });
      }
    }

    return { assignedCount: results.length, total: employeeIds.length, results, errors };
  }

  async createSwapRequest(outletId: string, data: any) {
    // Verify fromEmployee exists and has the assignment
    const assignment = await this.shiftRepository.findShiftAssignment(
      data.fromEmployeeId,
      data.shiftId,
      data.date
    );
    if (!assignment) {
      throw new AppError('ASSIGNMENT_NOT_FOUND', 'From-employee does not have the specified shift assigned on this date', 400);
    }

    // Verify toEmployee exists
    const toEmployee = await prisma.employee.findFirst({
      where: { id: data.toEmployeeId, outletId, deletedAt: null },
    });
    if (!toEmployee) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'To-employee not found', 404);
    }
    if (toEmployee.status !== 'ACTIVE') {
      throw new AppError('INACTIVE_EMPLOYEE', 'To-employee is not active', 400);
    }

    return this.shiftRepository.createSwapRequest(outletId, data);
  }

  async updateSwapStatus(outletId: string, swapId: string, status: 'APPROVED' | 'REJECTED') {
    const swap = await this.shiftRepository.findSwapRequestById(outletId, swapId);
    if (!swap) {
      throw new AppError('SWAP_REQUEST_NOT_FOUND', 'Shift swap request not found', 404);
    }
    if (swap.status !== 'REQUESTED') {
      throw new AppError('INVALID_TRANSITION', 'Can only update status of REQUESTED swaps', 400);
    }

    if (status === 'REJECTED') {
      return this.shiftRepository.updateSwapRequestStatus(swapId, 'REJECTED');
    }

    // If APPROVED, perform transaction
    return prisma.$transaction(async (tx) => {
      // 1. Check target employee exists and is active
      const toEmployee = await tx.employee.findFirst({
        where: { id: swap.toEmployeeId, outletId, deletedAt: null },
      });
      if (!toEmployee) {
        throw new AppError('EMPLOYEE_NOT_FOUND', 'Target employee not found', 404);
      }
      if (toEmployee.status !== 'ACTIVE') {
        throw new AppError('INACTIVE_EMPLOYEE', 'Target employee is not active', 400);
      }

      // 2. Check for shift assignment of fromEmployee
      const assignment = await tx.shiftAssignment.findUnique({
        where: {
          employeeId_shiftId_date: {
            employeeId: swap.fromEmployeeId,
            shiftId: swap.shiftId,
            date: swap.date,
          },
        },
      });
      if (!assignment) {
        throw new AppError('ASSIGNMENT_NOT_FOUND', 'Source shift assignment not found', 404);
      }

      // 3. Check for overlap on target employee on that date
      const targetAssignments = await tx.shiftAssignment.findMany({
        where: {
          employeeId: swap.toEmployeeId,
          date: swap.date,
        },
        include: {
          shift: true,
        },
      });

      const newStart = swap.shift.startTime;
      const newEnd = swap.shift.endTime;

      for (const ta of targetAssignments) {
        const existingStart = ta.shift.startTime;
        const existingEnd = ta.shift.endTime;

        if (existingStart < newEnd && existingEnd > newStart) {
          throw new AppError(
            'SHIFT_OVERLAP',
            `Target employee has an overlapping shift: ${ta.shift.name} (${existingStart} - ${existingEnd})`,
            400
          );
        }
      }

      // 4. Delete the old assignment and create the new assignment (due to compound primary key constraints)
      await tx.shiftAssignment.delete({
        where: { id: assignment.id },
      });

      await tx.shiftAssignment.create({
        data: {
          outletId,
          employeeId: swap.toEmployeeId,
          shiftId: swap.shiftId,
          date: swap.date,
        },
      });

      // 5. Update swap request status
      return tx.shiftSwapRequest.update({
        where: { id: swapId },
        data: { status: 'APPROVED' },
      });
    });
  }

  async getEmployeeRoster(employeeId: string) {
    return this.shiftRepository.findEmployeeRoster(employeeId);
  }

  async getOutletRosters(outletId: string) {
    return this.shiftRepository.findOutletRosters(outletId);
  }

  async setWeeklyRoster(
    outletId: string,
    employeeId: string,
    weeklySchedule: Array<{ dayOfWeek: string; shiftId: string | null }>
  ) {
    const results = [];
    for (const item of weeklySchedule) {
      const updated = await this.shiftRepository.upsertEmployeeRoster(
        outletId,
        employeeId,
        item.dayOfWeek as any,
        item.shiftId
      );
      results.push(updated);
    }
    return results;
  }
}
export default ShiftService;
