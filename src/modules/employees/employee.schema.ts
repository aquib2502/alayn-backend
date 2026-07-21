import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10),
  role: z.enum(['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'STAFF', 'KITCHEN']),
  joiningDate: z.string().transform((val) => new Date(val)),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  outletIds: z.array(z.string()).optional(),
  userId: z.string().uuid().optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  phone: z.string().min(10).optional(),
  role: z.enum(['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'STAFF', 'KITCHEN']).optional(),
  joiningDate: z.string().transform((val) => new Date(val)).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  outletIds: z.array(z.string()).optional(),
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
