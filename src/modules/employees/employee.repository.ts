import bcrypt from 'bcrypt';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export class EmployeeRepository {
  async create(activeOutletId: string, data: any) {
    const { email, password, outletIds, ...employeeFields } = data;
    
    let targetOutletIds: string[] = Array.isArray(outletIds) && outletIds.length > 0 
      ? outletIds 
      : [activeOutletId];
    
    // Only MANAGER can be assigned to multiple outlets. For other roles, keep only the first outlet.
    if (data.role !== 'MANAGER') {
      targetOutletIds = [targetOutletIds[0]];
    }

    // 1. Get businessId from the outlet
    const outlet = await prisma.outlet.findUnique({
      where: { id: targetOutletIds[0] },
      select: { businessId: true }
    });

    if (!outlet) {
      throw new AppError('OUTLET_NOT_FOUND', 'Specified outlet does not exist', 404);
    }

    // 2. Check if email is already taken in User table
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      if (existingUser) {
        throw new AppError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists.', 409);
      }
    }

    // 3. Hash password if provided
    let passwordHash = '';
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // 4. Create User, UserOutlet entries, and Employee record(s) inside transaction
    return prisma.$transaction(async (tx) => {
      let createdUser = null;
      if (email && passwordHash) {
        createdUser = await tx.user.create({
          data: {
            name: data.name,
            email,
            passwordHash,
            phoneNo: data.phone || '',
            role: data.role,
            businessId: outlet.businessId,
            outlets: {
              create: targetOutletIds.map((id) => ({ outletId: id })),
            },
          },
        });
      }

      // Create primary employee record
      const primaryEmployee = await tx.employee.create({
        data: {
          name: data.name,
          phone: data.phone,
          role: data.role,
          joiningDate: new Date(data.joiningDate),
          status: data.status || 'ACTIVE',
          email: email || null,
          outletId: targetOutletIds[0],
          userId: createdUser?.id || null,
        },
      });

      // If MANAGER has multiple target outlets, create Employee entries for the remaining outlets as well
      if (data.role === 'MANAGER' && targetOutletIds.length > 1) {
        for (let i = 1; i < targetOutletIds.length; i++) {
          await tx.employee.create({
            data: {
              name: data.name,
              phone: data.phone,
              role: data.role,
              joiningDate: new Date(data.joiningDate),
              status: data.status || 'ACTIVE',
              email: email || null,
              outletId: targetOutletIds[i],
              userId: createdUser?.id || null,
            },
          });
        }
      }

      return primaryEmployee;
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
        user: {
          select: {
            email: true,
            outlets: {
              include: { outlet: { select: { id: true, name: true } } },
            },
          },
        },
        outlet: { select: { id: true, name: true } },
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
        include: {
          user: {
            select: {
              email: true,
              outlets: {
                include: { outlet: { select: { id: true, name: true } } },
              },
            },
          },
          outlet: { select: { id: true, name: true } },
          documents: true,
        },
      }),
      prisma.employee.count({ where }),
    ]);

    // Format output to include email directly
    const formattedData = data.map((emp) => ({
      ...emp,
      email: emp.email || emp.user?.email || null,
    }));

    return { data: formattedData, total };
  }

  async update(activeOutletId: string, id: string, data: any) {
    const { email, password, outletIds, ...employeeFields } = data;

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingEmployee) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee not found', 404);
    }

    let targetOutletIds: string[] | undefined = undefined;
    if (Array.isArray(outletIds) && outletIds.length > 0) {
      targetOutletIds = outletIds;
      if ((data.role || existingEmployee.role) !== 'MANAGER') {
        targetOutletIds = [targetOutletIds[0]];
      }
    }

    if (email && existingEmployee.userId) {
      const conflictingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: existingEmployee.userId },
        },
      });
      if (conflictingUser) {
        throw new AppError('EMAIL_ALREADY_EXISTS', 'Email is already taken by another user.', 409);
      }
    }

    let newPasswordHash: string | undefined = undefined;
    if (password && password.trim().length > 0) {
      newPasswordHash = await bcrypt.hash(password, 10);
    }

    return prisma.$transaction(async (tx) => {
      if (existingEmployee.userId) {
        const userDataToUpdate: any = {};
        if (data.name) userDataToUpdate.name = data.name;
        if (data.phone) userDataToUpdate.phoneNo = data.phone;
        if (data.role) userDataToUpdate.role = data.role;
        if (email) userDataToUpdate.email = email;
        if (newPasswordHash) userDataToUpdate.passwordHash = newPasswordHash;

        if (Object.keys(userDataToUpdate).length > 0) {
          await tx.user.update({
            where: { id: existingEmployee.userId },
            data: userDataToUpdate,
          });
        }

        if (targetOutletIds) {
          await tx.userOutlet.deleteMany({
            where: { userId: existingEmployee.userId },
          });

          await tx.userOutlet.createMany({
            data: targetOutletIds.map((oId) => ({
              userId: existingEmployee.userId!,
              outletId: oId,
            })),
          });
        }
      }

      const employeeDataToUpdate: any = {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
        ...(data.role && { role: data.role }),
        ...(data.status && { status: data.status }),
        ...(data.joiningDate && { joiningDate: new Date(data.joiningDate) }),
        ...(email && { email }),
        ...(targetOutletIds && { outletId: targetOutletIds[0] }),
      };

      return tx.employee.update({
        where: { id },
        data: employeeDataToUpdate,
      });
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

  async findLeaveRequests(outletId: string) {
    return prisma.leaveRequest.findMany({
      where: { outletId },
      include: {
        employee: true,
      },
      orderBy: { createdAt: 'desc' },
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
