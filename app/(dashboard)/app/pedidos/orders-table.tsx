'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Order } from './order';
import { OrderStatus, Order as OrderType, PaymentStatus } from '@types';
import { JSX } from 'react';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessProfile } from '@/hooks/use-business-profile';

interface OrdersTableProps {
  orders: OrderType[];
  offset: number;
  limit: number;
  totalOrders: number;
  setOrders: React.Dispatch<React.SetStateAction<OrderType[]>>;
  editOrder: (order: OrderType) => void;
  showDetails: (order: OrderType) => void;
  uploadImages: (order: OrderType) => void;
  onStatusChange: (
    orderId: number,
    newStatus: OrderStatus | PaymentStatus
  ) => Promise<void>;
}

const availableColumns: {
  id: keyof OrderType | 'actions' | 'customer';
  label: string;
  defaultVisible: boolean;
  canHide: boolean;
  className?: string;
}[] = [
  {
    id: 'deliveryDate',
    label: 'Fecha Entrega',
    defaultVisible: true,
    canHide: true
  },
  { id: 'customer', label: 'Cliente', defaultVisible: true, canHide: false },
  {
    id: 'description',
    label: 'Descripción',
    defaultVisible: true,
    canHide: true
  },
  { id: 'orderStatus', label: 'Estado', defaultVisible: true, canHide: false },
  {
    id: 'paymentStatus',
    label: 'Estado de pago',
    defaultVisible: true,
    canHide: false
  },
  {
    id: 'totalPrice',
    label: 'Precio Total',
    defaultVisible: true,
    canHide: true,
    className: 'hidden md:table-cell'
  },
  {
    id: 'productType',
    label: 'Producto',
    defaultVisible: true,
    canHide: true,
    className: 'hidden md:table-cell'
  },
  { id: 'actions', label: 'Acciones', defaultVisible: true, canHide: false }
];

const getDefaultVisibility = () => {
  const defaultState: Record<string, boolean> = {};
  availableColumns.forEach((col) => {
    defaultState[col.id as string] = col.defaultVisible;
  });
  return defaultState;
};

export function OrdersTable({
  orders,
  offset,
  limit,
  totalOrders,
  setOrders,
  editOrder,
  showDetails,
  uploadImages,
  onStatusChange
}: OrdersTableProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile } = useBusinessProfile();
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(getDefaultVisibility());

  const navigate = useCallback(
    (newOffset: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('offset', newOffset.toString());
      params.set('limit', limit.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, limit, router, pathname]
  );

  const prevPage = useCallback(() => {
    navigate(Math.max(0, offset - limit));
  }, [navigate, offset, limit]);

  const nextPage = useCallback(() => {
    navigate(offset + limit);
  }, [navigate, offset, limit]);

  const renderPaginationInfo = (): JSX.Element => {
    if (totalOrders === 0) return <>No hay pedidos</>;
    if (totalOrders === 1)
      return (
        <>
          Mostrando <strong>1</strong> pedido
        </>
      );
    const start = Math.min(offset + 1, totalOrders);
    const end = Math.min(offset + limit, totalOrders);
    return (
      <>
        Mostrando{' '}
        <strong>
          {start}-{end}
        </strong>{' '}
        de <strong>{totalOrders}</strong> pedidos
      </>
    );
  };

  const visibleColumnCount = useMemo(() => {
    return availableColumns.filter((col) => columnVisibility[col.id as string])
      .length;
  }, [columnVisibility]);

  const renderTableHeaders = (): JSX.Element => (
    <TableHeader>
      <TableRow>
        {availableColumns.map((column) =>
          columnVisibility[column.id as string] ? (
            <TableHead
              key={column.id as string}
              className={cn(column.className)}
            >
              {column.id === 'actions' ? (
                <span className="sr-only">{column.label}</span>
              ) : (
                column.label
              )}
            </TableHead>
          ) : null
        )}
      </TableRow>
    </TableHeader>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Pedidos</CardTitle>
          <CardDescription>
            Gestiona los pedidos de {profile?.name ?? 'tu negocio'}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-8 gap-1">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Columnas</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mostrar/Ocultar Columnas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableColumns.map((column) => {
              if (!column.canHide) return null;

              return (
                <DropdownMenuCheckboxItem
                  key={column.id as string}
                  className="capitalize"
                  checked={columnVisibility[column.id as string]}
                  onCheckedChange={(value) =>
                    setColumnVisibility((prev) => ({
                      ...prev,
                      [column.id as string]: !!value
                    }))
                  }
                  disabled={!column.canHide}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <Table>
          {renderTableHeaders()}
          <TableBody>
            {orders && orders.length > 0 ? (
              orders.map((order) => (
                <Order
                  key={order.id}
                  order={order}
                  showDetails={showDetails}
                  setOrders={setOrders}
                  editOrder={editOrder}
                  uploadImages={uploadImages}
                  onStatusChange={onStatusChange}
                  columnVisibility={columnVisibility}
                />
              ))
            ) : (
              <TableRow key="no-orders-row">
                <TableCell
                  colSpan={visibleColumnCount}
                  className="text-center h-24"
                >
                  No hay pedidos disponibles
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="flex items-center w-full justify-between">
          <div className="text-xs text-muted-foreground">
            {renderPaginationInfo()}
          </div>
          <div className="flex">
            <Button
              onClick={prevPage}
              variant="outline"
              size="sm"
              disabled={offset === 0}
            >
              Anterior
            </Button>
            <Button
              onClick={nextPage}
              variant="outline"
              size="sm"
              className="ml-2"
              disabled={offset + limit >= totalOrders}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
