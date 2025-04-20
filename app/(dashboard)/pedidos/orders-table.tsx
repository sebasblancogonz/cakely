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
import { useRouter } from 'next/navigation';
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
  handleUpdateStatus: (orderId: number, newStatus: OrderStatus) => void;
}

export function OrdersTable({
  orders,
  offset,
  totalOrders,
  setOrders,
  editOrder,
  showDetails,
  uploadImages,
  handleUpdateStatus
}: OrdersTableProps): JSX.Element {
  const router = useRouter();

  const prevPage = () => router.back();
  const nextPage = () =>
    router.push(`/pedidos?offset=${offset}`, { scroll: false });

  const renderPaginationInfo = (): JSX.Element => {
    if (totalOrders === 1) {
      return (
        <>
          Mostrando <strong>1</strong> pedido
        </>
      );
    }

    return (
      <>
        Mostrando{' '}
        <strong>
          {Math.max(1, offset + 1)}-
          {Math.min(offset + orders.length, totalOrders)}
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
            {orders.map((order) => (
              <Order
                key={order.id}
                order={order}
                showDetails={showDetails}
                setOrders={setOrders}
                editOrder={editOrder}
                uploadImages={uploadImages}
                handleUpdateStatus={handleUpdateStatus}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <form className="flex items-center w-full justify-between">
          <div className="text-xs text-muted-foreground">
            {renderPaginationInfo()}
          </div>
          <div className="flex">
            <Button
              formAction={prevPage}
              variant="ghost"
              size="sm"
              type="submit"
              disabled={offset === 0}
            >
              Anterior
            </Button>
            <Button
              formAction={nextPage}
              variant="ghost"
              size="sm"
              type="submit"
              disabled={offset + ORDERS_PER_PAGE >= totalOrders}
            >
              Siguiente
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}
