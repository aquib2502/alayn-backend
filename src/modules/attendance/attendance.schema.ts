import { z } from 'zod';

export const checkInSchema = z.object({
  employeeId: z.string().uuid(),
});

export const checkOutSchema = z.object({
  employeeId: z.string().uuid(),
});
