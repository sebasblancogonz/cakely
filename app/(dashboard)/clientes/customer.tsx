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
import Link from 'next/link';

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
  return (
    <TableRow>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell className="hidden lg:table-cell">{customer.email}</TableCell>
      <TableCell>{customer.phone}</TableCell>

      <TableCell className="md:table-cell">
        {new Date(customer.registrationDate).toLocaleDateString('es-ES')}
      </TableCell>
      <TableCell>
        <>
          <Link
            className="text-blue-500"
            target="_blank"
            rel="noreferrer noopener"
            href={'https://wa.me/' + customer.phone}
          >
            WhatsApp
          </Link>
          {customer.instagramHandle && (
            <>
              {' '}
              |{' '}
              <Link
                target="_blank"
                className="text-blue-500"
                rel="noreferrer noopener"
                href={'https://ig.me/m/' + customer.instagramHandle}
              >
                Instagram
              </Link>
            </>
          )}
        </>
      </TableCell>
      <TableCell className="hidden lg:table-cell">{customer.notes}</TableCell>
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
