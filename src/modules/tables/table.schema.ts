import { z } from 'zod';

// Note: kept as plain ZodObject (no .refine) so it's compatible with
// the validate middleware which expects AnyZodObject.
// The "at least one table" constraint is enforced in the service layer.
export const createBulkTablesSchema = z.object({
  acCount: z.number().int().min(0).default(0),
  nonAcCount: z.number().int().min(0).default(0),
});

export const updateTableSchema = z.object({
  tableType: z.enum(['AC', 'NON_AC']).optional(),
  status: z.enum(['AVAILABLE', 'OCCUPIED']).optional(),
});
