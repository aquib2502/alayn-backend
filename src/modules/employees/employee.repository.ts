import { prisma } from '../../config/prisma';

export class EmployeeRepository {
  async create(outletId: string, data: any) {
    return prisma.employee.create({
      data: {
        ...data,
        outletId,
      },
    });
  }

  async findById(outletId: string, id: string) {
    return prisma.employee.findFirst({
      where: {
        id,
        outletId,
        deletedAt: null,
      },
      include: {
        documents: true,
      },
    });
  }

  async findMany(outletId: string, limit: number, offset: number) {
    const where = { outletId, deletedAt: null };
    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.count({ where }),
    ]);
    return { data, total };
  }

  async update(outletId: string, id: string, data: any) {
    return prisma.employee.update({
      where: { id },
      data,
    });
  }

  async softDelete(outletId: string, id: string) {
    return prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addDocument(employeeId: string, name: string, fileUrl: string, mimeType: string, sizeBytes: number) {
    return prisma.employeeDocument.create({
      data: {
        employeeId,
        name,
        fileUrl,
        mimeType,
        sizeBytes,
      },
    });
  }

  async createLeaveRequest(outletId: string, data: any) {
    return prisma.leaveRequest.create({
      data: {
        ...data,
        outletId,
      },
    });
  }

  async findLeaveRequestById(outletId: string, id: string) {
    return prisma.leaveRequest.findFirst({
      where: {
        id,
        outletId,
      },
    });
  }

  async updateLeaveRequestStatus(id: string, status: 'APPROVED' | 'REJECTED', approvedById: string) {
    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedById,
      },
    });
  }
}
export default EmployeeRepository;
