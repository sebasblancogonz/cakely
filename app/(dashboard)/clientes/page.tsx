'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { File, PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomersTable } from '@/components/customers/Customers';
import { Customer } from '@types';
import Modal from '@/components/common/Modal';
import CustomerForm from '@/components/forms/CustomerForm';
import CustomerDetails from '@/components/customers/CustomerDetails';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useBusinessProfile } from '@/hooks/use-business-profile';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile } = useBusinessProfile();
  const { toast } = useToast();

  const search = searchParams.get('q') || '';
  const offsetParam = Number(searchParams.get('offset')) || 0;
  const limitParam = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [offset, setOffset] = useState(offsetParam);
  const [pageSize, setPageSize] = useState(limitParam);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSearch, setCurrentSearch] = useState(search);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [customerToShow, setCustomerToShow] = useState<Customer | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  const editCustomer = useCallback((customer: Customer) => {
    setCustomerToEdit(customer);
    setIsModalOpen(true);
    setIsEditing(true);
    setIsCreating(false);
    setCustomerToShow(null);
  }, []);

  const showDetails = useCallback((customer: Customer) => {
    setCustomerToShow(customer);
    setIsModalOpen(true);
    setIsEditing(false);
    setIsCreating(false);
    setCustomerToEdit(null);
  }, []);

  const closeModal = useCallback(() => {
    setCustomerToEdit(null);
    setIsModalOpen(false);
    setIsEditing(false);
    setIsCreating(false);
    setCustomerToShow(null);
  }, []);

  useEffect(() => {
    setOffset(offsetParam);
    setPageSize(limitParam);
    setCurrentSearch(search);

    async function fetchCustomers() {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: search,
        offset: offsetParam.toString(),
        limit: limitParam.toString()
      });

      try {
        const response = await fetch(`/api/customers?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        const data = await response.json();
        setCustomers(data.customers || []);
        setTotalCustomers(data.totalCustomers || 0);
      } catch (error) {
        setCustomers([]);
        setTotalCustomers(0);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCustomers();
  }, [search, offsetParam, limitParam, refreshTrigger]);

  const updateQueryParams = useCallback(
    (newParams: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams);
      let resetOffset = false;
      Object.entries(newParams).forEach(([key, value]) => {
        if (key !== 'offset' && params.get(key) !== String(value)) {
          resetOffset = true;
        }
        if (value !== undefined && value !== null && String(value) !== '') {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });
      if (resetOffset || !('offset' in newParams)) {
        params.set('offset', '0');
      }
      if (!params.has('limit')) {
        params.set('limit', String(pageSize));
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname, pageSize]
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      updateQueryParams({ limit: value });
    },
    [updateQueryParams]
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateQueryParams({ q: currentSearch });
  };

  const downloadCSV = () => {
    if (customers.length === 0) {
      setShowAlert(true);
      return;
    }
    const headers = ['Nombre', 'Email', 'Teléfono', 'Instagram', 'Notas'];
    const csvRows = [
      headers.join(','),
      ...customers.map((customer) =>
        [
          customer.name,
          customer.email,
          customer.phone,
          customer.instagramHandle,
          customer.notes
        ]
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
    ].join('\n');
    const cleanValue = csvRows.replace(/[’]/g, "'");
    const blob = new Blob(['\ufeff' + cleanValue], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute(
      'download',
      `clientes_${profile?.name || 'negocio'}_${timestamp}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCustomerFormSuccess = (
    savedCustomer: Customer,
    wasEditing: boolean
  ) => {
    toast({
      title: 'Éxito',
      description: `Cliente "${savedCustomer.name}" ${wasEditing ? 'actualizado' : 'creado'}.`
    });
    closeModal();
    setRefreshTrigger(Date.now());
  };

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 mt-auto overflow-hidden">
      <form onSubmit={handleSearchSubmit} className="relative w-full md:w-1/3">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar clientes por nombre, email, teléfono..."
          className="pl-8 w-full"
          value={currentSearch}
          onChange={(e) => setCurrentSearch(e.target.value)}
        />
      </form>

      <div className="flex items-center justify-center flex-col gap-4 xs:w-full md:inline-flex md:justify-between md:items-center md:flex-row mb-4">
        <div></div>
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Clientes por página:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem
                    key={size}
                    value={size.toString()}
                    className="text-xs"
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={downloadCSV}
            size="sm"
            variant="outline"
            className="h-8 gap-1"
          >
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Exportar
            </span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1"
            onClick={() => {
              setCustomerToEdit(null);
              setIsCreating(true);
              setIsEditing(false);
              setCustomerToShow(null);
              setIsModalOpen(true);
            }}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Nuevo cliente
            </span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              {[...Array(pageSize)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-8 w-full" />
          </CardFooter>
        </Card>
      ) : (
        <CustomersTable
          customers={customers}
          setCustomers={setCustomers}
          editCustomer={editCustomer}
          showDetails={showDetails}
          offset={offset}
          limit={pageSize}
          totalCustomers={totalCustomers}
        />
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {isEditing || isCreating ? (
          <CustomerForm
            setIsModalOpen={setIsModalOpen}
            setCustomers={setCustomers}
            setIsEditing={setIsEditing}
            setIsCreating={setIsCreating}
            customerToEdit={isEditing ? customerToEdit : null}
            onSuccess={handleCustomerFormSuccess}
          />
        ) : customerToShow ? (
          <CustomerDetails customer={customerToShow} />
        ) : null}
      </Modal>
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogTitle className="text-lg font-medium text-center">
            No se puede exportar
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            No hay clientes disponibles para exportar.
          </AlertDialogDescription>
          <AlertDialogCancel>Cerrar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
