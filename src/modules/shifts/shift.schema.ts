import { z } from 'zod';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createShiftSchema = z.object({
  name: z.string().min(1),
  startTime: z.string().regex(timeRegex, 'Must be in HH:MM format'),
  endTime: z.string().regex(timeRegex, 'Must be in HH:MM format'),
});

export const assignShiftSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().transform((val) => new Date(val)),
});

export const createSwapSchema = z.object({
  fromEmployeeId: z.string().uuid(),
  toEmployeeId: z.string().uuid(),
  shiftId: z.string().uuid(),
  date: z.string().transform((val) => new Date(val)),
});

export const updateSwapStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});
