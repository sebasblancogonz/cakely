import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { deleteOrder } from '../actions';
import { Order as OrderType } from '@types';

export function Order({
  order,
  setOrders,
  showDetails,
  editOrder
}: {
  order: OrderType;
  setOrders: React.Dispatch<React.SetStateAction<OrderType[]>>;
  showDetails: (order: OrderType) => void;
  editOrder: (order: OrderType) => void;
}) {
  const statusTranslations: Record<string, string> = {
    pendiente: 'bg-pending text-pending-text',
    preparando: 'bg-wip text-wip-text',
    listo: 'bg-ready text-ready-text',
    entregado: 'bg-delivered  text-delivered-text'
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{order.customerName}</TableCell>
      <TableCell className="hidden lg:table-cell">
        {order.customerContact}
      </TableCell>
      <TableCell>{order.description}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize ${
            statusTranslations[
              order.orderStatus
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLocaleLowerCase()
            ]
          }`}
        >
          {order.orderStatus}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">{`${order.amount}€`}</TableCell>
      <TableCell className="hidden md:table-cell">
        {order.productType}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {new Date(order.orderDate).toLocaleDateString('es-ES')}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Mostrar menú</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem>
              <button
                onClick={() => {
                  showDetails(order);
                }}
              >
                Ver detalles
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button
                onClick={() => {
                  editOrder(order);
                }}
              >
                Editar
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button
                onClick={async () => {
                  try {
                    await deleteOrder(order.id);

                    setOrders((orders) =>
                      orders.filter((o) => o.id !== order.id)
                    );
                  } catch (error) {
                    console.error('Error al eliminar el pedido:', error);
                    alert('No se pudo eliminar el pedido. Inténtalo de nuevo.');
                  }
                }}
              >
                Eliminar
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
