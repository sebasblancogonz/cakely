// OrdersTable.tsx

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
import { JSX, useCallback } from 'react'; // Import useCallback

// Removed ORDERS_PER_PAGE constant

interface OrdersTableProps {
  orders: OrderType[];
  offset: number;
  limit: number; // Changed from ORDERS_PER_PAGE/hardcoded value
  totalOrders: number;
  setOrders: React.Dispatch<React.SetStateAction<OrderType[]>>;
  editOrder: (order: OrderType) => void;
  showDetails: (order: OrderType) => void;
  uploadImages: (order: OrderType) => void;
  onStatusChange: (orderId: number, newStatus: OrderStatus) => Promise<void>;
}

export function OrdersTable({
  orders,
  offset,
  limit, // Receive limit as a prop
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

  const navigate = useCallback(
    (newOffset: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('offset', newOffset.toString());
      params.set('limit', limit.toString()); // Preserve current limit
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, limit, router, pathname]
  ); // Add dependencies

  const prevPage = useCallback(() => {
    navigate(Math.max(0, offset - limit));
  }, [navigate, offset, limit]);

  const nextPage = useCallback(() => {
    // Calculate offset for the *start* of the next page
    navigate(offset + limit);
  }, [navigate, offset, limit]);

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
    // Use limit prop here
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
              // Use limit prop in disabled logic
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
