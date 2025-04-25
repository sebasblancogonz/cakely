import { z } from 'zod';

export const ingredientSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, { message: 'El nombre es requerido' }),
  unit: z.string().min(1, { message: 'Unidad requerida' }),
  pricePerUnit: z.coerce
    .number({ invalid_type_error: 'El precio debe ser un número' })
    .min(0, { message: 'El precio no puede ser negativo' }),
  supplier: z.string().trim().optional()
});

export const updateIngredientSchema = ingredientSchema
  .partial()
  .extend({
    name: ingredientSchema.shape.name.optional(),
    unit: ingredientSchema.shape.unit.optional(),
    pricePerUnit: ingredientSchema.shape.pricePerUnit.optional(),
    supplier: ingredientSchema.shape.supplier.optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo para actualizar'
  });

export type IngredientFormData = z.infer<typeof ingredientSchema>;
export type UpdateIngredientFormData = z.infer<typeof updateIngredientSchema>;
