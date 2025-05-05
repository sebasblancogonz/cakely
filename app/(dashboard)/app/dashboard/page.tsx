'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfToday,
  endOfToday,
  subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import {
  Order,
  OrderStatus,
  ProductType,
  PaymentMethod,
  PaymentStatus
} from '@types';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const COLORS_PIE = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#AF19FF',
  '#FF6347'
];
const COLOR_BAR = '#82ca9d';

type ChartData = { name: string; value: number };

type SelectedRangeType =
  | 'all'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export default function StatisticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined
  });

  const [selectedRangeType, setSelectedRangeType] =
    useState<SelectedRangeType>('all');

  useEffect(() => {
    setLoading(true);
    async function fetchOrders() {
      try {
        const response = await fetch('/api/orders?limit=9999');
        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }
        const data = await response.json();
        setOrders(data.orders || []);
        console.log('Statistics: Orders fetched', data.orders?.length);
      } catch (error) {
        console.error('Failed to fetch orders for statistics:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const processedData = useMemo(() => {
    console.log(
      '[useMemo Statistics] Recalculating based on dateRange:',
      dateRange
    );
    if (!orders || orders.length === 0) {
      console.log('[useMemo Statistics] No orders available.');
      return {
        statusData: [],
        productData: [],
        paymentData: [],
        revenue: 0,
        pending: 0
      };
    }

    const { from, to } = dateRange;

    const startDate =
      from instanceof Date && !isNaN(from.getTime())
        ? new Date(from.setHours(0, 0, 0, 0))
        : new Date('1900-01-01');
    const endDate =
      to instanceof Date && !isNaN(to.getTime())
        ? new Date(to.setHours(23, 59, 59, 999))
        : new Date(new Date().setHours(23, 59, 59, 999));

    console.log(
      `[useMemo Statistics] Filtering between: ${startDate.toISOString()} and ${endDate.toISOString()}`
    );

    const filtered = orders.filter((order) => {
      const dateToCompare = order.orderDate;
      if (!dateToCompare) return false;

      let orderDateObj: Date | null = null;
      let isValidOrderDate = false;
      try {
        orderDateObj = new Date(dateToCompare);
        isValidOrderDate = !isNaN(orderDateObj.getTime());
      } catch (e) {}

      if (!isValidOrderDate) return false;

      return orderDateObj! >= startDate && orderDateObj! <= endDate;
    });

    console.log(
      `[useMemo Statistics] Filtered orders count: ${filtered.length}`
    );

    const statusData: ChartData[] = Object.values(OrderStatus)
      .map((status) => ({
        name: status,
        value: filtered.filter((order) => order.orderStatus === status).length
      }))
      .filter((item) => item.value > 0);

    const productData: ChartData[] = Object.values(ProductType)
      .map((type) => ({
        name: type,
        value: filtered.filter((order) => order.productType === type).length
      }))
      .filter((item) => item.value > 0);

    const paymentData: ChartData[] = Object.values(PaymentMethod)
      .map((method) => ({
        name: method,
        value: filtered.filter((order) => order.paymentMethod === method).length
      }))
      .filter((item) => item.value > 0);

    const revenue = filtered
      .map((order) => {
        if (order.paymentStatus === PaymentStatus.Pagado && order.totalPrice)
          return Number(order.totalPrice);
        if (order.depositAmount && Number(order.depositAmount) > 0)
          return Number(order.depositAmount);
        return 0;
      })
      .reduce((sum, amount) => sum + amount, 0);

    const pending = filtered
      .filter(
        (order) =>
          order.paymentStatus !== PaymentStatus.Pagado &&
          order.paymentStatus !== PaymentStatus.Reembolsado &&
          order.paymentStatus !== PaymentStatus.Cancelado
      )
      .reduce((sum, order) => {
        const total = Number(order.totalPrice || '0');
        const deposit = Number(order.depositAmount || '0');
        return sum + (total - deposit);
      }, 0);

    console.log('[useMemo Statistics] Processed Data:', {
      statusData,
      productData,
      paymentData,
      revenue,
      pending
    });
    return { statusData, productData, paymentData, revenue, pending };
  }, [orders, dateRange]);

  const handleRangeTypeChange = useCallback((value: string) => {
    const type = value as SelectedRangeType;
    setSelectedRangeType(type);

    const todayEnd = endOfToday();
    let fromDate: Date | undefined = undefined;
    let toDate: Date | undefined = undefined;

    switch (type) {
      case 'last7days':
        fromDate = startOfToday();
        fromDate.setDate(fromDate.getDate() - 6);
        toDate = todayEnd;
        break;
      case 'last30days':
        fromDate = startOfToday();
        fromDate.setDate(fromDate.getDate() - 29);
        toDate = todayEnd;
        break;
      case 'thisMonth':
        fromDate = startOfMonth(todayEnd);
        toDate = todayEnd;
        break;
      case 'lastMonth':
        const startOfThisMonth = startOfMonth(todayEnd);
        fromDate = startOfMonth(subMonths(startOfThisMonth, 1));
        toDate = endOfMonth(subMonths(startOfThisMonth, 1));
        break;
      case 'all':
        fromDate = undefined;
        toDate = undefined;
        break;
      case 'custom':
        return;
    }
    console.log('Setting new date range based on type:', type, {
      from: fromDate,
      to: toDate
    });
    setDateRange({ from: fromDate, to: toDate });
  }, []);

  const clearDates = () => {
    setDateRange({ from: undefined, to: undefined });
    setSelectedRangeType('all');
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <div className="flex space-x-4 mb-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={`sk-chart-${i}`}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent className="flex items-center justify-center h-[300px]">
                <Skeleton className="h-48 w-48 rounded-full" />
              </CardContent>
            </Card>
          ))}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-8 w-1/2" />
              </div>
              <div>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Estadísticas de Pedidos</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Filtrar por Fecha de Entrega
          </CardTitle>
          <CardDescription>
            Selecciona un periodo predefinido o un rango personalizado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <Label
              htmlFor="range-select"
              className="pt-2 sm:pt-0 whitespace-nowrap shrink-0"
            >
              Periodo:
            </Label>
            <Select
              value={selectedRangeType}
              onValueChange={handleRangeTypeChange}
            >
              <SelectTrigger
                id="range-select"
                className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:min-w-[180px]"
              >
                <SelectValue placeholder="Selecciona periodo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Siempre</SelectItem>
                <SelectItem value="last7days">Últimos 7 días</SelectItem>
                <SelectItem value="last30days">Últimos 30 días</SelectItem>
                <SelectItem value="thisMonth">Este mes</SelectItem>
                <SelectItem value="lastMonth">Mes anterior</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={clearDates}
              className="w-full sm:w-auto"
            >
              Limpiar Filtro
            </Button>
          </div>

          {selectedRangeType === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-4 border-t pt-4 animate-in fade-in duration-200">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-from"
                    variant={'outline'}
                    className={cn(
                      'w-full sm:w-[240px] justify-start text-left font-normal',
                      !dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      format(dateRange.from, 'PPP', { locale: es })
                    ) : (
                      <span>Fecha Inicio</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) =>
                      setDateRange((prev) => ({
                        ...prev,
                        from: date || undefined
                      }))
                    }
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-to"
                    variant={'outline'}
                    className={cn(
                      'w-full sm:w-[240px] justify-start text-left font-normal',
                      !dateRange.to && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? (
                      format(dateRange.to, 'PPP', { locale: es })
                    ) : (
                      <span>Fecha Fin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) =>
                      setDateRange((prev) => ({
                        ...prev,
                        to: date || undefined
                      }))
                    }
                    disabled={
                      dateRange.from ? { before: dateRange.from } : undefined
                    }
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pedidos por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {processedData?.statusData &&
            processedData.statusData.length > 0 ? (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={processedData.statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {processedData.statusData.map((entry, index) => (
                        <Cell
                          key={`cell-status-${index}`}
                          fill={COLORS_PIE[index % COLORS_PIE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value} pedidos`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground h-[250px] flex items-center justify-center">
                No hay datos para este periodo.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pedidos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {processedData?.productData &&
            processedData.productData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={processedData.productData}
                    margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis width={30} fontSize={12} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number) => `${value} pedidos`}
                    />
                    <Bar
                      dataKey="value"
                      fill={COLOR_BAR}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground h-[300px] flex items-center justify-center">
                No hay datos para este periodo.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Métodos de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            {processedData?.paymentData &&
            processedData.paymentData.length > 0 ? (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={processedData.paymentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {processedData.paymentData.map((entry, index) => (
                        <Cell
                          key={`cell-payment-${index}`}
                          fill={COLORS_PIE[index % COLORS_PIE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value} pedidos`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground h-[250px] flex items-center justify-center">
                No hay datos para este periodo.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
              Ingresos Registrados
            </h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR'
              }).format(processedData?.revenue ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Suma de pedidos pagados y señales recibidas.
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
              Importe Pendiente
            </h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR'
              }).format(processedData?.pending ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Suma de lo pendiente en pedidos no pagados/parciales.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
