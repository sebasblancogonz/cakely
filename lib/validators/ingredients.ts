import { z } from 'zod';

const allowedUnits = z.enum(['g', 'kg', 'ml', 'l', 'unidad', 'docena']);

export const NewIngredientPriceSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, { message: 'El nombre es requerido' }),
  unit: allowedUnits,
  pricePerUnit: z.coerce // Convierte string a número
    .number({ invalid_type_error: 'El precio debe ser un número' })
    .min(0, { message: 'El precio no puede ser negativo' }),
  supplier: z.string().trim().optional()
});

export const UpdateIngredientPriceSchema = NewIngredientPriceSchema.partial()
  .extend({
    name: NewIngredientPriceSchema.shape.name.optional(),
    unit: NewIngredientPriceSchema.shape.unit.optional(),
    pricePerUnit: NewIngredientPriceSchema.shape.pricePerUnit.optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo para actualizar'
  });

export type NewIngredientPriceInput = z.infer<typeof NewIngredientPriceSchema>;
export type UpdateIngredientPriceInput = z.infer<
  typeof UpdateIngredientPriceSchema
>;
