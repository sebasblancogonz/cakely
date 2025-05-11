import { z } from 'zod';

export const productTypeSchemaBase = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre del tipo de producto es requerido.')
    .max(100, 'El nombre no puede exceder los 100 caracteres.')
});

export const createProductTypeSchema = productTypeSchemaBase;
export type CreateProductTypeData = z.infer<typeof createProductTypeSchema>;

export const updateProductTypeSchema = productTypeSchemaBase
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo para actualizar.'
  });
export type UpdateProductTypeData = z.infer<typeof updateProductTypeSchema>;
