import { z } from 'zod';

export const checkInSchema = z.object({
  employeeId: z.string().uuid().optional(),
});

export const checkOutSchema = z.object({
  employeeId: z.string().uuid().optional(),
});
