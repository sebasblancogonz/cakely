import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  FieldErrors,
  useForm,
  UseFormHandleSubmit,
  UseFormRegister
} from 'react-hook-form';
import { SettingsFormData, settingsSchema } from '@/lib/validators/settings';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Setting } from '@/types/types';
import { toast } from '@/hooks/use-toast';

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

const OperativeSettings = () => {
  const [settings, setSettings] = useState<Partial<Setting>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
      try {
        const [settingsRes] = await Promise.allSettled([
          fetch('/api/settings')
        ]);
        let settingsData: Partial<Setting> = {};
        let fetchOk = true;

        if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
          settingsData = await settingsRes.value.json();
        } else {
          fetchOk = false;
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
      toast({
        title: 'Error',
        description: `No se pudieron guardar los ajustes: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
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
  );
};

export default OperativeSettings;
