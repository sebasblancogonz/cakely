import { z } from 'zod';

export const businessProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  logoUrl: z.string().url('Logo URL must be a valid URL').optional()
});

export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

export const profilePatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    logoUrl: z.string().url().or(z.literal('')).nullable().optional()
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nada que actualizar'
  });
