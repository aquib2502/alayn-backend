import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const createMenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  price: z.number().positive().optional(),
  pricePaise: z.number().int().positive().optional(),
  categoryId: z.string().uuid(),
  imageUrl: z.string().optional().nullable(),
  isVeg: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  isAvailable: z.boolean().optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();
