import { EmployeeRepository } from './employee.repository';
import { AppError } from '../../utils/AppError';

export class EmployeeService {
  private employeeRepository = new EmployeeRepository();

  async createEmployee(outletId: string, data: any) {
    return this.employeeRepository.create(outletId, data);
  }

  async getEmployeeById(outletId: string, id: string) {
    const employee = await this.employeeRepository.findById(outletId, id);
    if (!employee) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee not found', 404);
    }
    return employee;
  }

  async getEmployees(outletId: string, limit: number, offset: number) {
    return this.employeeRepository.findMany(outletId, limit, offset);
  }

  async updateEmployee(outletId: string, id: string, data: any) {
    // Assert employee exists
    await this.getEmployeeById(outletId, id);
    return this.employeeRepository.update(outletId, id, data);
  }

  async deleteEmployee(outletId: string, id: string) {
    // Assert employee exists
    await this.getEmployeeById(outletId, id);
    return this.employeeRepository.softDelete(outletId, id);
  }

  async addDocument(outletId: string, employeeId: string, name: string, fileUrl: string, mimeType: string, sizeBytes: number) {
    // Verify employee belongs to business
    await this.getEmployeeById(outletId, employeeId);
    return this.employeeRepository.addDocument(employeeId, name, fileUrl, mimeType, sizeBytes);
  }

  async createLeaveRequest(outletId: string, data: any) {
    // Verify employee exists
    await this.getEmployeeById(outletId, data.employeeId);
    return this.employeeRepository.createLeaveRequest(outletId, data);
  }

  async updateLeaveRequestStatus(outletId: string, leaveId: string, status: 'APPROVED' | 'REJECTED', approvedById: string) {
    const leave = await this.employeeRepository.findLeaveRequestById(outletId, leaveId);
    if (!leave) {
      throw new AppError('LEAVE_REQUEST_NOT_FOUND', 'Leave request not found', 404);
    }
    if (leave.status !== 'REQUESTED') {
      throw new AppError('INVALID_TRANSITION', 'Can only update status of REQUESTED leave requests', 400);
    }
    return this.employeeRepository.updateLeaveRequestStatus(leaveId, status, approvedById);
  }
}
export default EmployeeService;
