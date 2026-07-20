import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});


export const registerSchema = z.object({
  user: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    phoneNo: z.string().min(10),
  }),

  tenant: z.object({
    name: z.string().min(2),
    locationsCount: z.string().min(1),
    businessType: z.string().min(2),
    contactDetail: z.string().min(10),
  }),
});