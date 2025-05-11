import { z } from 'zod';
import { ProductTypeEnum } from '@types';

export const RecipeIngredientInputSchema = z.object({
  ingredientId: z.coerce.number().int().positive('ID de ingrediente inválido'),
  quantity: z.coerce.number().positive('Cantidad debe ser positiva'),
  unit: z.string().min(1, 'Unidad requerida')
});

export const recipeFormSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, 'Nombre de receta requerido'),

  productType: z.string().trim().min(1, 'El tipo de producto es requerido'),
  baseLaborHours: z.coerce.number().min(0, 'Horas deben ser >= 0'),
  notes: z.string().trim().nullable().optional(),
  recipeIngredients: z
    .array(
      z.object({
        ingredientId: z.coerce
          .number({
            required_error: 'Selecciona un ingrediente',
            invalid_type_error: 'ID inválido'
          })
          .int()
          .min(1, 'Selecciona un ingrediente válido'),
        quantity: z.coerce.number().positive('Cantidad debe ser positiva'),
        unit: z.string().min(1, 'Unidad requerida'),
        name: z.string().optional()
      })
    )
    .min(1, 'Añade al menos un ingrediente')
});
export type RecipeFormData = z.infer<typeof recipeFormSchema>;

export const updateRecipeSchema = recipeFormSchema
  .partial()
  .extend({})
  .refine((data) => Object.keys(data).length > 1, {
    message:
      'Se requiere al menos un campo para actualizar (aparte de ingredientes si no cambian)',
    path: []
  });

export type UpdateRecipeFormData = z.infer<typeof updateRecipeSchema>;
