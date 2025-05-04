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
import { deleteOrder } from '../../actions';
import { OrderStatus, Order as OrderType } from '@types';
import { Status } from '@/components/common/StatusCell';
import { cn } from '@/lib/utils';

interface OrderProps {
  order: OrderType;
  setOrders: React.Dispatch<React.SetStateAction<OrderType[]>>;
  showDetails: (order: OrderType) => void;
  editOrder: (order: OrderType) => void;
  uploadImages: (order: OrderType) => void;
  onStatusChange: (orderId: number, newStatus: OrderStatus) => Promise<void>;
  columnVisibility: Record<string, boolean>;
}

const availableColumns: {
  id: keyof OrderType | 'actions' | 'customerName' | 'customerContact';
  label: string;
  className?: string;
}[] = [
  { id: 'deliveryDate', label: 'Fecha de entrega' },
  { id: 'customer', label: 'Cliente' },
  { id: 'description', label: 'Descripción' },
  { id: 'orderStatus', label: 'Estado' },
  {
    id: 'totalPrice',
    label: 'Precio Total',
    className: 'hidden md:table-cell'
  },
  { id: 'productType', label: 'Producto', className: 'hidden md:table-cell' },
  { id: 'orderDate', label: 'Fecha Pedido', className: 'hidden md:table-cell' },
  { id: 'actions', label: 'Acciones' }
];

const columnRenderOrder: (keyof OrderType | 'actions' | 'customer')[] = [
  'deliveryDate',
  'customer',
  'description',
  'orderStatus',
  'totalPrice',
  'productType',
  'orderDate',
  'actions'
];

export function Order({
  order,
  setOrders,
  showDetails,
  editOrder,
  uploadImages,
  onStatusChange,
  columnVisibility
}: OrderProps) {
  const handleDelete = async () => {
    const customerName = order.customer?.name || `pedido ID ${order.id}`;
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar el pedido para ${customerName}?`
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
    key: keyof OrderType | 'actions' | 'customer'
  ): React.ReactNode => {
    switch (key) {
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
          <Status
            orderId={order.id!}
            currentStatus={order.orderStatus as OrderStatus}
            onStatusChange={onStatusChange}
          />
        ) : (
          '-'
        );
      case 'paymentStatus':
      case 'orderStatus':
        return order.orderStatus ? (
          <Status
            orderId={order.id!}
            currentStatus={order.paymentStatus as OrderStatus}
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
                    onClick={() => showDetails(order)}
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
