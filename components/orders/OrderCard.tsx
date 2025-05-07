'use client';

import React from 'react';
import Link from 'next/link';
import { Order, OrderStatus, PaymentStatus } from '@types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, displayDate } from '@/lib/utils';
import { CalendarDays, User, Package, Euro, Eye } from 'lucide-react';
import { Status as PaymentStatusCell } from '../common/PaymentStatusCell';
import { Status as OrderStatusCell } from '../common/OrderStatusCell';

interface OrderCardProps {
  order: Order;
  handleUpdateStatus: (
    orderId: number,
    newStatus: OrderStatus | PaymentStatus
  ) => void;
}

export function OrderCard({ order, handleUpdateStatus }: OrderCardProps) {
  const totalPriceNum = Number(order.totalPrice || '0');
  const depositAmountNum = Number(order.depositAmount || '0');
  const pendingAmount = totalPriceNum - depositAmountNum;

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Pedido #{order.businessOrderNumber ?? order.id}</span>
          <OrderStatusCell
            orderId={order.id}
            currentStatus={order.orderStatus as OrderStatus}
            onStatusChange={handleUpdateStatus}
          />
        </CardTitle>
        <CardDescription className="flex items-center gap-1 pt-1 text-sm">
          <User className="h-3 w-3" />
          {order.customer?.name ?? 'Cliente Desconocido'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm pb-4">
        <Separator />
        <div className="flex items-center justify-between pt-2">
          <span className="text-muted-foreground flex items-center gap-1">
            <Package className="h-4 w-4" /> Producto:
          </span>
          <span
            className="font-medium text-right truncate ml-2"
            title={order.description ?? ''}
          >
            {order.description || '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-4 w-4" /> Entrega:
          </span>
          <span className="font-medium">
            {displayDate(order.deliveryDate, 'P')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Euro className="h-4 w-4" /> Total:
          </span>
          <span className="font-medium">{formatCurrency(totalPriceNum)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Estado Pago:</span>
          <PaymentStatusCell
            orderId={order.id}
            currentStatus={order.paymentStatus as PaymentStatus}
            onStatusChange={handleUpdateStatus}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="secondary"
          size="sm"
          className="w-full active:bg-gray-200"
          asChild
        >
          <Link href={`/app/pedidos/${order.id}`}>
            <Eye className="mr-2 h-4 w-4" /> Ver Detalles
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
