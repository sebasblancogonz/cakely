import {
  IngredientFormData,
  ingredientSchema
} from '@/lib/validators/ingredients';
import { IngredientPrice } from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { DialogClose, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

export function IngredientForm({
  ingredient,
  onSave,
  closeDialog
}: {
  ingredient: Partial<IngredientPrice> | null;
  onSave: (data: IngredientFormData) => Promise<void>;
  closeDialog: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset
  } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      id: ingredient?.id,
      name: ingredient?.name || '',
      unit: ingredient?.unit || 'g',
      pricePerUnit: ingredient?.pricePerUnit
        ? Number(ingredient.pricePerUnit)
        : undefined,
      supplier: ingredient?.supplier || ''
    }
  });

  useEffect(() => {
    reset({
      id: ingredient?.id,
      name: ingredient?.name || '',
      unit: ingredient?.unit || 'g',
      pricePerUnit: ingredient?.pricePerUnit
        ? Number(ingredient.pricePerUnit)
        : undefined,
      supplier: ingredient?.supplier || ''
    });
  }, [ingredient, reset]);

  const onSubmit = async (data: IngredientFormData) => {
    await onSave(data);
    closeDialog();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('id')} />
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre Ingrediente</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Ej: Harina de Trigo"
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="unit">Unidad de Compra/Precio</Label>
        <Controller
          name="unit"
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              value={field.value}
              defaultValue={field.value}
            >
              <SelectTrigger id="unit">
                <SelectValue placeholder="Selecciona unidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g (Gramos)</SelectItem>
                <SelectItem value="kg">kg (Kilogramos)</SelectItem>
                <SelectItem value="ml">ml (Mililitros)</SelectItem>
                <SelectItem value="l">l (Litros)</SelectItem>
                <SelectItem value="unidad">Unidad</SelectItem>
                <SelectItem value="docena">Docena</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.unit && (
          <p className="text-xs text-destructive mt-1">{errors.unit.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pricePerUnit">Precio por Unidad (€)</Label>
        <Input
          id="pricePerUnit"
          type="number"
          step="0.0001"
          {...register('pricePerUnit')}
          placeholder="Ej: 1.55"
        />
        {errors.pricePerUnit && (
          <p className="text-xs text-destructive mt-1">
            {errors.pricePerUnit.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="supplier">Proveedor (Opcional)</Label>
        <Input id="supplier" {...register('supplier')} />
        {errors.supplier && (
          <p className="text-xs text-destructive mt-1">
            {errors.supplier.message}
          </p>
        )}
      </div>
      <DialogFooter className="pt-4">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Guardando...'
            : (ingredient?.id ? 'Actualizar' : 'Añadir') + ' Ingrediente'}
        </Button>
      </DialogFooter>
    </form>
  );
}
