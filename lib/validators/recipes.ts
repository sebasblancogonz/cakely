import { z } from 'zod';
import { ProductType } from '@types';

export const RecipeIngredientInputSchema = z.object({
  ingredientId: z.coerce.number().int().positive('ID de ingrediente inválido'),
  quantity: z.coerce.number().positive('Cantidad debe ser positiva'),
  unit: z.string().min(1, 'Unidad requerida')
});

export const NewRecipeInputSchema = z.object({
  name: z.string().trim().min(1, 'Nombre de receta requerido'),
  productType: z.nativeEnum(ProductType, {
    errorMap: () => ({ message: 'Selecciona un tipo de producto' })
  }),
  baseLaborHours: z.coerce.number().min(0, 'Horas deben ser >= 0'),
  notes: z.string().optional(),
  recipeIngredients: z
    .array(RecipeIngredientInputSchema)
    .min(1, 'Añade al menos un ingrediente')
});

export type NewRecipeInput = z.infer<typeof NewRecipeInputSchema>;

export const UpdateRecipeInputSchema = NewRecipeInputSchema.partial()
  .extend({})
  .refine((data) => Object.keys(data).length > 1, {
    message:
      'Se requiere al menos un campo para actualizar (aparte de ingredientes si no cambian)',
    path: []
  });

export type UpdateRecipeInput = z.infer<typeof UpdateRecipeInputSchema>;
