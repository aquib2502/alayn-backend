import { z } from 'zod';

export const createOutletSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
});
