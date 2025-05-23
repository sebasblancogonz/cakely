'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Orders } from '@/components/orders/Orders';
import { Order, OrderStatus, PaymentStatus } from '@types';
import Modal from '@/components/common/Modal';
import OrderForm from '@/components/forms/OrderForm';
import UploadImage from '@/components/common/MultiUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from '@/components/ui/card';
import { UpdateOrderFormData } from '@/lib/validators/orders';
import { Label } from '@/components/ui/label';
import UpdateOrderForm from '@/components/forms/UpdateOrderForm';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useBusinessProfile } from '@/hooks/use-business-profile';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const sortOptions = [
  { value: 'orderDate-desc', label: 'Fecha Pedido (Más Recientes)' },
  { value: 'orderDate-asc', label: 'Fecha Pedido (Más Antiguos)' },
  { value: 'upcoming-asc', label: 'Fecha Entrega (Próximas)' },
  { value: 'old-desc', label: 'Fecha Entrega (Antiguas)' },
  { value: 'totalPrice-desc', label: 'Precio (Mayor a Menor)' },
  { value: 'totalPrice-asc', label: 'Precio (Menor a Mayor)' },
  { value: 'customerName-asc', label: 'Cliente (A-Z)' },
  { value: 'customerName-desc', label: 'Cliente (Z-A)' },
  { value: 'businessOrderNumber-desc', label: 'Nº Pedido (Mayor a Menor)' },
  { value: 'businessOrderNumber-asc', label: 'Nº Pedido (Menor a Mayor)' }
];

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile } = useBusinessProfile();

  const query = searchParams.get('q') || '';
  const offset = Number(searchParams.get('offset')) || 0;
  const limit = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
  const status = searchParams.get('status') || 'all';
  const initialSortBy = searchParams.get('sortBy') || 'orderDate';
  const initialSortOrder = searchParams.get('sortOrder') || 'desc';
  const filterDate = searchParams.get('filterDate') || '';
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    initialSortOrder === 'asc' ? 'asc' : 'desc'
  );

  const [selectedTabValue, setSelectedTabValue] = useState(status);
  const [pageSizeValue, setPageSizeValue] = useState(limit);
  const [searchInput, setSearchInput] = useState(query);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const editOrder = useCallback((order: Order) => {
    setOrderToEdit(order);
    setIsEditing(true);
    setIsCreating(false);
    setIsUploadingImage(false);
    setIsModalOpen(true);
  }, []);

  const uploadImages = useCallback((order: Order) => {
    setOrderToEdit(order);
    setIsUploadingImage(true);
    setIsEditing(false);
    setIsCreating(false);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOrderToEdit(null);
    setIsModalOpen(false);
    setIsEditing(false);
    setIsCreating(false);
    setIsUploadingImage(false);
  }, []);
  const closeEditModal = () => {
    setIsModalOpen(false);
  };

  const handleUpdateSuccess = (updatedOrder: Order) => {
    console.log('Customer updated, refreshing data...', updatedOrder);
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
    closeEditModal();

    router.refresh();
    toast({
      title: 'Pedido Actualizado',
      description: `Los datos del pedido #${updatedOrder.businessOrderNumber} se han guardado.`
    });
  };

  useEffect(() => {
    setSelectedTabValue(status);
    setPageSizeValue(limit);
    setSearchInput(query);

    setIsLoading(true);
    const params = new URLSearchParams({
      search: query,
      offset: offset.toString(),
      limit: limit.toString(),
      status: status === 'all' ? '' : status,
      sortBy: sortBy,
      sortOrder: sortOrder,
      filterDate: filterDate
    });

    fetch(`/api/orders?${params.toString()}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(`API Error ${res.status}`)
      )
      .then((data) => {
        setOrders(data.orders || []);
        setTotalOrders(data.totalOrders || 0);
      })
      .catch((error) => {
        console.error('Failed fetch orders:', error);
        setOrders([]);
        setTotalOrders(0);
      })
      .finally(() => setIsLoading(false));
  }, [query, offset, limit, status, sortBy, sortOrder]);

  const handleUpdateStatus = useCallback(
    async (orderId: number, newStatus: OrderStatus | PaymentStatus) => {
      console.log(newStatus);
      let orderData: UpdateOrderFormData;
      console.log(
        `OrdersPage: Attempting to update order ${orderId} to status: ${newStatus}`
      );

      if (typeof newStatus === 'string' && newStatus in OrderStatus) {
        orderData = {
          orderStatus: newStatus as OrderStatus
        };
      } else if (typeof newStatus === 'string' && newStatus in PaymentStatus) {
        orderData = {
          paymentStatus: newStatus as PaymentStatus
        };
      } else {
        throw new Error('Invalid status type');
      }

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        const updatedOrderFromServer = await response.json();
        let finalUpdatedOrder: Order | null = null;
        if (
          Array.isArray(updatedOrderFromServer) &&
          updatedOrderFromServer.length > 0
        ) {
          finalUpdatedOrder = updatedOrderFromServer[0];
        } else if (
          typeof updatedOrderFromServer === 'object' &&
          updatedOrderFromServer !== null &&
          updatedOrderFromServer.id === orderId
        ) {
          finalUpdatedOrder = updatedOrderFromServer;
        }
        if (finalUpdatedOrder) {
          console.log(
            'OrdersPage: Status updated on server, updating local state with:',
            finalUpdatedOrder
          );
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? finalUpdatedOrder! : o))
          );
        } else {
          throw new Error('Unexpected API response format');
        }
      } catch (error) {
        console.error('Error updating status:', error);
        setShowAlert(true);
        setAlertMessage(
          `Error actualizando estado: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    []
  );

  const downloadCSV = useCallback(() => {
    const dataToExport = orders;
    if (dataToExport.length === 0) {
      setShowAlert(true);
      setAlertMessage('No hay pedidos en la página actual para exportar.');
      return;
    }

    const headers = [
      'Nombre del cliente',
      'Teléfono del cliente',
      'Email del cliente',
      'Instagram del cliente',
      'Descripción',
      'Cantidad',
      'Tipo de producto',
      'Fecha de entrega',
      'Estado del pedido',
      'Fecha del pedido',
      'Detalles de personalización',
      'Cantidad',
      'Tamaño o peso',
      'Sabor',
      'Información de alergias',
      'Precio total',
      'Estado de pago',
      'Método de pago',
      'Notas'
    ];

    const csvRows = [
      headers.join(','),
      ...orders.map((order) =>
        [
          order.customer!.name,
          order.customer!.phone,
          order.customer!.email,
          order.customer!.instagramHandle,
          order.description,
          order.amount,
          order.productType,
          order.deliveryDate!.toString(),
          order.orderStatus,
          order.orderDate.toString(),
          order.customizationDetails,
          order.quantity,
          order.sizeOrWeight,
          order.flavor,
          order.allergyInformation,
          order.totalPrice,
          order.paymentStatus,
          order.paymentMethod,
          order.notes
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
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
      `pedidos_${profile?.name || 'negocio'}_${timestamp}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [orders]);

  const updateQueryParams = useCallback(
    (newParams: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams);
      let resetOffset = false;
      Object.entries(newParams).forEach(([key, value]) => {
        if (key !== 'offset' && params.get(key) !== String(value ?? '')) {
          resetOffset = true;
        }
        if (value !== undefined && value !== null && String(value) !== '') {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });

      if (
        resetOffset ||
        (Object.keys(newParams).length > 0 && !('offset' in newParams))
      ) {
        params.set('offset', '0');
      }

      if (!params.has('limit')) {
        params.set('limit', String(pageSizeValue));
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname, pageSizeValue]
  );

  const handleTabChange = useCallback(
    (value: string) => {
      updateQueryParams({ status: value });
    },
    [updateQueryParams]
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      updateQueryParams({ limit: value });
    },
    [updateQueryParams]
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateQueryParams({ q: searchInput });
  };

  const handleSortChange = useCallback(
    (columnId: string) => {
      const newSortOrder =
        sortBy === columnId && sortOrder === 'asc' ? 'desc' : 'asc';
      setSortBy(columnId);
      setSortOrder(newSortOrder);
      updateQueryParams({ sortBy: columnId, sortOrder: newSortOrder });
    },
    [sortBy, sortOrder, updateQueryParams]
  );

  const handleSortSelectChange = useCallback(
    (value: string) => {
      const [newSortBy, newSortOrder] = value.split('-');
      if (newSortBy && (newSortOrder === 'asc' || newSortOrder === 'desc')) {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        updateQueryParams({ sortBy: newSortBy, sortOrder: newSortOrder });
      }
    },
    [updateQueryParams]
  );

  const currentSortValue = `${sortBy}-${sortOrder}`;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 mt-auto overflow-hidden">
      <form onSubmit={handleSearchSubmit} className="relative w-full md:w-1/3">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar pedidos..."
          className="pl-8 w-full"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </form>

      <Tabs
        value={selectedTabValue}
        onValueChange={handleTabChange}
        className="overflow-hidden"
      >
        <div className="flex items-center justify-center flex-col gap-4 xs:w-full md:inline-flex md:justify-between md:items-center md:flex-row mb-4">
          <TabsList>
            <TabsTrigger value="all">Todo</TabsTrigger>
            <TabsTrigger value="Pendiente">Pendiente</TabsTrigger>
            <TabsTrigger value="Preparando">En preparación</TabsTrigger>
            <TabsTrigger value="Listo">Listo</TabsTrigger>
            <TabsTrigger value="Entregado">Entregado</TabsTrigger>
          </TabsList>
          <div className="flex flex-col justify-end sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                onClick={downloadCSV}
                size="sm"
                variant="outline"
                className="h-8 gap-1"
              >
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Exportar</span>
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1"
                onClick={() => {
                  setIsCreating(true);
                  setOrderToEdit(null);
                  setIsModalOpen(true);
                }}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Nuevo</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Label
                htmlFor="sort-select"
                className="text-xs text-muted-foreground shrink-0"
              >
                Ordenar por:
              </Label>
              <Select
                value={currentSortValue}
                onValueChange={handleSortSelectChange}
              >
                <SelectTrigger
                  id="sort-select"
                  className="h-8 text-xs w-full sm:w-auto min-w-[180px]"
                >
                  <SelectValue placeholder="Ordenar..." />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-xs"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Ver:
              </span>
              <Select
                value={pageSizeValue.toString()}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue placeholder={pageSizeValue} />
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
                {[...Array(pageSizeValue)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-8 w-full" />
            </CardFooter>
          </Card>
        ) : (
          <TabsContent value={selectedTabValue} className="xs:w-full mt-0">
            <Orders
              setOrders={setOrders}
              editOrder={editOrder}
              uploadImages={uploadImages}
              onStatusChange={handleUpdateStatus}
              orders={orders}
              offset={offset}
              limit={limit}
              totalOrders={totalOrders}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              pathname={pathname}
            />
          </TabsContent>
        )}
      </Tabs>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {isCreating ? (
          <OrderForm
            setIsModalOpen={setIsModalOpen}
            setOrders={setOrders}
            setIsCreating={setIsCreating}
          />
        ) : isEditing ? (
          <UpdateOrderForm
            onCancel={closeModal}
            onUpdateSuccess={handleUpdateSuccess}
            orderToEdit={orderToEdit!}
          />
        ) : isUploadingImage && orderToEdit ? (
          <UploadImage orderId={orderToEdit.id!} />
        ) : null}
      </Modal>
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogTitle className="text-lg font-medium text-center">
            Error
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {alertMessage}
          </AlertDialogDescription>
          <AlertDialogCancel>Cerrar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
