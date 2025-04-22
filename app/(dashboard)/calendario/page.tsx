'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  format,
  eachDayOfInterval,
  isSameDay,
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import OrderDetails from '@/app/(dashboard)/pedidos/order-details';
import { cn } from '@/lib/utils';

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
      <p className="font-medium truncate">{order.customerName}</p>
      <p className="text-gray-600 truncate">
        {order.description || order.productType}
      </p>
    </button>
  );
}

export default function WeeklyCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [ordersInWeek, setOrdersInWeek] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderToShow, setOrderToShow] = useState<Order | null>(null);

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const weekEnd = useMemo(
    () => endOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const daysInWeek = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  useEffect(() => {
    async function fetchWeeklyOrders() {
      setLoading(true);
      const startDateStr = format(weekStart, 'yyyy-MM-dd');
      const endDateStr = format(weekEnd, 'yyyy-MM-dd');
      console.log(`Workspaceing orders from ${startDateStr} to ${endDateStr}`);
      try {
        const response = await fetch(
          `/api/orders?startDate=${startDateStr}&endDate=${endDateStr}&limit=500`
        );
        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }
        const data = await response.json();
        setOrdersInWeek(data.orders || []);
      } catch (error) {
        console.error('Failed to fetch weekly orders:', error);
        setOrdersInWeek([]);
      } finally {
        setLoading(false);
      }
    }
    fetchWeeklyOrders();
  }, [weekStart, weekEnd]);

  const ordersByDay = useMemo(() => {
    const grouped: { [key: string]: Order[] } = {};
    for (const order of ordersInWeek) {
      if (!order.deliveryDate) continue;
      const deliveryDayStr = format(new Date(order.deliveryDate), 'yyyy-MM-dd');
      if (!grouped[deliveryDayStr]) {
        grouped[deliveryDayStr] = [];
      }
      grouped[deliveryDayStr].push(order);
    }
    return grouped;
  }, [ordersInWeek]);

  const goToPreviousWeek = () => {
    setCurrentDate(subDays(currentDate, 7));
  };

  const goToNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const showDetails = useCallback((order: Order) => {
    setOrderToShow(order);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOrderToShow(null);
    setIsModalOpen(false);
  }, []);

  const weekDisplayFormat = `dd MMM yy`; // Ajustado para posible mejor lectura
  const weekRangeString = `${format(weekStart, weekDisplayFormat, { locale: es })} - ${format(weekEnd, weekDisplayFormat, { locale: es })}`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Calendario Semanal de Entregas</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Semana Actual</CardTitle>
            <CardDescription>{weekRangeString}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
              aria-label="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-1 border-t">
              {' '}
              {/* Ajustado borde */}
              {[...Array(7)].map(
                (
                  _,
                  i // Skeleton para 7 días
                ) => (
                  <div key={i} className="border-b p-2 min-h-[100px]">
                    <Skeleton className={cn('h-5 w-1/2 mb-2')} />
                    <Skeleton className="h-10 w-full mb-1" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )
              )}
            </div>
          ) : (
            // --- CAMBIO PRINCIPAL AQUÍ ---
            // grid-cols-1 por defecto (móvil), md:grid-cols-7 para pantallas medianas y más grandes
            // Se quitan bordes laterales y se deja solo superior en contenedor e inferior en celdas
            <div className="grid grid-cols-1 md:grid-cols-7 border-t">
              {daysInWeek.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const ordersForDay = ordersByDay[dayStr] || [];
                const isCurrentDay = isToday(day);

                return (
                  // Aplicar borde derecho solo en pantallas md+ y no en el último elemento
                  <div
                    key={dayStr}
                    className="border-b p-2 min-h-[120px] flex flex-col md:border-r md:last:border-r-0"
                  >
                    <div
                      className={cn(
                        'text-center text-sm mb-1 pb-1 border-b',
                        isCurrentDay && 'font-bold text-blue-600'
                      )}
                    >
                      {/* Mostrar siempre nombre corto del día */}
                      <span className="inline">
                        {format(day, 'eee', { locale: es })}
                      </span>
                      <span className="ml-1">
                        {format(day, 'd', { locale: es })}
                      </span>
                    </div>
                    <div className="flex-grow overflow-y-auto space-y-1 py-1">
                      {ordersForDay.length > 0 ? (
                        ordersForDay.map((order) => (
                          <CalendarOrderCard
                            key={order.id}
                            order={order}
                            onClick={() => showDetails(order)}
                          />
                        ))
                      ) : (
                        <div className="h-full text-xs text-center text-gray-400 flex items-center justify-center"></div>
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
