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

export const createBusinessFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'El nombre del negocio debe tener al menos 3 caracteres.')
    .max(100, 'El nombre no puede exceder los 100 caracteres.')
});

export type CreateBusinessFormData = z.infer<typeof createBusinessFormSchema>;
