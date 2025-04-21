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
import { Customer } from './customer';
import { Customer as CustomerType } from '@types';
import { JSX } from 'react';

const CUSTOMERS_PER_PAGE = 5;

interface CustomersTableProps {
  customers: CustomerType[];
  offset: number;
  totalCustomers: number;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerType[]>>;
  editCustomer: (customer: CustomerType) => void;
  showDetails: (customer: CustomerType) => void;
}

export function CustomersTable({
  customers,
  offset,
  totalCustomers,
  setCustomers,
  editCustomer,
  showDetails
}: CustomersTableProps): JSX.Element {
  const router = useRouter();

  const prevPage = () =>
    router.push(
      `/clientes?offset=${Math.max(0, offset - CUSTOMERS_PER_PAGE)}`,
      { scroll: false }
    );

  const nextPage = () =>
    router.push(
      `/clientes?offset=${Math.min(offset + CUSTOMERS_PER_PAGE, totalCustomers)}`,
      { scroll: false }
    );

  const renderPaginationInfo = (): JSX.Element => {
    if (totalCustomers === 0) {
      return <>No hay clientes</>;
    }

    if (totalCustomers === 1) {
      return (
        <>
          Mostrando <strong>1</strong> cliente
        </>
      );
    }

    const start = Math.min(offset + 1, totalCustomers); // Asegurar que start no supere totalCustomers
    const end = Math.min(offset + CUSTOMERS_PER_PAGE, totalCustomers); // Último cliente en la página actual

    return (
      <>
        Mostrando{' '}
        <strong>
          {start}-{end}
        </strong>{' '}
        de <strong>{totalCustomers}</strong> clientes
      </>
    );
  };

  const renderTableHeaders = (): JSX.Element => (
    <TableHeader>
      <TableRow>
        <TableHead>Nombre</TableHead>
        <TableHead className="hidden lg:table-cell">Email</TableHead>
        <TableHead>Teléfono</TableHead>
        <TableHead>Fecha de alta</TableHead>
        <TableHead className="hidden md:table-cell">Notas</TableHead>
        <TableHead>
          <span className="sr-only">Acciones</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
        <CardDescription>Gestiona los clientes de Aura Bakery</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          {renderTableHeaders()}
          <TableBody>
            {customers && customers.length > 0 ? (
              customers.map((customer) => (
                <Customer
                  showDetails={showDetails}
                  key={customer.id}
                  customer={customer}
                  setCustomers={setCustomers}
                  editCustomer={editCustomer}
                />
              ))
            ) : (
              <TableRow>
                <TableHead colSpan={6} className="text-center">
                  No hay clientes disponibles
                </TableHead>
              </TableRow>
            )}
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
              disabled={offset + CUSTOMERS_PER_PAGE >= totalCustomers}
            >
              Siguiente
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}
