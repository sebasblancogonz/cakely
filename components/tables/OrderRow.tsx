'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Eye, MoreHorizontal, Pen, Trash, Upload } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { deleteOrder } from '../../app/(dashboard)/actions';
import { OrderStatus, Order as OrderType, PaymentStatus } from '@types';
import { Status as OrderStatusCell } from '@/components/common/OrderStatusCell';
import { Status as PaymentStatusCell } from '@/components/common/PaymentStatusCell';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OrderProps {
  order: OrderType;
  setOrders: React.Dispatch<React.SetStateAction<OrderType[]>>;
  editOrder: (order: OrderType) => void;
  uploadImages: (order: OrderType) => void;
  onStatusChange: (
    orderId: number,
    newStatus: OrderStatus | PaymentStatus
  ) => Promise<void>;
  columnVisibility: Record<string, boolean>;
}

const availableColumns: {
  id: keyof OrderType | 'actions' | 'customerName' | 'customerContact';
  label: string;
  className?: string;
}[] = [
  { id: 'businessOrderNumber', label: '#' },
  { id: 'deliveryDate', label: 'Fecha de entrega' },
  { id: 'customer', label: 'Cliente' },
  { id: 'description', label: 'Descripción' },
  { id: 'orderStatus', label: 'Estado' },
  { id: 'paymentStatus', label: 'Estado de pago' },
  {
    id: 'totalPrice',
    label: 'Precio Total',
    className: 'hidden md:table-cell'
  },
  { id: 'productType', label: 'Producto', className: 'hidden md:table-cell' },
  { id: 'actions', label: 'Acciones' }
];

const columnRenderOrder: (keyof OrderType | 'actions' | 'customer')[] = [
  'businessOrderNumber',
  'deliveryDate',
  'customer',
  'description',
  'orderStatus',
  'paymentStatus',
  'totalPrice',
  'productType',
  'actions'
];

export function OrderRow({
  order,
  setOrders,
  editOrder,
  uploadImages,
  onStatusChange,
  columnVisibility
}: OrderProps) {
  const router = useRouter();
  const handleDelete = async () => {
    const customerName = order.customer?.name || `pedido ID ${order.id}`;
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar el pedido de ${customerName}?`
      )
    ) {
      return;
    }
    try {
      await deleteOrder(order.id!);
      setOrders((currentOrders) =>
        currentOrders.filter((o) => o.id !== order.id)
      );
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('No se pudo eliminar el pedido. Inténtalo de nuevo.');
    }
  };

  const getFormattedValue = (
    key: keyof OrderType | 'actions' | 'customer' | 'businessOrderNumber'
  ): React.ReactNode => {
    switch (key) {
      case 'businessOrderNumber':
        return order.businessOrderNumber;
      case 'customer':
        return order.customer?.name;
      case 'orderDate':
      case 'deliveryDate':
        const dateValue = order[key];
        return dateValue
          ? new Date(dateValue).toLocaleDateString('es-ES')
          : '-';
      case 'amount':
      case 'totalPrice':
        const value = order[key];
        const numValue = Number(value);
        return isNaN(numValue) ? '-' : `${numValue.toFixed(2)}€`;
      case 'orderStatus':
        return order.orderStatus ? (
          <OrderStatusCell
            orderId={order.id!}
            currentStatus={order.orderStatus as OrderStatus}
            onStatusChange={onStatusChange}
          />
        ) : (
          '-'
        );
      case 'paymentStatus':
        return order.paymentStatus ? (
          <PaymentStatusCell
            orderId={order.id!}
            currentStatus={order.paymentStatus as PaymentStatus}
            onStatusChange={onStatusChange}
          />
        ) : (
          '-'
        );
      case 'actions':
        return null;
      default:
        const orderKey = key as keyof OrderType;
        return order[orderKey] !== null && order[orderKey] !== undefined
          ? String(order[orderKey])
          : '-';
    }
  };

  return (
    <TableRow key={order.id}>
      {columnRenderOrder.map((colId) => {
        const colDef = availableColumns.find((c) => c.id === colId);
        return columnVisibility[colId] ? (
          <TableCell key={colId} className={cn(colDef?.className)}>
            {colId === 'actions' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-haspopup="true"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/pedidos/${order.id}`)}
                    className="cursor-pointer"
                  >
                    <Eye size={15} className="mr-2" /> Ver detalles
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => uploadImages(order)}
                    className="cursor-pointer"
                  >
                    <Upload size={15} className="mr-2" /> Subir imágenes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => editOrder(order)}
                    className="cursor-pointer"
                  >
                    <Pen size={15} className="mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash size={15} className="mr-2" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              getFormattedValue(colId)
            )}
          </TableCell>
        ) : null;
      })}
    </TableRow>
  );
}
