import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  role: z.enum(['SUPER_ADMIN', 'TENANT_OWNER', 'MANAGER', 'STAFF', 'KITCHEN']),
  joiningDate: z.string().transform((val) => new Date(val)),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  userId: z.string().uuid().optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  role: z.enum(['SUPER_ADMIN', 'TENANT_OWNER', 'MANAGER', 'STAFF', 'KITCHEN']).optional(),
  joiningDate: z.string().transform((val) => new Date(val)).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  userId: z.string().uuid().optional(),
});

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().uuid(),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  reason: z.string().min(1),
});

export const updateLeaveRequestStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});
