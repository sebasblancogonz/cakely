import { z } from 'zod';

const emailSchema = z
  .string()
  .max(0)
  .or(z.string().email({ message: 'Email inválido' }))
  .nullable()
  .optional();

export const customerSchema = z.object({
  name: z.string().trim().min(1, { message: 'El nombre es requerido' }),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .min(1, { message: 'El teléfono es requerido' })
    .nullable()
    .optional(),
  instagramHandle: z.string().optional(),
  notes: z.string().optional()
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export const updateCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede quedar vacío si se modifica')
    .optional(),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .min(1, 'El teléfono no puede quedar vacío si se modifica')
    .nullable()
    .optional(),
  instagramHandle: z
    .string()
    .max(100, 'Máximo 100 caracteres')
    .nullable()
    .optional(),
  notes: z.string().nullable().optional()
});

export type UpdateCustomerFormData = z.infer<typeof updateCustomerSchema>;
