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
import { deleteCustomer } from '../actions';
import { Customer as CustomerType } from '@types';

export function Customer({
  customer,
  setCustomers,
  showDetails,
  editCustomer
}: {
  customer: CustomerType;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerType[]>>;
  showDetails: (customer: CustomerType) => void;
  editCustomer: (customer: CustomerType) => void;
}) {
  const statusTranslations: Record<string, string> = {
    pendiente: 'bg-pending text-pending-text',
    preparando: 'bg-wip text-wip-text',
    listo: 'bg-ready text-ready-text',
    entregado: 'bg-delivered  text-delivered-text'
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell className="hidden lg:table-cell">{customer.email}</TableCell>
      <TableCell>{customer.phone}</TableCell>

      <TableCell className="hidden md:table-cell">
        {' '}
        {new Date(customer.registrationDate).toLocaleDateString('es-ES')}
      </TableCell>
      <TableCell className="hidden md:table-cell">{customer.notes}</TableCell>
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
                  showDetails(customer);
                }}
              >
                Ver detalles
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button
                onClick={() => {
                  editCustomer(customer);
                }}
              >
                Editar
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button
                onClick={async () => {
                  try {
                    await deleteCustomer(customer.id);

                    setCustomers((customers) =>
                      customers.filter((c) => c.id !== c.id)
                    );
                  } catch (error) {
                    console.error('Error al eliminar el cliente:', error);
                    alert(
                      'No se pudo eliminar el cliente. Inténtalo de nuevo.'
                    );
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
