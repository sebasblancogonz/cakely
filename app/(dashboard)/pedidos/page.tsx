'use client';

import { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrdersTable } from './orders-table';
import { Order, OrderStatus } from '@types';
import Modal from '../common/Modal';
import OrderForm from './order-form';
import OrderDetails from './order-details';
import UploadImage from '../common/MultiUpload';
import { Analytics } from '@vercel/analytics/react';
import { cn } from '@/lib/utils';
import { BreadcrumbTrailItem } from '../common/DashboardBreadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'; // Import Select for page size

// Default page size if not specified in URL
const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get('q') || '';
  const offsetParam = Number(searchParams.get('offset')) || 0;
  const limitParam = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
  const initialTab = searchParams.get('status') || 'all';

  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [offset, setOffset] = useState(offsetParam);
  const [pageSize, setPageSize] = useState(limitParam); // State for page size
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToShow, setOrderToShow] = useState<Order | null>(null);

  const editOrder = useCallback((order: Order) => {
    setOrderToEdit(order);
    setIsEditing(true);
    setIsCreating(false);
    setIsUploadingImage(false);
    setOrderToShow(null);
    setIsModalOpen(true);
  }, []);

  const showDetails = useCallback((order: Order) => {
    setOrderToShow(order);
    setIsEditing(false);
    setIsCreating(false);
    setIsUploadingImage(false);
    setOrderToEdit(null);
    setIsModalOpen(true);
  }, []);

  const uploadImages = useCallback((order: Order) => {
    setOrderToEdit(order);
    setIsUploadingImage(true);
    setIsEditing(false);
    setIsCreating(false);
    setOrderToShow(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOrderToEdit(null);
    setIsModalOpen(false);
    setIsEditing(false);
    setIsCreating(false);
    setOrderToShow(null);
    setIsUploadingImage(false);
  }, []);

  useEffect(() => {
    setOffset(offsetParam);
    setPageSize(limitParam); // Sync state with URL param on load/change

    async function fetchOrders() {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: search,
        offset: offsetParam.toString(),
        limit: limitParam.toString(), // Use limitParam from URL
        status: selectedTab === 'all' ? '' : selectedTab
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
    // Depend on limitParam from URL as well
  }, [search, offsetParam, limitParam, selectedTab]);

  const handleUpdateStatus = useCallback(
    async (orderId: number, newStatus: OrderStatus) => {
      console.log(
        `OrdersPage: Attempting to update order ${orderId} to status: ${newStatus}`
      );
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderStatus: newStatus })
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
  ); // Empty dependency array if it doesn't depend on component state/props directly

  const downloadCSV = useCallback(() => {
    if (orders.length === 0) {
      alert('No orders on the current page to export.');
      return;
    }
    const headers = [
      'Customer Name',
      /* ... other headers ... */ 'Notes',
      'Order History'
    ];
    const csvRows = [
      headers.join(','),
      ...orders.map((order) =>
        [
          order.customerName,
          /* ... other values ... */ JSON.stringify(order.orderHistory)
        ]
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
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
  }, [orders]); // Depend on orders

  const handleTabChange = useCallback(
    (value: string) => {
      setSelectedTab(value);
      const params = new URLSearchParams(searchParams);
      params.set('status', value);
      params.set('offset', '0');
      params.set('limit', pageSize.toString()); // Keep current page size
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pageSize, router, pathname]
  ); // Include dependencies

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const newSize = Number(value);
      setPageSize(newSize); // Update state
      const params = new URLSearchParams(searchParams);
      params.set('limit', newSize.toString());
      params.set('offset', '0'); // Reset offset
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  ); // Include dependencies

  return (
    <div className="flex flex-col gap-4 mt-auto overflow-hidden">
      <Tabs
        value={selectedTab}
        onValueChange={handleTabChange}
        className="overflow-hidden"
      >
        <div className="flex items-center justify-center flex-col gap-4 xs:w-full md:inline-flex md:justify-between md:items-center md:flex-row ">
          <TabsList>
            <TabsTrigger value="all">Todo</TabsTrigger>
            <TabsTrigger value="pending">Pendiente</TabsTrigger>
            <TabsTrigger value="in_progress">En preparación</TabsTrigger>
            <TabsTrigger value="ready">Listo</TabsTrigger>
            <TabsTrigger value="delivered">Entregado</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                Elementos por página:
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
                setOrderToShow(null);
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
          <div className="flex justify-center items-center h-64">
            <p>Loading...</p>
          </div>
        ) : (
          // Removed orders.length === 0 check here, handled by table
          <TabsContent value={selectedTab} className="xs:w-full mt-4">
            <OrdersTable
              setOrders={setOrders}
              editOrder={editOrder}
              showDetails={showDetails}
              uploadImages={uploadImages}
              onStatusChange={handleUpdateStatus}
              orders={orders}
              offset={offset}
              limit={pageSize} // Pass pageSize as limit
              totalOrders={totalOrders}
            />
          </TabsContent>
        )}
      </Tabs>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {isEditing || isCreating ? (
          <OrderForm
            setIsModalOpen={setIsModalOpen}
            setOrders={setOrders}
            setIsEditing={setIsEditing}
            setIsCreating={setIsCreating}
            orderToEdit={isEditing ? orderToEdit : null}
          />
        ) : isUploadingImage && orderToEdit ? (
          <UploadImage orderId={orderToEdit.id!} />
        ) : orderToShow ? (
          <OrderDetails order={orderToShow} />
        ) : null}
      </Modal>
    </div>
  );
}
