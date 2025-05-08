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
import { Customer } from './CustomerRow';
import { Customer as CustomerType } from '@types';
import { JSX, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useBusinessProfile } from '@/hooks/use-business-profile';
import { CustomerCard } from './CustomerCard';

interface CustomersTableProps {
  customers: CustomerType[];
  offset: number;
  limit: number;
  totalCustomers: number;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerType[]>>;
  editCustomer: (customer: CustomerType) => void;
  showDetails: (customer: CustomerType) => void;
}

export function CustomersTable({
  customers,
  offset,
  limit,
  totalCustomers,
  setCustomers,
  editCustomer
}: CustomersTableProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile } = useBusinessProfile();

  const navigate = useCallback(
    (newOffset: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('offset', newOffset.toString());
      params.set('limit', limit.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, limit, router, pathname]
  );

  const prevPage = useCallback(() => {
    navigate(Math.max(0, offset - limit));
  }, [navigate, offset, limit]);

  const nextPage = useCallback(() => {
    navigate(offset + limit);
  }, [navigate, offset, limit]);

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
    const start = Math.min(offset + 1, totalCustomers);
    const end = Math.min(offset + limit, totalCustomers);
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
        <TableHead>Conversación</TableHead>
        <TableHead className="hidden lg:table-cell">Notas</TableHead>
        <TableHead>
          <span className="sr-only">Acciones</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  const visibleColumnCount = 7;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
        <CardDescription>
          Gestiona los clientes de {profile?.name ?? 'tu negocio'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="hidden lg:block">
          <div className="overflow-x-auto relative border rounded-md">
            <Table>
              {renderTableHeaders()}
              <TableBody>
                {customers && customers.length > 0 ? (
                  customers.map((customer) => (
                    <Customer
                      key={customer.id}
                      customer={customer}
                      setCustomers={setCustomers}
                      editCustomer={editCustomer}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableHead
                      colSpan={visibleColumnCount}
                      className="text-center h-24"
                    >
                      No hay clientes disponibles
                    </TableHead>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
          {customers && customers.length > 0 ? (
            customers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))
          ) : (
            <p className="text-center text-muted-foreground col-span-1 sm:col-span-2 py-10">
              No hay clientes disponibles
            </p>
          )}
        </div>
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
              disabled={offset + limit >= totalCustomers}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
