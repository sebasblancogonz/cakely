'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function FinancialSummary() {
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${currentMonth}`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<{
    revenue: number;
    cogs: number;
    operationalExpenses: {
      total: number;
    };
    netProfit: number;
  } | null>(null);

  const handleFetchReport = async () => {
    setIsLoading(true);
    setData(null);
    console.log(`Workspaceing report for month: ${selectedMonth}`);

    try {
      const response = await fetch(
        `/api/reports/monthly-profit?month=${selectedMonth}`
      );
      if (!response.ok) {
        throw new Error('Error fetching report');
      }
      const reportData = await response.json();
      setData(reportData);
    } catch (error) {
      console.error(error);
      setData(null);
    }
    setIsLoading(false);
  };

  const grossProfit = data ? data.revenue - data.cogs : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Rentabilidad Mensual</CardTitle>
        <CardDescription>
          Analiza los ingresos, costes y beneficios de tu negocio por mes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-grow space-y-1.5">
            <Label htmlFor="month-select">Seleccionar Mes (YYYY-MM)</Label>
            <Input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Button
            onClick={handleFetchReport}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar Reporte
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-muted-foreground mt-2">Calculando...</p>
          </div>
        )}

        {data && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <InfoCard
              title="Ingresos Totales"
              value={formatCurrency(data.revenue)}
              positive
            />
            {/* <InfoCard
              title="Beneficio Bruto"
              value={formatCurrency(grossProfit)}
              positive={grossProfit >= 0}
            /> */}
            <InfoCard
              title="Gastos Operativos"
              value={formatCurrency(data.operationalExpenses.total)}
            />
            <InfoCard
              title="Beneficio Neto Estimado"
              value={formatCurrency(data.netProfit)}
              isNetProfit
              positive={data.netProfit >= 0}
            />
          </div>
        )}
        {!data && !isLoading && (
          <p className="text-center text-muted-foreground py-8">
            Selecciona un mes y genera el reporte para ver los datos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const InfoCard = ({
  title,
  value,
  positive,
  isNetProfit
}: {
  title: string;
  value: string;
  positive?: boolean;
  isNetProfit?: boolean;
}) => (
  <div
    className={cn(
      'rounded-lg border p-4 space-y-1',
      isNetProfit &&
        (positive
          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800')
    )}
  >
    <p className="text-sm font-medium text-muted-foreground">{title}</p>
    <p
      className={cn(
        'text-2xl font-bold',
        positive === true && 'text-green-600 dark:text-green-400',
        positive === false && 'text-red-600 dark:text-red-400'
      )}
    >
      {value}
    </p>
  </div>
);
