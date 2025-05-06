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
import { OrderRow } from './order';
import { OrderStatus, Order as OrderType, PaymentStatus } from '@types';
import { JSX } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessProfile } from '@/hooks/use-business-profile';
import { OrderCard } from '@/components/orders/OrderCard';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useDeviceType } from '@/hooks/use-device-type';

interface OrdersTableProps {
  orders: OrderType[];
  offset: number;
  limit: number;
  totalOrders: number;
  setOrders: React.Dispatch<React.SetStateAction<OrderType[]>>;
  editOrder: (order: OrderType) => void;
  uploadImages: (order: OrderType) => void;
  onStatusChange: (
    orderId: number,
    newStatus: OrderStatus | PaymentStatus
  ) => Promise<void>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (columnId: string) => void;
  pathname: string;
  onSortSelectChange: (value: string) => void;
}

const availableColumns: {
  id: keyof OrderType | 'actions' | 'customer' | 'businessOrderNumber';
  label: string;
  defaultVisible: boolean;
  canHide: boolean;
  className?: string;
  sortableId?: string;
}[] = [
  {
    id: 'businessOrderNumber',
    label: '#',
    defaultVisible: true,
    canHide: true,
    sortableId: 'id'
  },
  {
    id: 'deliveryDate',
    label: 'Fecha Entrega',
    defaultVisible: true,
    canHide: true,
    sortableId: 'deliveryDate'
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
    label: 'Total',
    defaultVisible: true,
    canHide: true,
    className: 'hidden md:table-cell',
    sortableId: 'totalPrice'
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
  uploadImages,
  onStatusChange,
  sortBy,
  sortOrder,
  onSortChange,
  pathname,
  onSortSelectChange
}: OrdersTableProps): JSX.Element {
  const router = useRouter();
  const device = useDeviceType();
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
        {availableColumns.map((column) => {
          if (!columnVisibility[column.id as string]) return null;

          const isSortable = !!column.sortableId;
          const isCurrentSortColumn = sortBy === column.sortableId;
          const sortIcon = isCurrentSortColumn ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="ml-2 h-3 w-3" />
            ) : (
              <ArrowDown className="ml-2 h-3 w-3" />
            )
          ) : isSortable ? (
            <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
          ) : null;

          return (
            <TableHead
              key={column.id as string}
              className={cn(column.className)}
            >
              {isSortable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => onSortChange(column.sortableId!)}
                >
                  {column.label}
                  {sortIcon}
                </Button>
              ) : column.id === 'actions' ? (
                <span className="sr-only">{column.label}</span>
              ) : (
                <span>{column.label}</span>
              )}
            </TableHead>
          );
        })}
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
        {device === 'desktop' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
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
        )}
      </CardHeader>
      <CardContent>
        <div className="hidden lg:block">
          <div className="overflow-x-auto relative border rounded-md">
            <Table>
              {renderTableHeaders()}
              <TableBody>
                {orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      setOrders={setOrders}
                      editOrder={editOrder}
                      uploadImages={uploadImages}
                      onStatusChange={onStatusChange}
                      columnVisibility={columnVisibility}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumnCount}
                      className="text-center h-24"
                    >
                      No hay pedidos que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
          {orders && orders.length > 0 ? (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                handleUpdateStatus={onStatusChange}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground col-span-1 sm:col-span-2 py-10">
              No hay pedidos que coincidan con los filtros.
            </p>
          )}
        </div>
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
