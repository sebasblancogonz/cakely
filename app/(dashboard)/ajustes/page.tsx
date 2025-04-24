'use client';

import React, { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Setting,
  IngredientPrice,
  Recipe,
  RecipeWithIngredients,
  ProductType
} from '@types';
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
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RecipeForm } from '@/components/common/RecipeForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

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

const recipeFormSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, 'Nombre de receta requerido'),
  productType: z.nativeEnum(ProductType, {
    errorMap: () => ({ message: 'Selecciona un tipo de producto' })
  }),
  baseLaborHours: z.coerce.number().min(0, 'Horas deben ser >= 0'),
  notes: z.string().optional(),
  recipeIngredients: z
    .array(
      z.object({
        ingredientId: z.coerce
          .number()
          .int()
          .positive('Selecciona un ingrediente'),
        quantity: z.coerce.number().positive('Cantidad debe ser positiva'),
        unit: z.string().min(1, 'Unidad requerida'),
        name: z.string().optional()
      })
    )
    .min(1, 'Añade al menos un ingrediente')
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Setting>>({});
  const [ingredients, setIngredients] = useState<IngredientPrice[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isIngredientDialogOpen, setIsIngredientDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] =
    useState<Partial<IngredientPrice> | null>(null);
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] =
    useState<Partial<RecipeWithIngredients> | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema)
  });

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingSettings(true);
      setLoadingIngredients(true);
      setLoadingRecipes(true);
      try {
        const [settingsRes, ingredientsRes, recipesRes] =
          await Promise.allSettled([
            fetch('/api/settings'),
            fetch('/api/ingredient-prices'),
            fetch('/api/recipes')
          ]);
        let settingsData: Partial<Setting> = {};
        let ingredientsData: IngredientPrice[] = [];
        let recipesData: Recipe[] = [];
        let fetchOk = true;

        if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
          settingsData = await settingsRes.value.json();
        } else {
          fetchOk = false;
          console.error(
            'Failed to fetch settings:',
            settingsRes.status === 'fulfilled'
              ? await settingsRes.value.text()
              : settingsRes.reason
          );
        }
        if (ingredientsRes.status === 'fulfilled' && ingredientsRes.value.ok) {
          ingredientsData = await ingredientsRes.value.json();
        } else {
          fetchOk = false;
          console.error(
            'Failed to fetch ingredients:',
            ingredientsRes.status === 'fulfilled'
              ? await ingredientsRes.value.text()
              : ingredientsRes.reason
          );
        }
        if (recipesRes.status === 'fulfilled' && recipesRes.value.ok) {
          recipesData = await recipesRes.value.json();
        } else {
          fetchOk = false;
          console.error(
            'Failed to fetch recipes:',
            recipesRes.status === 'fulfilled'
              ? await recipesRes.value.text()
              : recipesRes.reason
          );
        }

        if (!isMounted) return;
        if (!fetchOk) {
          toast({
            title: 'Error',
            description: 'No se pudieron cargar todos los datos.',
            variant: 'destructive'
          });
        }

        setSettings(settingsData || {});
        setIngredients(ingredientsData || []);
        setRecipes(recipesData || []);

        const formDefaults = {
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
        reset(formDefaults);
      } catch (error) {
        console.error('Error loading page data:', error);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Error general al cargar datos.',
            variant: 'destructive'
          });
          reset(defaultSettingsValues);
        }
      } finally {
        if (isMounted) {
          setLoadingSettings(false);
          setLoadingIngredients(false);
          setLoadingRecipes(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
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
      setIngredients((prev) =>
        isEditing
          ? prev.map((ing) =>
              ing.id === savedIngredient.id ? savedIngredient : ing
            )
          : [...prev, savedIngredient]
      );
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

  const handleSaveRecipe = async (data: RecipeFormData) => {
    const isEditing = !!data.id;
    const url = isEditing ? `/api/recipes/${data.id}` : '/api/recipes';
    const method = isEditing ? 'PUT' : 'POST';
    console.log('Saving recipe:', data);
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
      const savedRecipe = await response.json();
      setRecipes((prev) =>
        isEditing
          ? prev.map((r) => (r.id === savedRecipe.id ? savedRecipe : r))
          : [...prev, savedRecipe]
      );
      toast({
        title: 'Éxito',
        description: `Receta ${isEditing ? 'actualizada' : 'creada'}.`
      });
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: 'Error',
        description: `No se pudo guardar la receta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRecipe = async (id: number) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar esta receta? Se borrarán también sus ingredientes asociados.'
      )
    )
      return;
    console.log('Deleting recipe:', id);
    try {
      const response = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      toast({ title: 'Éxito', description: 'Receta eliminada.' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        title: 'Error',
        description: `No se pudo eliminar la receta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const openRecipeDialog = async (recipe: Partial<Recipe> | null = null) => {
    setIsRecipeDialogOpen(true);
    setEditingRecipe(null);
    if (recipe && recipe.id) {
      try {
        const res = await fetch(`/api/recipes/${recipe.id}`);
        if (!res.ok) throw new Error('Failed to fetch recipe details');
        const fullRecipeData = await res.json();
        setEditingRecipe(fullRecipeData);
      } catch (error) {
        console.error('Error fetching recipe details:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar detalles de la receta.',
          variant: 'destructive'
        });
        setIsRecipeDialogOpen(false);
      }
    }
  };

  const TableSkeleton = ({ rows = 3, cols = 5 }) => (
    <div className="space-y-2 pt-4">
      <Skeleton className="h-10 w-full" />
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={`row-sk-${i}`} className="h-12 w-full" />
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-hidden">
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
            {loadingSettings ? (
              [...Array(9)].map((_, i) => (
                <Skeleton key={`settings-sk-${i}`} className="h-16 w-full" />
              ))
            ) : (
              <>
                <div className="space-y-1.5">
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
                    <p className="text-xs text-destructive mt-1">
                      {errors.laborRateHourly.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profitMarginPercent">
                    Margen Beneficio (%)
                  </Label>
                  <Input
                    id="profitMarginPercent"
                    type="number"
                    step="0.01"
                    {...register('profitMarginPercent')}
                  />
                  {errors.profitMarginPercent && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.profitMarginPercent.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ivaPercent">% IVA Aplicable</Label>
                  <Input
                    id="ivaPercent"
                    type="number"
                    step="0.01"
                    {...register('ivaPercent')}
                  />
                  {errors.ivaPercent && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.ivaPercent.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rentMonthly">Alquiler Mensual (€)</Label>
                  <Input
                    id="rentMonthly"
                    type="number"
                    step="0.01"
                    {...register('rentMonthly')}
                  />
                  {errors.rentMonthly && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.rentMonthly.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
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
                    <p className="text-xs text-destructive mt-1">
                      {errors.electricityPriceKwh.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gasPriceUnit">Precio Gas (€/unidad)</Label>
                  <Input
                    id="gasPriceUnit"
                    type="number"
                    step="0.0001"
                    {...register('gasPriceUnit')}
                  />
                  {errors.gasPriceUnit && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.gasPriceUnit.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waterPriceUnit">Precio Agua (€/unidad)</Label>
                  <Input
                    id="waterPriceUnit"
                    type="number"
                    step="0.0001"
                    {...register('waterPriceUnit')}
                  />
                  {errors.waterPriceUnit && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.waterPriceUnit.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
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
                    <p className="text-xs text-destructive mt-1">
                      {errors.otherMonthlyOverhead.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
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
                    <p className="text-xs text-destructive mt-1">
                      {errors.overheadMarkupPercent.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isSavingSettings || !isDirty || loadingSettings}
            >
              {isSavingSettings ? 'Guardando...' : 'Guardar Ajustes Generales'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Materias Primas</CardTitle>
            <CardDescription className="mr-2">
              Gestiona los precios de tus ingredientes.
            </CardDescription>
          </div>
          <Dialog
            open={isIngredientDialogOpen}
            onOpenChange={setIsIngredientDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openIngredientDialog()}>
                <PlusCircle className="h-3.5 w-3.5" />{' '}
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Añadir Ingrediente
                </span>
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
            <TableSkeleton rows={4} cols={5} />
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
                  <TableRow key="no-ingredients-row">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Recetas</CardTitle>
            <CardDescription className="mr-2">
              Define las recetas base para tus productos.
            </CardDescription>
          </div>
          <Dialog
            open={isRecipeDialogOpen}
            onOpenChange={setIsRecipeDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openRecipeDialog(null)}>
                <PlusCircle className="h-3.5 w-3.5" />{' '}
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Añadir Receta
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingRecipe?.id ? 'Editar' : 'Añadir'} Receta
                </DialogTitle>
              </DialogHeader>
              {isRecipeDialogOpen && !loadingIngredients ? (
                <RecipeForm
                  recipe={editingRecipe}
                  availableIngredients={ingredients}
                  onSave={handleSaveRecipe}
                  closeDialog={() => setIsRecipeDialogOpen(false)}
                />
              ) : (
                <div className="p-6 text-center">Cargando ingredientes...</div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingRecipes ? (
            <TableSkeleton rows={3} cols={4} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Receta</TableHead>
                  <TableHead>Tipo Producto</TableHead>
                  <TableHead>Horas Base</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.length > 0 ? (
                  recipes.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>{rec.name}</TableCell>
                      <TableCell>{rec.productType}</TableCell>
                      <TableCell>
                        {Number(rec.baseLaborHours).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openRecipeDialog(rec)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteRecipe(rec.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow key="no-recipes-row">
                    <TableCell colSpan={4} className="text-center h-24">
                      No hay recetas definidas.
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
