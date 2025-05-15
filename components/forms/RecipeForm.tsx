'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useForm,
  useFieldArray,
  Controller,
  SubmitHandler
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  IngredientPrice,
  ProductType as ProductTypeEnum,
  RecipeWithIngredients,
  RecipeIngredientPrice
} from '@types';
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
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { RecipeFormData, recipeFormSchema } from '@/lib/validators/recipes';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatCurrency, displayDate } from '@/lib/utils';

interface RecipeFormProps {
  recipe: Partial<RecipeWithIngredients> | null;
  availableIngredients: IngredientPrice[];
  onSave: (data: RecipeFormData) => Promise<void>;
  closeDialog: () => void;
}

interface ApiProductType {
  id: number;
  name: string;
}

export function RecipeForm({
  recipe,
  availableIngredients,
  onSave,
  closeDialog
}: RecipeFormProps) {
  const { toast } = useToast();

  const [productTypeOptions, setProductTypeOptions] = useState<
    ApiProductType[]
  >([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(true);

  const initialDefaultValues = useMemo(
    (): RecipeFormData => ({
      id: recipe?.id,
      name: recipe?.name || '',

      productType: recipe?.productType || '',
      baseLaborHours: recipe?.baseLaborHours
        ? Number(recipe.baseLaborHours)
        : 0.5,
      notes: recipe?.notes || '',
      recipeIngredients: recipe?.recipeIngredients?.map(
        (ri: RecipeIngredientPrice) => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          quantity: Number(ri.quantity),
          unit: ri.unit
        })
      ) || [
        { ingredientId: undefined as any, quantity: 0, unit: 'g', name: '' }
      ]
    }),
    [recipe]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: initialDefaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'recipeIngredients'
  });

  useEffect(() => {
    setLoadingProductTypes(true);
    async function fetchProductTypes() {
      try {
        const response = await fetch('/api/product-types');
        if (!response.ok) throw new Error('Failed to fetch product types');
        const typesData: ApiProductType[] = await response.json();
        const sortedTypes = typesData.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setProductTypeOptions(sortedTypes || []);

        if (!recipe?.productType && sortedTypes.length > 0) {
          setValue('productType', sortedTypes[0].name, {
            shouldValidate: false,
            shouldDirty: false
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los tipos de producto.',
          variant: 'destructive'
        });
        setProductTypeOptions([]);
      } finally {
        setLoadingProductTypes(false);
      }
    }
    fetchProductTypes();
  }, [recipe, setValue, toast]);

  useEffect(() => {
    const defaultProductTypeValue =
      recipe?.productType ||
      (productTypeOptions.length > 0 ? productTypeOptions[0].name : '');

    reset({
      id: recipe?.id,
      name: recipe?.name || '',
      productType: defaultProductTypeValue,
      baseLaborHours: recipe?.baseLaborHours
        ? Number(recipe.baseLaborHours)
        : 0.5,
      notes: recipe?.notes || '',
      recipeIngredients:
        recipe?.recipeIngredients?.map((ri: RecipeIngredientPrice) => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient?.name || '',
          quantity: Number(ri.quantity),
          unit: ri.unit
        })) ||
        (recipe
          ? []
          : [
              {
                ingredientId: undefined as any,
                quantity: 0,
                unit: 'g',
                name: ''
              }
            ])
    });
  }, [recipe, reset, productTypeOptions]);

  const onSubmitHandler: SubmitHandler<RecipeFormData> = async (data) => {
    const saveData = {
      ...data,

      recipeIngredients: data.recipeIngredients.map(({ name, ...rest }) => rest)
    };
    await onSave(saveData);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmitHandler)}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
    >
      <input type="hidden" {...register('id')} />

      <div>
        <Label htmlFor={`recipe-name-${recipe?.id || 'new'}`}>
          Nombre Receta
        </Label>
        <Input
          id={`recipe-name-${recipe?.id || 'new'}`}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`recipe-productType-${recipe?.id || 'new'}`}>
            Tipo Producto Asociado
          </Label>
          <Controller
            name="productType"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value || ''}
                disabled={
                  loadingProductTypes || productTypeOptions.length === 0
                }
              >
                <SelectTrigger
                  id={`recipe-productType-${recipe?.id || 'new'}`}
                  className={cn(errors.productType && 'border-destructive')}
                >
                  <SelectValue
                    placeholder={
                      loadingProductTypes
                        ? 'Cargando...'
                        : 'Selecciona un tipo...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {loadingProductTypes ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : productTypeOptions.length > 0 ? (
                    productTypeOptions.map((option) => (
                      <SelectItem
                        key={option.id || option.name}
                        value={option.name}
                      >
                        {option.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                      No hay tipos. Crea uno desde un pedido o en Ajustes.
                    </div>
                  )}
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
          <Label htmlFor={`recipe-baseLaborHours-${recipe?.id || 'new'}`}>
            Horas Mano Obra Base
          </Label>
          <Input
            id={`recipe-baseLaborHours-${recipe?.id || 'new'}`}
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
        <Label htmlFor={`recipe-notes-${recipe?.id || 'new'}`}>
          Notas Adicionales (Opcional)
        </Label>
        <Textarea
          id={`recipe-notes-${recipe?.id || 'new'}`}
          {...register('notes')}
        />
        {errors.notes && (
          <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t">
        <h4 className="font-medium">Ingredientes de la Receta</h4>
        {fields.map((fieldItem, index) => (
          <div
            key={fieldItem.id}
            className="flex items-end gap-2 border-b pb-3 mb-2"
          >
            <div className="flex-1">
              <Label htmlFor={`ingredientId-${index}`} className="text-xs">
                Ingrediente
              </Label>
              <Controller
                name={`recipeIngredients.${index}.ingredientId`}
                control={control}
                defaultValue={fieldItem.ingredientId}
                render={({ field: controllerField }) => (
                  <Select
                    onValueChange={(value) =>
                      controllerField.onChange(
                        value ? parseInt(value, 10) : undefined
                      )
                    }
                    value={controllerField.value?.toString() ?? ''}
                    disabled={availableIngredients.length === 0}
                  >
                    <SelectTrigger id={`ingredientId-${index}`}>
                      <SelectValue placeholder="Elige..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIngredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id!.toString()}>
                          {' '}
                          {/* Asume que ing.id nunca es null aquí */}
                          {ing.name} ({ing.unit} -{' '}
                          {formatCurrency(ing.pricePerUnit, '-')}/ud)
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
            <div className="w-24">
              {' '}
              {/* Ancho ajustado para cantidad */}
              <Label htmlFor={`quantity-${index}`} className="text-xs">
                Cantidad
              </Label>
              <Input
                id={`quantity-${index}`}
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
            <div className="w-28">
              {' '}
              {/* Ancho ajustado para unidad */}
              <Label htmlFor={`unit-${index}`} className="text-xs">
                Unidad Receta
              </Label>
              <Controller
                name={`recipeIngredients.${index}.unit`}
                control={control}
                defaultValue={fieldItem.unit}
                render={({ field: controllerField }) => (
                  <Select
                    onValueChange={controllerField.onChange}
                    value={controllerField.value}
                  >
                    <SelectTrigger id={`unit-${index}`}>
                      <SelectValue placeholder="Unidad" />
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
              className="h-8 w-8 text-red-600 hover:text-red-700 self-center"
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
        {/* Mensaje de error general para ingredientes */}
        {errors.recipeIngredients &&
          !errors.recipeIngredients.root &&
          !Array.isArray(errors.recipeIngredients) &&
          typeof errors.recipeIngredients.message === 'string' && (
            <p className="text-xs text-red-600 mt-1">
              {errors.recipeIngredients.message}
            </p>
          )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              ingredientId: undefined as any,
              quantity: 0,
              unit: 'g',
              name: ''
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" /> Añadir Ingrediente
        </Button>
      </div>

      <DialogFooter className="mt-6 pt-4 border-t">
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={closeDialog}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting || loadingProductTypes}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {recipe?.id ? 'Actualizar Receta' : 'Crear Receta'}
        </Button>
      </DialogFooter>
    </form>
  );
}
