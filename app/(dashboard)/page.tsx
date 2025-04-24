'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
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

const COLORS_PIE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
const COLOR_BAR = '#82ca9d';

type ChartData = { name: string; value: number };

export default function StatisticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined
  });

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
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const processedData = useMemo(() => {
    if (!orders) return null;

    const filtered = orders.filter((order) => {
      if (!order.orderDate) return false;
      const orderDate = new Date(order.orderDate);
      const { from, to } = dateRange;
      const startDate = from
        ? new Date(from.setHours(0, 0, 0, 0))
        : new Date('1900-01-01');
      const endDate = to ? new Date(to.setHours(23, 59, 59, 999)) : new Date();
      return orderDate >= startDate && orderDate <= endDate;
    });

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

    const revenue = filtered.reduce(
      (sum, order) => sum + (Number(order.totalPrice) || 0),
      0
    );

    const pending = filtered
      .filter((order) => order.paymentStatus === PaymentStatus.Pendiente)
      .reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);

    return { statusData, productData, paymentData, revenue, pending };
  }, [orders, dateRange]);

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
          <CardTitle className="text-lg">Filtrar por Fecha</CardTitle>
          <CardDescription>
            Selecciona un rango de fechas para ver las estadísticas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
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
                  setDateRange((prev) => ({ ...prev, from: date || undefined }))
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
                  setDateRange((prev) => ({ ...prev, to: date || undefined }))
                }
                disabled={
                  dateRange.from ? { before: dateRange.from } : undefined
                }
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            onClick={() => setDateRange({ from: undefined, to: undefined })}
            className="w-full sm:w-auto"
          >
            Limpiar
          </Button>
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
                    <Tooltip formatter={(value) => `${value} pedidos`} />
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
            <CardTitle className="text-lg">
              Pedidos por Tipo de Producto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processedData?.productData &&
            processedData.productData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={processedData.productData}
                    margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis width={30} fontSize={12} />
                    <Tooltip formatter={(value) => `${value} pedidos`} />
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
                    <Tooltip formatter={(value) => `${value} pedidos`} />
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
          <CardTitle className="text-lg">Resumen Financiero</CardTitle>
          <CardDescription>
            Ingresos totales y pagos pendientes para el periodo seleccionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground">
              Ingresos Totales
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR'
              }).format(processedData?.revenue ?? 0)}
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground">
              Pagos Pendientes
            </h3>
            <p className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR'
              }).format(processedData?.pending ?? 0)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
