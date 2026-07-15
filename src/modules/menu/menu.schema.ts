import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  isActive: z.boolean().default(true),
});

export const createMenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  pricePaise: z.number().int().positive(),
  categoryId: z.string().uuid(),
  isActive: z.boolean().default(true),
});
