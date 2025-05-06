'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrdersTable } from './orders-table';
import { Order, OrderStatus, PaymentStatus } from '@types';
import Modal from '@/components/common/Modal';
import OrderForm from './order-form';
import OrderDetails from './order-details';
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
import UpdateOrderForm from './update-order-form';
import { UpdateOrderFormData } from '@/lib/validators/orders';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get('q') || '';
  const offset = Number(searchParams.get('offset')) || 0;
  const limit = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
  const status = searchParams.get('status') || 'all';

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

  useEffect(() => {
    setSelectedTabValue(status);
    setPageSizeValue(limit);
    setSearchInput(query);

    async function fetchOrders() {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: query,
        offset: offset.toString(),
        limit: limit.toString(),
        status: status === 'all' ? '' : status
      });

      try {
        const response = await fetch(`/api/orders?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalOrders(data.totalOrders || 0);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        setOrders([]);
        setTotalOrders(0);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, [query, offset, limit, status]);

  const handleUpdateStatus = useCallback(
    async (orderId: number, newStatus: OrderStatus | PaymentStatus) => {
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
        alert(
          `Error updating status: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    []
  );

  const downloadCSV = useCallback(() => {
    const dataToExport = orders;
    if (dataToExport.length === 0) {
      alert('No orders on the current page to export.');
      return;
    }

    const headers = [
      'Nombre del cliente',
      'Contacto del cliente',
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
    const blob = new Blob(['\ufeff' + csvRows], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'orders_page.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [orders]);

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
            <TabsTrigger value="pending">Pendiente</TabsTrigger>
            <TabsTrigger value="processing">En preparación</TabsTrigger>
            <TabsTrigger value="ready">Listo</TabsTrigger>
            <TabsTrigger value="delivered">Entregado</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Pedidos por página:
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
            <Button
              onClick={downloadCSV}
              size="sm"
              variant="outline"
              className="h-8 gap-1"
            >
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Exportar Página
              </span>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                setOrderToEdit(null);
                setIsCreating(true);
                setIsEditing(false);
                setIsUploadingImage(false);
                setIsModalOpen(true);
              }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Nuevo pedido
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
            <OrdersTable
              setOrders={setOrders}
              editOrder={editOrder}
              uploadImages={uploadImages}
              onStatusChange={handleUpdateStatus}
              orders={orders}
              offset={offset}
              limit={limit}
              totalOrders={totalOrders}
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
            setIsModalOpen={setIsModalOpen}
            setOrders={setOrders}
            setIsEditing={setIsEditing}
            orderToEdit={orderToEdit!}
          />
        ) : isUploadingImage && orderToEdit ? (
          <UploadImage orderId={orderToEdit.id!} />
        ) : null}
      </Modal>
    </div>
  );
}
