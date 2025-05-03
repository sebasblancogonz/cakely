'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  format,
  eachDayOfInterval,
  isToday,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import { Order, OrderStatus } from '@types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Modal from '@/components/common/Modal';
import OrderDetails from '@/app/(dashboard)/app/pedidos/order-details';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ViewMode = 'week' | 'month';

function CalendarOrderCard({
  order,
  onClick
}: {
  order: Order;
  onClick: () => void;
}) {
  const statusColor =
    order.orderStatus === OrderStatus.ready
      ? 'bg-green-100 border-green-300'
      : order.orderStatus === OrderStatus.pending
        ? 'bg-yellow-100 border-yellow-300'
        : order.orderStatus === OrderStatus.processing
          ? 'bg-blue-100 border-blue-300'
          : order.orderStatus === OrderStatus.delivered
            ? 'bg-gray-100 border-gray-300'
            : 'bg-gray-50 border-gray-200';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-1.5 mb-1 text-left text-xs border rounded shadow-sm hover:shadow-md transition-shadow duration-150',
        statusColor
      )}
    >
      <p className="font-medium truncate">{order.customer?.name}</p>
      <p className="text-gray-600 truncate">
        {order.description || order.productType}
      </p>
    </button>
  );
}

export default function OrdersCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [ordersInPeriod, setOrdersInPeriod] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderToShow, setOrderToShow] = useState<Order | null>(null);

  const { periodStart, periodEnd } = useMemo(() => {
    if (viewMode === 'week') {
      return {
        periodStart: startOfWeek(currentDate, { weekStartsOn: 1 }),
        periodEnd: endOfWeek(currentDate, { weekStartsOn: 1 })
      };
    } else {
      return {
        periodStart: startOfMonth(currentDate),
        periodEnd: endOfMonth(currentDate)
      };
    }
  }, [currentDate, viewMode]);

  const daysToDisplay = useMemo(() => {
    if (viewMode === 'week') {
      return eachDayOfInterval({ start: periodStart, end: periodEnd });
    } else {
      const monthStartWeek = startOfWeek(periodStart, { weekStartsOn: 1 });
      const monthEndWeek = endOfWeek(periodEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: monthStartWeek, end: monthEndWeek });
    }
  }, [periodStart, periodEnd, viewMode]);

  useEffect(() => {
    async function fetchOrdersForPeriod() {
      setLoading(true);
      const startDateStr = format(periodStart, 'yyyy-MM-dd');
      const endDateStr = format(periodEnd, 'yyyy-MM-dd');
      console.log(`Workspaceing orders from ${startDateStr} to ${endDateStr}`);
      try {
        const response = await fetch(
          `/api/orders?startDate=${startDateStr}&endDate=${endDateStr}&limit=1000`
        );
        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }
        const data = await response.json();
        setOrdersInPeriod(data.orders || []);
      } catch (error) {
        console.error('Failed to fetch orders for period:', error);
        setOrdersInPeriod([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrdersForPeriod();
  }, [periodStart, periodEnd]);

  const ordersByDay = useMemo(() => {
    const grouped: { [key: string]: Order[] } = {};
    for (const order of ordersInPeriod) {
      if (!order.deliveryDate) continue;
      const deliveryDayStr = format(new Date(order.deliveryDate), 'yyyy-MM-dd');
      if (!grouped[deliveryDayStr]) {
        grouped[deliveryDayStr] = [];
      }
      grouped[deliveryDayStr].push(order);
    }
    return grouped;
  }, [ordersInPeriod]);

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      setCurrentDate(
        viewMode === 'week'
          ? addDays(currentDate, 7)
          : addMonths(currentDate, 1)
      );
    } else {
      setCurrentDate(
        viewMode === 'week'
          ? subDays(currentDate, 7)
          : subMonths(currentDate, 1)
      );
    }
  };

  const showDetails = useCallback((order: Order) => {
    setOrderToShow(order);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOrderToShow(null);
    setIsModalOpen(false);
  }, []);

  const displayFormat = viewMode === 'week' ? `dd MMM yy` : `MMMM yyyy`;
  const rangeString =
    viewMode === 'week'
      ? `${format(periodStart, 'dd MMM', { locale: es })} - ${format(periodEnd, 'dd MMM, yyyy', { locale: es })}`
      : format(currentDate, 'MMMM yyyy', { locale: es });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Calendario de Entregas</h1>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 space-y-2 md:space-y-0">
          <div>
            <CardTitle className="text-lg capitalize">
              {viewMode === 'week' ? 'Semana' : 'Mes'}
            </CardTitle>
            <CardDescription>{rangeString}</CardDescription>
          </div>
          <div className="flex items-center gap-2 justify-between md:justify-end w-full md:w-auto">
            <ToggleGroup
              type="single"
              defaultValue="week"
              value={viewMode}
              onValueChange={(value) => {
                if (value) setViewMode(value as ViewMode);
              }}
              aria-label="View mode"
              size="sm"
            >
              <ToggleGroupItem value="week" aria-label="Vista semanal">
                <CalendarDays className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="month" aria-label="Vista mensual">
                <CalendarRange className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleNavigate('prev')}
                aria-label={
                  viewMode === 'week' ? 'Semana anterior' : 'Mes anterior'
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleNavigate('next')}
                aria-label={
                  viewMode === 'week' ? 'Semana siguiente' : 'Mes siguiente'
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div
              className={cn(
                'grid gap-px border-t border-l',
                viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'
              )}
            >
              {[...Array(viewMode === 'week' ? 7 : 35)].map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="border-r border-b p-2 min-h-[100px] bg-white dark:bg-background"
                >
                  <Skeleton className={cn('h-4 w-1/2 mb-2', i < 7 && 'h-5')} />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                'grid grid-cols-7 border-t border-l',
                viewMode === 'month' ? 'min-h-[600px]' : ''
              )}
            >
              {viewMode === 'month' &&
                daysToDisplay.slice(0, 7).map((day) => (
                  <div
                    key={`header-${format(day, 'eee')}`}
                    className="text-center font-medium text-sm p-2 border-r border-b bg-muted/50"
                  >
                    {format(day, 'eee', { locale: es })}
                  </div>
                ))}
              {daysToDisplay.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const ordersForDay = ordersByDay[dayStr] || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={dayStr}
                    className={cn(
                      'border-r border-b p-2 min-h-[100px] flex flex-col relative',
                      viewMode === 'month' && !isCurrentMonth
                        ? 'bg-muted/30 text-muted-foreground'
                        : 'bg-white dark:bg-background',
                      viewMode === 'week'
                        ? 'md:min-h-[120px]'
                        : 'min-h-[100px] md:min-h-[120px]'
                    )}
                  >
                    <div
                      className={cn(
                        'text-xs text-right mb-1',
                        isCurrentDay &&
                          'font-bold text-blue-600 rounded-full bg-blue-100 w-5 h-5 flex items-center justify-center p-1 float-right'
                      )}
                    >
                      {format(day, 'd', { locale: es })}
                    </div>
                    <div className="flex-grow overflow-y-auto space-y-1 pt-1 clear-both">
                      {ordersForDay.length > 0 ? (
                        ordersForDay.map((order) => (
                          <CalendarOrderCard
                            key={order.id}
                            order={order}
                            onClick={() => showDetails(order)}
                          />
                        ))
                      ) : (
                        <div className="h-full"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {orderToShow && <OrderDetails order={orderToShow} />}
      </Modal>
    </div>
  );
}
