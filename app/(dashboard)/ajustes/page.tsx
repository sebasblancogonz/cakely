'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form'; // Import Controller
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Setting, IngredientPrice, NewIngredientPrice } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const settingsSchema = z.object({
  laborRateHourly: z.coerce.number().positive({ message: 'Debe ser positivo' }),
  profitMarginPercent: z.coerce
    .number()
    .min(0, { message: 'No puede ser negativo' }),
  ivaPercent: z.coerce.number().min(0),
  rentMonthly: z.coerce.number().min(0),
  electricityPriceKwh: z.coerce.number().min(0),
  gasPriceUnit: z.coerce.number().min(0),
  waterPriceUnit: z.coerce.number().min(0),
  otherMonthlyOverhead: z.coerce.number().min(0),
  overheadMarkupPercent: z.coerce.number().min(0)
});
type SettingsFormData = z.infer<typeof settingsSchema>;

const ingredientSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: 'Nombre requerido' }),
  unit: z.string().min(1, { message: 'Unidad requerida' }),
  pricePerUnit: z.coerce.number().min(0, { message: 'Precio debe ser >= 0' }),
  supplier: z.string().optional()
});
type IngredientFormData = z.infer<typeof ingredientSchema>;

const defaultSettingsValues: SettingsFormData = {
  laborRateHourly: 15,
  profitMarginPercent: 30,
  ivaPercent: 10,
  rentMonthly: 0,
  electricityPriceKwh: 0.15,
  gasPriceUnit: 0.06,
  waterPriceUnit: 2.0,
  otherMonthlyOverhead: 50,
  overheadMarkupPercent: 20
};

