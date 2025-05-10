'use client';

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
import { deleteCustomer } from '../../app/(dashboard)/actions';
import { Customer as CustomerType } from '@types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from '../ui/alert-dialog';

export function Customer({
  customer,
  setCustomers,
  editCustomer
}: {
  customer: CustomerType;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerType[]>>;
  editCustomer: (customer: CustomerType) => void;
}) {
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);

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
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push(`/clientes/${customer.id}`)}
            >
              Ver detalles
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
                    setShowAlert(true);
                  }
                }}
              >
                Eliminar
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogTitle>Error</AlertDialogTitle>
          <AlertDialogDescription>
            No se pudo eliminar el cliente. Inténtalo de nuevo.
          </AlertDialogDescription>
          <AlertDialogCancel>Cerrar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </TableRow>
  );
}
