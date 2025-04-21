'use client';

import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Order } from './order';
import { OrderStatus, Order as OrderType } from '@types';
import { JSX } from 'react';

const ORDERS_PER_PAGE = 5;

interface OrdersTableProps {
  orders: OrderType[];
  offset: number;
  totalOrders: number;
  setOrders: React.Dispatch<React.SetStateAction<OrderType[]>>;
  editOrder: (order: OrderType) => void;
  showDetails: (order: OrderType) => void;
  uploadImages: (order: OrderType) => void;
  onStatusChange: (orderId: number, newStatus: OrderStatus) => Promise<void>; // Renamed from handleUpdateStatus
}

export function OrdersTable({
  orders,
  offset,
  totalOrders,
  setOrders,
  editOrder,
  showDetails,
  uploadImages,
  onStatusChange // Renamed from handleUpdateStatus
}: OrdersTableProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const prevPage = () => {
    const params = new URLSearchParams(searchParams);
    const newOffset = Math.max(0, offset - ORDERS_PER_PAGE);
    params.set('offset', newOffset.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const nextPage = () => {
    const params = new URLSearchParams(searchParams);
    const newOffset = offset + ORDERS_PER_PAGE;
    params.set('offset', newOffset.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const renderPaginationInfo = (): JSX.Element => {
    if (totalOrders === 0) {
      return <>No hay pedidos</>;
    }
    if (totalOrders === 1) {
      return (
        <>
          Mostrando <strong>1</strong> pedido
        </>
      );
    }

    const start = Math.min(offset + 1, totalOrders);
    const end = Math.min(offset + ORDERS_PER_PAGE, totalOrders);

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

  const renderTableHeaders = (): JSX.Element => (
    <TableHeader>
      <TableRow>
        <TableHead>Cliente</TableHead>
        <TableHead className="hidden lg:table-cell">Contacto</TableHead>
        <TableHead>Descripción</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="hidden md:table-cell">Precio</TableHead>
        <TableHead className="hidden md:table-cell">Producto</TableHead>
        <TableHead className="hidden md:table-cell">Fecha del pedido</TableHead>
        <TableHead>
          <span className="sr-only">Acciones</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos</CardTitle>
        <CardDescription>Gestiona los pedidos de Aura Bakery</CardDescription>
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
                />
              ))
            ) : (
              <TableRow>
                <TableHead colSpan={8} className="text-center h-24">
                  No hay pedidos disponibles
                </TableHead>
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
              variant="ghost"
              size="sm"
              disabled={offset === 0}
            >
              Anterior
            </Button>
            <Button
              onClick={nextPage}
              variant="ghost"
              size="sm"
              className="ml-2"
              disabled={offset + ORDERS_PER_PAGE >= totalOrders}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