function IngredientForm({
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
    reset,
    getValues
  } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      id: ingredient?.id,
      name: ingredient?.name || '',
      unit: ingredient?.unit || 'g',
      pricePerUnit: ingredient?.pricePerUnit
        ? Number(ingredient.pricePerUnit)
        : 0,
      supplier: ingredient?.supplier || ''
    }
  });

  const testZodSchema = () => {
    const currentFormData = getValues();
    console.log('Probando Zod directamente con:', currentFormData);
    try {
      ingredientSchema.parse(currentFormData);
      console.log('VALIDACIÓN ZOD DIRECTA: ÉXITO');
    } catch (error) {
      if (error instanceof z.ZodError) {
        // ¡Este es el error detallado de Zod!
        console.error('VALIDACIÓN ZOD DIRECTA: FALLÓ:', error.format());
      } else {
        console.error('VALIDACIÓN ZOD DIRECTA: ERROR DESCONOCIDO:', error);
      }
    }
  };

  const onValidationErrors = (errors: any) => {
    console.error('ERRORES DE VALIDACIÓN DEL FORMULARIO:', errors);
  };

  const onSubmit = async (data: IngredientFormData) => {
    // ... tu lógica onSubmit existente ...
    console.log('IngredientForm onSubmit triggered. Validated Data:', data);
    await onSave(data);
    reset();
    closeDialog();
  };
  return (
    <form
      onSubmit={handleSubmit(onSubmit, onValidationErrors)}
      className="space-y-4"
    >
      <input type="hidden" {...register('id')} />
      <div>
        <Label htmlFor="name">Nombre Ingrediente</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="unit">Unidad</Label>
        <Controller
          name="unit"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          <p className="text-xs text-red-600 mt-1">{errors.unit.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="pricePerUnit">Precio por Unidad (€)</Label>
        <Input
          id="pricePerUnit"
          type="number"
          step="0.0001"
          {...register('pricePerUnit')}
        />
        {errors.pricePerUnit && (
          <p className="text-xs text-red-600 mt-1">
            {errors.pricePerUnit.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="supplier">Proveedor (Opcional)</Label>
        <Input id="supplier" {...register('supplier')} />
        {errors.supplier && (
          <p className="text-xs text-red-600 mt-1">{errors.supplier.message}</p>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Ingrediente'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Setting>>({});
  const [ingredients, setIngredients] = useState<IngredientPrice[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isIngredientDialogOpen, setIsIngredientDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] =
    useState<Partial<IngredientPrice> | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaultSettingsValues
  });

  useEffect(() => {
    async function loadData() {
      setLoadingSettings(true);
      setLoadingIngredients(true);
      try {
        const [settingsRes, ingredientsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/ingredient-prices')
        ]);
        if (!settingsRes.ok) throw new Error('Failed to fetch settings');
        if (!ingredientsRes.ok) throw new Error('Failed to fetch ingredients');

        const settingsData = await settingsRes.json();
        const ingredientsData = await ingredientsRes.json();

        setSettings(settingsData || {});
        const fetchedOrDefaultValues: SettingsFormData = {
          laborRateHourly: Number(
            settingsData?.laborRateHourly ??
              defaultSettingsValues.laborRateHourly
          ),
          profitMarginPercent: Number(
            settingsData?.profitMarginPercent ??
              defaultSettingsValues.profitMarginPercent
          ),
          ivaPercent: Number(
            settingsData?.ivaPercent ?? defaultSettingsValues.ivaPercent
          ),
          rentMonthly: Number(
            settingsData?.rentMonthly ?? defaultSettingsValues.rentMonthly
          ),
          electricityPriceKwh: Number(
            settingsData?.electricityPriceKwh ??
              defaultSettingsValues.electricityPriceKwh
          ),
          gasPriceUnit: Number(
            settingsData?.gasPriceUnit ?? defaultSettingsValues.gasPriceUnit
          ),
          waterPriceUnit: Number(
            settingsData?.waterPriceUnit ?? defaultSettingsValues.waterPriceUnit
          ),
          otherMonthlyOverhead: Number(
            settingsData?.otherMonthlyOverhead ??
              defaultSettingsValues.otherMonthlyOverhead
          ),
          overheadMarkupPercent: Number(
            settingsData?.overheadMarkupPercent ??
              defaultSettingsValues.overheadMarkupPercent
          )
        };
        reset(fetchedOrDefaultValues);

        setIngredients(ingredientsData || []);
      } catch (error) {
        console.error('Error loading settings data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los ajustes.',
          variant: 'destructive'
        });
        reset(defaultSettingsValues);
      } finally {
        setLoadingSettings(false);
        setLoadingIngredients(false);
      }
    }
    loadData();
  }, [reset, toast]);

  const onSettingsSubmit = async (data: SettingsFormData) => {
    setIsSavingSettings(true);
    console.log('Saving settings:', data);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }
      const savedSettings = await response.json();
      setSettings(savedSettings);
      reset(data);
      toast({ title: 'Éxito', description: 'Ajustes generales guardados.' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: `No se pudieron guardar los ajustes: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveIngredient = async (data: IngredientFormData) => {
    const isEditing = !!data.id;
    const url = isEditing
      ? `/api/ingredient-prices/${data.id}`
      : '/api/ingredient-prices';
    const method = isEditing ? 'PUT' : 'POST';
    console.log('Saving ingredient:', data);
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }
      const savedIngredient = await response.json();
      setIngredients((prev) => {
        if (isEditing) {
          return prev.map((ing) =>
            ing.id === savedIngredient.id ? savedIngredient : ing
          );
        } else {
          return [...prev, savedIngredient];
        }
      });
      toast({
        title: 'Éxito',
        description: `Ingrediente ${isEditing ? 'actualizado' : 'añadido'}.`
      });
    } catch (error) {
      console.error('Error saving ingredient:', error);
      toast({
        title: 'Error',
        description: `No se pudo guardar el ingrediente: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteIngredient = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este ingrediente?'))
      return;
    console.log('Deleting ingredient:', id);
    try {
      const response = await fetch(`/api/ingredient-prices/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }
      setIngredients((prev) => prev.filter((ing) => ing.id !== id));
      toast({ title: 'Éxito', description: 'Ingrediente eliminado.' });
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      toast({
        title: 'Error',
        description: `No se pudo eliminar el ingrediente: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const openIngredientDialog = (
    ingredient: Partial<IngredientPrice> | null = null
  ) => {
    setEditingIngredient(ingredient);
    setIsIngredientDialogOpen(true);
  };

  if (loadingSettings) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Ajustes del Negocio</h1>
      <form onSubmit={handleSubmit(onSettingsSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Costes Operativos y Márgenes</CardTitle>
            <CardDescription>
              Define los costes base y márgenes para calcular precios rentables.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="laborRateHourly">
                Coste Mano de Obra (€/hora)
              </Label>
              <Input
                id="laborRateHourly"
                type="number"
                step="0.01"
                {...register('laborRateHourly')}
              />
              {errors.laborRateHourly && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.laborRateHourly.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="profitMarginPercent">Margen Beneficio (%)</Label>
              <Input
                id="profitMarginPercent"
                type="number"
                step="0.01"
                {...register('profitMarginPercent')}
              />
              {errors.profitMarginPercent && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.profitMarginPercent.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="ivaPercent">% IVA Aplicable</Label>
              <Input
                id="ivaPercent"
                type="number"
                step="0.01"
                {...register('ivaPercent')}
              />
              {errors.ivaPercent && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.ivaPercent.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="rentMonthly">Alquiler Mensual (€)</Label>
              <Input
                id="rentMonthly"
                type="number"
                step="0.01"
                {...register('rentMonthly')}
              />
              {errors.rentMonthly && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.rentMonthly.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="electricityPriceKwh">
                Precio Electricidad (€/kWh)
              </Label>
              <Input
                id="electricityPriceKwh"
                type="number"
                step="0.0001"
                {...register('electricityPriceKwh')}
              />
              {errors.electricityPriceKwh && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.electricityPriceKwh.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="gasPriceUnit">Precio Gas (€/unidad)</Label>
              <Input
                id="gasPriceUnit"
                type="number"
                step="0.0001"
                {...register('gasPriceUnit')}
              />
              {errors.gasPriceUnit && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.gasPriceUnit.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="waterPriceUnit">Precio Agua (€/unidad)</Label>
              <Input
                id="waterPriceUnit"
                type="number"
                step="0.0001"
                {...register('waterPriceUnit')}
              />
              {errors.waterPriceUnit && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.waterPriceUnit.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="otherMonthlyOverhead">
                Otros Gastos Fijos (€/mes)
              </Label>
              <Input
                id="otherMonthlyOverhead"
                type="number"
                step="0.01"
                {...register('otherMonthlyOverhead')}
              />
              {errors.otherMonthlyOverhead && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.otherMonthlyOverhead.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="overheadMarkupPercent">
                Overhead (% sobre Coste Directo)
              </Label>
              <Input
                id="overheadMarkupPercent"
                type="number"
                step="0.01"
                {...register('overheadMarkupPercent')}
              />
              {errors.overheadMarkupPercent && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.overheadMarkupPercent.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSavingSettings || !isDirty}>
              {isSavingSettings ? 'Guardando...' : 'Guardar Ajustes Generales'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Materias Primas</CardTitle>
            <CardDescription>
              Gestiona los precios de tus ingredientes.
            </CardDescription>
          </div>
          <Dialog
            open={isIngredientDialogOpen}
            onOpenChange={setIsIngredientDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openIngredientDialog()}>
                <PlusCircle className="h-4 w-4 mr-2" /> Añadir Ingrediente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingIngredient?.id ? 'Editar' : 'Añadir'} Ingrediente
                </DialogTitle>
              </DialogHeader>
              <IngredientForm
                ingredient={editingIngredient}
                onSave={handleSaveIngredient}
                closeDialog={() => setIsIngredientDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingIngredients ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Precio/Unidad (€)</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.length > 0 ? (
                  ingredients.map((ing) => (
                    <TableRow key={ing.id}>
                      <TableCell>{ing.name}</TableCell>
                      <TableCell>{ing.unit}</TableCell>
                      <TableCell>
                        {Number(ing.pricePerUnit).toFixed(4)}
                      </TableCell>
                      <TableCell>{ing.supplier || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openIngredientDialog(ing)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteIngredient(ing.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No hay ingredientes definidos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
