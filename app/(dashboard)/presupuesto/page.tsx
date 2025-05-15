'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  RecipeWithIngredients,
  ProductType,
  QuoteBreakdown,
  ProductTypeEnum
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import {
  IngredientPrice as DbIngredientPrice,
  Setting as DbSetting
} from '@/lib/db';

type Setting = Partial<DbSetting>;
type IngredientPrice = DbIngredientPrice;

const quoteSchema = z.object({
  recipeId: z.coerce
    .number()
    .int()
    .positive({ message: 'Selecciona una receta' }),
  quantity: z.coerce
    .number()
    .int()
    .positive({ message: 'Cantidad debe ser positiva' }),
  sizeOrWeight: z.string().optional(),
  flavor: z.string().optional(),
  decorationComplexity: z.enum(['simple', 'media', 'compleja']),
  details: z.string().optional()
});
type QuoteFormData = z.infer<typeof quoteSchema>;

const decorationLaborMultiplier: Record<string, number> = {
  simple: 1.0,
  media: 1.5,
  compleja: 2.5
};

export default function QuotesPage() {
  const [settings, setSettings] = useState<Partial<Setting>>({});
  const [ingredientPrices, setIngredientPrices] = useState<IngredientPrice[]>(
    []
  );
  const [availableRecipes, setAvailableRecipes] = useState<
    RecipeWithIngredients[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteBreakdown | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors }
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      recipeId: undefined,
      quantity: 1,
      flavor: '',
      decorationComplexity: 'simple',
      sizeOrWeight: '',
      details: ''
    },
    mode: 'onSubmit'
  });

  useEffect(() => {
    async function loadPrerequisites() {
      setLoadingData(true);
      try {
        const [settingsRes, ingredientsRes, recipesRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/ingredient-prices'),
          fetch('/api/recipes?includeIngredients=true')
        ]);
        if (!settingsRes.ok) throw new Error('Failed to fetch settings');
        if (!ingredientsRes.ok) throw new Error('Failed to fetch ingredients');
        if (!recipesRes.ok) throw new Error('Failed to fetch recipes');

        const settingsData = await settingsRes.json();
        const ingredientsData = await ingredientsRes.json();
        const recipesData: RecipeWithIngredients[] = await recipesRes.json();

        setSettings(settingsData || {});
        setIngredientPrices(ingredientsData || []);
        setAvailableRecipes(recipesData || []);

        if (recipesData && recipesData.length > 0 && !watch('recipeId')) {
          setValue('recipeId', recipesData[0].id);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar datos esenciales.',
          variant: 'destructive'
        });
        setSettings({});
        setIngredientPrices([]);
        setAvailableRecipes([]);
      } finally {
        setLoadingData(false);
      }
    }
    loadPrerequisites();
  }, [toast, setValue, watch]);

  const essentialSettingsMissing = useMemo(() => {
    if (loadingData) return true;
    const requiredSettingsKeys: (keyof Setting)[] = [
      'laborRateHourly',
      'profitMarginPercent',
      'ivaPercent',
      'overheadMarkupPercent'
    ];
    const hasMissingSetting = requiredSettingsKeys.some(
      (key) => settings[key] === undefined || settings[key] === null
    );
    const hasNoIngredients = ingredientPrices.length === 0;
    const hasNoRecipes = availableRecipes.length === 0;
    return hasMissingSetting || hasNoIngredients || hasNoRecipes;
  }, [loadingData, settings, ingredientPrices, availableRecipes]);

  const calculateQuote = useCallback(
    (data: QuoteFormData): QuoteBreakdown | null => {
      setIsCalculating(true);
      setQuoteResult(null);

      if (essentialSettingsMissing) {
        toast({
          title: 'Error',
          description: 'Faltan ajustes, ingredientes o recetas base.',
          variant: 'destructive'
        });
        setIsCalculating(false);
        return null;
      }

      const selectedRecipe = availableRecipes.find(
        (r) => r.id === data.recipeId
      );

      if (
        !selectedRecipe ||
        !Array.isArray(selectedRecipe.recipeIngredients) ||
        selectedRecipe.recipeIngredients.length === 0
      ) {
        toast({
          title: 'Error',
          description: `Receta (ID: ${data.recipeId}) no encontrada o sin ingredientes definidos.`,
          variant: 'destructive'
        });
        setIsCalculating(false);
        return null;
      }

      const {
        laborRateHourly,
        profitMarginPercent,
        ivaPercent,
        overheadMarkupPercent
      } = settings;

      let cogsIngredients = 0;
      let missingIngredients: string[] = [];
      let conversionErrors: string[] = [];

      for (const item of selectedRecipe.recipeIngredients) {
        const priceInfo = ingredientPrices.find(
          (p) => p.id === item.ingredientId
        );
        if (!priceInfo || priceInfo.pricePerUnit === null) {
          missingIngredients.push(
            item.ingredient?.name || `ID ${item.ingredientId}`
          );
          continue;
        }

        const recipeQty = Number(item.quantity);
        const recipeUnit = item.unit.toLowerCase().trim();
        const price = Number(priceInfo.pricePerUnit);
        const priceUnit = priceInfo.unit.toLowerCase().trim();
        const ingredientName =
          item.ingredient?.name || `ID ${item.ingredientId}`;

        let conversionFactor = 1;
        let itemCost = 0;

        if (recipeUnit === priceUnit) {
          conversionFactor = 1;
        } else if (recipeUnit === 'g' && priceUnit === 'kg') {
          conversionFactor = 0.001;
        } else if (recipeUnit === 'kg' && priceUnit === 'g') {
          conversionFactor = 1000;
        } else if (recipeUnit === 'ml' && priceUnit === 'l') {
          conversionFactor = 0.001;
        } else if (recipeUnit === 'l' && priceUnit === 'ml') {
          conversionFactor = 1000;
        } else if (recipeUnit === 'unidad' && priceUnit === 'docena') {
          conversionFactor = 1 / 12;
        } else if (recipeUnit === 'docena' && priceUnit === 'unidad') {
          conversionFactor = 12;
        } else {
          conversionErrors.push(
            `${ingredientName} (${recipeUnit} -> ${priceUnit})`
          );
          continue;
        }

        itemCost = recipeQty * conversionFactor * price;
        cogsIngredients += itemCost;
      }

      if (missingIngredients.length > 0) {
        toast({
          title: 'Advertencia',
          description: `Faltan precios para ingredientes: ${missingIngredients.join(', ')}.`,
          variant: 'destructive'
        });
      }
      if (conversionErrors.length > 0) {
        toast({
          title: 'Error de Conversión',
          description: `No se pudo convertir unidades para: ${conversionErrors.join(', ')}. Revisa unidades en recetas y ajustes.`,
          variant: 'destructive',
          duration: 10000
        });
      }

      const formQuantity = data.quantity || 1;
      const baseCogsIngredientsPerUnit = cogsIngredients;
      const totalCogsIngredients = baseCogsIngredientsPerUnit * formQuantity;

      const baseCogsPackaging =
        selectedRecipe.productType === ProductTypeEnum.Tarta ? 2.5 : 1.0;
      const totalCogsPackaging =
        selectedRecipe.productType === ProductTypeEnum.Tarta
          ? baseCogsPackaging
          : baseCogsPackaging * formQuantity;

      const baseEstimatedHours =
        Number(selectedRecipe.baseLaborHours) *
        (decorationLaborMultiplier[data.decorationComplexity] || 1.0);
      const totalDirectLaborCost =
        baseEstimatedHours * Number(laborRateHourly!) * formQuantity;

      const totalDirectCosts =
        totalCogsIngredients + totalCogsPackaging + totalDirectLaborCost;
      const totalAllocatedOverhead =
        totalDirectCosts * (Number(overheadMarkupPercent!) / 100);
      const totalCost = totalDirectCosts + totalAllocatedOverhead;
      const marginDecimal = Number(profitMarginPercent!) / 100;
      const basePrice =
        marginDecimal < 1 && marginDecimal >= 0
          ? totalCost / (1 - marginDecimal)
          : totalCost;
      const ivaDecimal = Number(ivaPercent!) / 100;
      const ivaAmount = basePrice * ivaDecimal;
      const finalPrice = basePrice + ivaAmount;

      const result: QuoteBreakdown = {
        cogsIngredients: parseFloat(totalCogsIngredients.toFixed(2)),
        cogsPackaging: parseFloat(totalCogsPackaging.toFixed(2)),
        directLaborCost: parseFloat(totalDirectLaborCost.toFixed(2)),
        allocatedOverhead: parseFloat(totalAllocatedOverhead.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        profitAmount: parseFloat((basePrice - totalCost).toFixed(2)),
        basePrice: parseFloat(basePrice.toFixed(2)),
        ivaAmount: parseFloat(ivaAmount.toFixed(2)),
        finalPrice: parseFloat(finalPrice.toFixed(2))
      };

      setIsCalculating(false);
      return result;
    },
    [
      settings,
      ingredientPrices,
      availableRecipes,
      loadingData,
      toast,
      essentialSettingsMissing
    ]
  );

  const onSubmit = (data: QuoteFormData) => {
    const result = calculateQuote(data);
    setQuoteResult(result);
  };

  const onValidationErrors = (errors: any) => {
    toast({
      title: 'Error de Validación',
      description: 'Por favor revisa los campos marcados en el formulario.',
      variant: 'destructive'
    });
  };

  if (loadingData) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Generador de Presupuestos (Beta)</h1>

      {essentialSettingsMissing && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Faltan Ajustes, Ingredientes o Recetas</AlertTitle>
          <AlertDescription>
            No se pueden calcular presupuestos. Por favor, configura los{' '}
            <Link
              href="/ajustes"
              className="font-semibold underline hover:text-destructive-foreground/80"
            >
              Ajustes
            </Link>{' '}
            (costes, márgenes), añade{' '}
            <Link
              href="/ajustes"
              className="font-semibold underline hover:text-destructive-foreground/80"
            >
              Precios de Ingredientes
            </Link>{' '}
            y define{' '}
            <Link
              href="/ajustes"
              className="font-semibold underline hover:text-destructive-foreground/80"
            >
              Recetas
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, onValidationErrors)}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Producto</CardTitle>
            <CardDescription>
              Selecciona una receta y ajusta los detalles.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {availableRecipes.length === 1 ? (
                <div>
                  <Label htmlFor="recipeId">Receta Base</Label>
                  <Input
                    id="recipeId-display"
                    value={`${availableRecipes[0].name} (${availableRecipes[0].productType})`}
                    readOnly
                    disabled
                    className="bg-muted border-muted mt-1"
                  />
                </div>
              ) : (
                <>
                  <Label htmlFor="recipeId">Receta Base</Label>
                  <Controller
                    name="recipeId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) => {
                          const parsedValue = value
                            ? parseInt(value, 10)
                            : undefined;
                          field.onChange(parsedValue);
                        }}
                        value={field.value?.toString()}
                        disabled={
                          essentialSettingsMissing ||
                          availableRecipes.length === 0
                        }
                      >
                        <SelectTrigger id="recipeId">
                          <SelectValue placeholder="Selecciona receta..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRecipes.map((recipe) => (
                            <SelectItem
                              key={recipe.id}
                              value={recipe.id.toString()}
                            >
                              {recipe.name} ({recipe.productType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </>
              )}
              {errors.recipeId && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.recipeId.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                {...register('quantity')}
                disabled={essentialSettingsMissing}
              />
              {errors.quantity && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.quantity.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="sizeOrWeight">
                Tamaño/Peso Específico (Opcional)
              </Label>
              <Input
                id="sizeOrWeight"
                {...register('sizeOrWeight')}
                disabled={essentialSettingsMissing}
              />
              {errors.sizeOrWeight && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.sizeOrWeight.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="flavor">Sabor/Relleno (Opcional)</Label>
              <Input
                id="flavor"
                {...register('flavor')}
                disabled={essentialSettingsMissing}
              />
              {errors.flavor && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.flavor.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="decorationComplexity">
                Complejidad Decoración
              </Label>
              <Controller
                name="decorationComplexity"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={essentialSettingsMissing}
                  >
                    <SelectTrigger id="decorationComplexity">
                      <SelectValue placeholder="Simple" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="compleja">Compleja</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.decorationComplexity && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.decorationComplexity.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="details">
                Detalles Adicionales / Modificaciones
              </Label>
              <Textarea
                id="details"
                {...register('details')}
                disabled={essentialSettingsMissing}
              />
              {errors.details && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.details.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isCalculating || essentialSettingsMissing}
            >
              {isCalculating ? 'Calculando...' : 'Calcular Presupuesto'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {quoteResult && !essentialSettingsMissing && (
        <Card>
          <CardHeader>
            <CardTitle>Presupuesto Estimado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <h3 className="font-semibold mb-2 border-b pb-1">
              Desglose de Costes:
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span>Ingredientes:</span>
              <span className="text-right">
                €{quoteResult.cogsIngredients.toFixed(2)}
              </span>
              <span>Embalaje:</span>
              <span className="text-right">
                €{quoteResult.cogsPackaging.toFixed(2)}
              </span>
              <span>Mano de Obra Directa:</span>
              <span className="text-right">
                €{quoteResult.directLaborCost.toFixed(2)}
              </span>
              <span>Costes Indirectos (Overhead):</span>
              <span className="text-right">
                €{quoteResult.allocatedOverhead.toFixed(2)}
              </span>
              <span className="font-semibold border-t pt-1">
                Coste Total Estimado:
              </span>
              <span className="font-semibold border-t pt-1 text-right">
                €{quoteResult.totalCost.toFixed(2)}
              </span>
            </div>
            <h3 className="font-semibold mb-2 border-b pb-1 mt-4">
              Cálculo de Precio:
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span>Coste Total:</span>
              <span className="text-right">
                €{quoteResult.totalCost.toFixed(2)}
              </span>
              <span>Beneficio Estimado:</span>
              <span className="text-right">
                €{quoteResult.profitAmount.toFixed(2)}
              </span>
              <span className="font-semibold">Precio Base (sin IVA):</span>
              <span className="font-semibold text-right">
                €{quoteResult.basePrice.toFixed(2)}
              </span>
              <span>
                IVA ({Number(settings.ivaPercent ?? 10).toFixed(0)}%):
              </span>
              <span className="text-right">
                €{quoteResult.ivaAmount.toFixed(2)}
              </span>
              <span className="text-lg font-bold border-t pt-1">
                Precio Final Recomendado (PVP):
              </span>
              <span className="text-lg font-bold border-t pt-1 text-right">
                €{quoteResult.finalPrice.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
