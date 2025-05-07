'use client';

import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IngredientPrice, ProductType, RecipeWithIngredients } from '@types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Trash2, Plus } from 'lucide-react';
import { RecipeFormData, recipeFormSchema } from '@/lib/validators/recipes';

interface RecipeFormProps {
  recipe: Partial<RecipeWithIngredients> | null;
  availableIngredients: IngredientPrice[];
  onSave: (data: RecipeFormData) => Promise<void>;
  closeDialog: () => void;
}

export function RecipeForm({
  recipe,
  availableIngredients,
  onSave,
  closeDialog
}: RecipeFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      id: recipe?.id,
      name: recipe?.name || '',
      productType: (recipe?.productType as ProductType) || ProductType.Tarta,
      baseLaborHours: recipe?.baseLaborHours
        ? Number(recipe.baseLaborHours)
        : 0.5,
      notes: recipe?.notes || '',
      recipeIngredients:
        recipe?.recipeIngredients?.map((ri) => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          quantity: Number(ri.quantity),
          unit: ri.unit
        })) || []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'recipeIngredients'
  });

  useEffect(() => {
    reset({
      id: recipe?.id,
      name: recipe?.name || '',
      productType: (recipe?.productType as ProductType) || ProductType.Tarta,
      baseLaborHours: recipe?.baseLaborHours
        ? Number(recipe.baseLaborHours)
        : 0.5,
      notes: recipe?.notes || '',
      recipeIngredients:
        recipe?.recipeIngredients?.map((ri) => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          quantity: Number(ri.quantity),
          unit: ri.unit
        })) || []
    });
  }, [recipe, reset]);

  const onSubmit = async (data: RecipeFormData) => {
    console.log('Recipe form data to save:', data);
    const saveData = {
      ...data,
      recipeIngredients: data.recipeIngredients.map(({ name, ...rest }) => rest)
    };
    await onSave(saveData);
    closeDialog();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
    >
      <input type="hidden" {...register('id')} />
      <div>
        <Label htmlFor="name">Nombre Receta</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="productType">Tipo Producto Asociado</Label>
          <Controller
            name="productType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger id="productType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProductType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.productType && (
            <p className="text-xs text-red-600 mt-1">
              {errors.productType.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="baseLaborHours">Horas Mano Obra Base</Label>
          <Input
            id="baseLaborHours"
            type="number"
            step="0.01"
            {...register('baseLaborHours')}
          />
          {errors.baseLaborHours && (
            <p className="text-xs text-red-600 mt-1">
              {errors.baseLaborHours.message}
            </p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notas Adicionales</Label>
        <Textarea id="notes" {...register('notes')} />
        {errors.notes && (
          <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t">
        <h4 className="font-medium">Ingredientes de la Receta</h4>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2 border-b pb-2">
            <div className="flex-1">
              <Label className="text-xs">Ingrediente</Label>
              <Controller
                name={`recipeIngredients.${index}.ingredientId`}
                control={control}
                render={({ field: controllerField }) => (
                  <Select
                    onValueChange={(value) =>
                      controllerField.onChange(parseInt(value, 10))
                    }
                    defaultValue={controllerField.value?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elige..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIngredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id.toString()}>
                          {ing.name} ({ing.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.recipeIngredients?.[index]?.ingredientId && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.recipeIngredients?.[index]?.ingredientId?.message}
                </p>
              )}
            </div>
            <div className="w-20">
              <Label className="text-xs">Cantidad</Label>
              <Input
                type="number"
                step="any"
                {...register(`recipeIngredients.${index}.quantity`)}
              />
              {errors.recipeIngredients?.[index]?.quantity && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.recipeIngredients?.[index]?.quantity?.message}
                </p>
              )}
            </div>
            <div className="w-24">
              <Label className="text-xs">Unidad Receta</Label>
              <Controller
                name={`recipeIngredients.${index}.unit`}
                control={control}
                render={({ field: controllerField }) => (
                  <Select
                    onValueChange={controllerField.onChange}
                    defaultValue={controllerField.value}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                      <SelectItem value="unidad">unidad</SelectItem>
                      <SelectItem value="docena">docena</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.recipeIngredients?.[index]?.unit && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.recipeIngredients?.[index]?.unit?.message}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {errors.recipeIngredients?.root && (
          <p className="text-xs text-red-600 mt-1">
            {errors.recipeIngredients.root.message}
          </p>
        )}
        {errors.recipeIngredients &&
          typeof errors.recipeIngredients === 'object' &&
          !errors.recipeIngredients.root &&
          Array.isArray(errors.recipeIngredients) &&
          errors.recipeIngredients.length > 0 && (
            <p className="text-xs text-red-600 mt-1">
              Revisa los errores en los ingredientes.
            </p>
          )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ ingredientId: 0, quantity: 0, unit: 'g' })}
        >
          <Plus className="h-4 w-4 mr-2" /> Añadir Ingrediente a Receta
        </Button>
      </div>

      <DialogFooter className="mt-6">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Receta'}
        </Button>
      </DialogFooter>
    </form>
  );
}
