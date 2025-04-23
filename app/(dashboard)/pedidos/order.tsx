import React from 'react';
import { Badge } from '@/components/ui/badge';
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
import { deleteOrder } from '../actions';
import { OrderStatus, Order as OrderType } from '@types';
import { Status } from '@/components/common/StatusCell';

interface OrderProps {
  order: OrderType;
  setOrders: React.Dispatch<React.SetStateAction<OrderType[]>>;
  showDetails: (order: OrderType) => void;
  editOrder: (order: OrderType) => void;
  uploadImages: (order: OrderType) => void;
  onStatusChange: (orderId: number, newStatus: OrderStatus) => Promise<void>;
  columnVisibility: Record<string, boolean>;
}

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
    if (
      !confirm(
        `Are you sure you want to delete the order for ${order.customerName}?`
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
      alert('Could not delete the order. Please try again.');
    }
  };

  const getFormattedValue = (
    key: keyof OrderType | 'actions'
  ): React.ReactNode => {
    switch (key) {
      case 'orderDate':
        return order.orderDate
          ? new Date(order.orderDate).toLocaleDateString('es-ES')
          : '-';
      case 'amount':
      case 'totalPrice':
        const value = Number(order[key]);
        return isNaN(value) ? '-' : `${value.toFixed(2)}€`;
      case 'orderStatus':
        return order.orderStatus ? (
          <Status
            orderId={order.id!}
            currentStatus={order.orderStatus}
            onStatusChange={onStatusChange}
          />
        ) : (
          '-'
        );
      case 'actions':
        return null;
      default:
        return order[key as keyof OrderType] !== null &&
          order[key as keyof OrderType] !== undefined
          ? String(order[key as keyof OrderType])
          : '-';
    }
  };

  const columnRenderOrder: (keyof OrderType | 'actions')[] = [
    'customerName',
    'customerContact',
    'description',
    'orderStatus',
    'amount',
    'productType',
    'orderDate',
    'actions'
  ];

  const availableColumns: {
    id: keyof OrderType | 'actions';
    label: string;
    className?: string;
  }[] = [
    { id: 'customerName', label: 'Cliente' },
    {
      id: 'customerContact',
      label: 'Contacto',
      className: 'hidden lg:table-cell'
    },
    { id: 'description', label: 'Descripción' },
    { id: 'orderStatus', label: 'Estado' },
    { id: 'amount', label: 'Precio', className: 'hidden md:table-cell' },
    { id: 'productType', label: 'Producto', className: 'hidden md:table-cell' },
    {
      id: 'orderDate',
      label: 'Fecha Pedido',
      className: 'hidden md:table-cell'
    },
    { id: 'actions', label: 'Acciones' }
  ];

  return (
    <TableRow key={order.id}>
      {columnRenderOrder.map((colId) => {
        const colDef = availableColumns.find((c) => c.id === colId);
        return columnVisibility[colId] ? (
          <TableCell key={colId} className={colDef?.className}>
            {colId === 'actions' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
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
