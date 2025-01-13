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
import { SelectOrder } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Order } from './order';

export function OrdersTable({
  orders,
  offset,
  totalOrders
}: {
  orders: SelectOrder[];
  offset: number;
  totalOrders: number;
}) {
  let router = useRouter();
  let ordersPerPage = 5;

  function prevPage() {
    router.back();
  }

  function nextPage() {
    router.push(`/orders?offset=${offset}`, { scroll: false });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos</CardTitle>
        <CardDescription>
          Gestiona los pedidos de Aura: Cookies and Cakes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {/* Agregar columna cliente */}
              {/* borrar columna image */}
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Precio</TableHead>
              {/* borrar columna total sales */}
              <TableHead className="hidden md:table-cell">
                Total Sales
              </TableHead>
              <TableHead className="hidden md:table-cell">
                Fecha del pedido
              </TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <Order key={order.id} order={order} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <form className="flex items-center w-full justify-between">
          <div className="text-xs text-muted-foreground">
            Mostrando{' '}
            <strong>
              {Math.max(1, offset + 1)}-
              {Math.min(offset + ordersPerPage, totalOrders)}
            </strong>{' '}
            de <strong>{totalOrders}</strong> pedidos
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
              disabled={offset + ordersPerPage >= totalOrders}
            >
              Siguiente
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}
