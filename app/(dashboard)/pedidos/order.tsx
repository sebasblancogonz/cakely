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
import { Status } from '../common/StatusCell';

export function Order({
  order,
  setOrders,
  showDetails,
  editOrder,
  uploadImages,
  onStatusChange
}: {
  order: OrderType;
  setOrders: React.Dispatch<React.SetStateAction<OrderType[]>>;
  showDetails: (order: OrderType) => void;
  editOrder: (order: OrderType) => void;
  uploadImages: (order: OrderType) => void;
  onStatusChange: (orderId: number, newStatus: OrderStatus) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{order.customerName}</TableCell>
      <TableCell className="hidden lg:table-cell">
        {order.customerContact}
      </TableCell>
      <TableCell>{order.description}</TableCell>
      <TableCell>
        <Status
          orderId={order.id!}
          currentStatus={order.orderStatus}
          onStatusChange={onStatusChange}
        />
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
              <div className="flex gap-1 items-center justify-center">
                <Eye size={15} />
                <button onClick={() => showDetails(order)}>Ver detalles</button>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex gap-1 items-center justify-center">
                <Upload size={15} />
                <button onClick={() => uploadImages(order)}>
                  Subir imágenes
                </button>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex gap-1 text-blue-600 items-center justify-center">
                <Pen size={'15'} />
                <button
                  onClick={() => {
                    editOrder(order);
                  }}
                >
                  Editar
                </button>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex gap-1 text-red-600 items-center justify-center">
                <Trash size={'15'} />
                <button
                  onClick={async () => {
                    try {
                      await deleteOrder(order.id);

                      setOrders((orders) =>
                        orders.filter((o) => o.id !== order.id)
                      );
                    } catch (error) {
                      console.error('Error al eliminar el pedido:', error);
                      alert(
                        'No se pudo eliminar el pedido. Inténtalo de nuevo.'
                      );
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
