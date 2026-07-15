import { z } from 'zod';

export const createOrderSchema = z.object({
  tableNumber: z.number().int().positive().optional(),
  source: z.enum(['COUNTER', 'QR', 'DELIVERY']),
  tableToken: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING', 'READY', 'SERVED', 'DISPATCHED', 'COMPLETED', 'CANCELLED']),
  comment: z.string().optional(),
});

export const createPaymentSchema = z.object({
  amountPaise: z.number().int().positive(),
  method: z.enum(['UPI', 'CARD', 'CASH']),
  status: z.enum(['PENDING', 'CONFIRMED', 'FAILED']).default('CONFIRMED'),
});
