'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  OrderStatus,
  ProductType,
  PaymentMethod,
  PaymentStatus,
  QuoteBreakdown
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
import { IngredientPrice, Setting } from '@/lib/db';

const quoteSchema = z.object({
  productType: z.nativeEnum(ProductType),
  quantity: z.coerce
    .number()
    .int()
    .positive({ message: 'Cantidad debe ser positiva' }),
  sizeOrWeight: z.string().optional(),
  flavor: z.string().min(1, { message: 'Sabor requerido' }),
  decorationComplexity: z.enum(['simple', 'media', 'compleja']),
  details: z.string().optional()
});
type QuoteFormData = z.infer<typeof quoteSchema>;

interface Recipe {
  ingredients: { name: string; quantity: number; unit: string }[];
  baseLaborHours: number;
}
const recipes: Record<string, Recipe> = {
  [ProductType.Tarta]: {
    ingredients: [
      { name: 'Harina de Trigo', quantity: 300, unit: 'g' },
      { name: 'Azúcar Blanco', quantity: 250, unit: 'g' },
      { name: 'Huevo M', quantity: 4, unit: 'unidad' },
      { name: 'Mantequilla Sin Sal', quantity: 200, unit: 'g' }
    ],
    baseLaborHours: 1.5
  },
  [ProductType.Galletas]: {
    ingredients: [
      { name: 'Harina de Trigo', quantity: 500, unit: 'g' },
      { name: 'Azúcar Blanco', quantity: 200, unit: 'g' },
      { name: 'Huevo M', quantity: 2, unit: 'unidad' },
      { name: 'Mantequilla Sin Sal', quantity: 250, unit: 'g' }
    ],
    baseLaborHours: 1.0
  },
  [ProductType.Cupcakes]: { ingredients: [], baseLaborHours: 1.2 },
  [ProductType.Macarons]: { ingredients: [], baseLaborHours: 2.5 },
  [ProductType.Otros]: { ingredients: [], baseLaborHours: 0.5 }
};

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
  const [loadingData, setLoadingData] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteBreakdown | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors }
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      productType: ProductType.Tarta,
      quantity: 1,
      decorationComplexity: 'simple'
    }
  });

  useEffect(() => {
    async function loadPrerequisites() {
      setLoadingData(true);
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
        setIngredientPrices(ingredientsData || []);
      } catch (error) {
        console.error('Error loading prerequisites:', error);
        toast({
          title: 'Error',
          description:
            'No se pudieron cargar los ajustes o ingredientes necesarios.',
          variant: 'destructive'
        });
      } finally {
        setLoadingData(false);
      }
    }
    loadPrerequisites();
  }, [toast]);

  const calculateQuote = useCallback(
    (data: QuoteFormData): QuoteBreakdown | null => {
      setIsCalculating(true);
      console.log('Calculating quote for:', data);
      console.log('Using settings:', settings);
      console.log('Using ingredients:', ingredientPrices);

      if (
        loadingData ||
        !settings ||
        Object.keys(settings).length === 0 ||
        ingredientPrices.length === 0
      ) {
        toast({
          title: 'Error',
          description: 'Faltan datos de configuración o ingredientes.',
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
      if (
        laborRateHourly === undefined ||
        profitMarginPercent === undefined ||
        ivaPercent === undefined ||
        overheadMarkupPercent === undefined
      ) {
        toast({
          title: 'Error',
          description:
            'Faltan ajustes clave (coste hora, margen, IVA, overhead %).',
          variant: 'destructive'
        });
        setIsCalculating(false);
        return null;
      }

      const recipe = recipes[data.productType];
      if (!recipe) {
        toast({
          title: 'Error',
          description: `No hay receta base definida para ${data.productType}.`,
          variant: 'destructive'
        });
        setIsCalculating(false);
        return null;
      }

      let cogsIngredients = 0;
      let missingIngredients: string[] = [];
      for (const item of recipe.ingredients) {
        const priceInfo = ingredientPrices.find((p) => p.name === item.name);
        if (!priceInfo) {
          missingIngredients.push(item.name);
          continue;
        }
        // !! Add unit conversion logic here if needed !!
        cogsIngredients += item.quantity * Number(priceInfo.pricePerUnit);
      }

      if (missingIngredients.length > 0) {
        toast({
          title: 'Advertencia',
          description: `Faltan precios para ingredientes: ${missingIngredients.join(', ')}. El coste será impreciso.`,
          variant: 'destructive'
        });
      }

      const cogsPackaging = data.productType === ProductType.Tarta ? 2.5 : 1.0;
      const estimatedHours =
        recipe.baseLaborHours *
        (decorationLaborMultiplier[data.decorationComplexity] || 1.0);
      const directLaborCost = estimatedHours * Number(laborRateHourly);
      const directCosts = cogsIngredients + cogsPackaging + directLaborCost;
      const allocatedOverhead =
        directCosts * (Number(overheadMarkupPercent) / 100);
      const totalCost = directCosts + allocatedOverhead;
      const marginDecimal = Number(profitMarginPercent) / 100;
      const basePrice =
        marginDecimal < 1 ? totalCost / (1 - marginDecimal) : totalCost;
      const ivaDecimal = Number(ivaPercent) / 100;
      const ivaAmount = basePrice * ivaDecimal;
      const finalPrice = basePrice + ivaAmount;

      const result: QuoteBreakdown = {
        cogsIngredients: parseFloat(cogsIngredients.toFixed(2)),
        cogsPackaging: parseFloat(cogsPackaging.toFixed(2)),
        directLaborCost: parseFloat(directLaborCost.toFixed(2)),
        allocatedOverhead: parseFloat(allocatedOverhead.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        profitAmount: parseFloat((basePrice - totalCost).toFixed(2)),
        basePrice: parseFloat(basePrice.toFixed(2)),
        ivaAmount: parseFloat(ivaAmount.toFixed(2)),
        finalPrice: parseFloat(finalPrice.toFixed(2))
      };

      console.log('Calculated breakdown:', result);
      setIsCalculating(false);
      return result;
    },
    [settings, ingredientPrices, loadingData, toast]
  ); // Add dependencies

  const onSubmit = (data: QuoteFormData) => {
    const result = calculateQuote(data);
    setQuoteResult(result);
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
      <h1 className="text-2xl font-bold">Generador de Presupuestos</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Producto</CardTitle>
            <CardDescription>
              Introduce las características del pedido para calcular un
              presupuesto.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productType">Tipo de Producto</Label>
              <Controller
                name="productType"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="productType">
                      <SelectValue placeholder="Selecciona tipo..." />
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
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                {...register('quantity')}
              />
              {errors.quantity && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.quantity.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="sizeOrWeight">
                Tamaño/Peso (ej: 20cm, 1.5kg)
              </Label>
              <Input id="sizeOrWeight" {...register('sizeOrWeight')} />
              {errors.sizeOrWeight && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.sizeOrWeight.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="flavor">Sabor/Relleno</Label>
              <Input id="flavor" {...register('flavor')} />
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
                  >
                    <SelectTrigger id="decorationComplexity">
                      <SelectValue placeholder="Selecciona complejidad..." />
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
              <Label htmlFor="details">Detalles Adicionales</Label>
              <Textarea id="details" {...register('details')} />
              {errors.details && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.details.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isCalculating}>
              {isCalculating ? 'Calculando...' : 'Calcular Presupuesto'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {quoteResult && (
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
