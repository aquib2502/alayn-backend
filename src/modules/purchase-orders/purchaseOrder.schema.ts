import { z } from 'zod';

export const createPOSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    orderedQuantity: z.number().positive(),
    unitCostPaise: z.number().int().positive(),
  })).min(1),
});

export const receivePOSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().uuid(),
    receivedQuantity: z.number().positive(),
    batchNumber: z.string().min(1),
    expiryDate: z.string().transform((val) => new Date(val)),
  })).min(1),
});
