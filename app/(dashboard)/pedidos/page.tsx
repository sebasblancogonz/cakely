'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrdersTable } from './orders-table';
import { Order } from '@types';
import Modal from '../common/Modal';
import OrderForm from './order-form';
import OrderDetails from './order-details';

export default function OrdersPage(props: {
  searchParams: Promise<{ q: string; offset: string }>;
}) {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') || '';
  const offsetParam = Number(searchParams.get('offset')) || 0;

  const [selectedTab, setSelectedTab] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [offset, setOffset] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToShow, setOrderToShow] = useState<Order | null>(null);

  const editOrder = (order: Order) => {
    setOrderToEdit(order);
    setIsModalOpen(true);
    setIsEditing(true);
  };

  const showDetails = (order: Order) => {
    setOrderToShow(order);
    setIsModalOpen(true);
    setIsEditing(false);
  };

  useEffect(() => {
    async function fetchOrders() {
      const response = await fetch(
        `/api/orders?search=${search}&offset=${offsetParam}`
      );
      const data = await response.json();

      setOrders(data.orders);
      setOffset(offsetParam);
    }

    fetchOrders();
  }, [search, offsetParam]);

  const normalizeString = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const filteredOrders = orders.filter((order) => {
    switch (selectedTab) {
      case 'all':
        return true;
      case 'pending':
        return (
          normalizeString(order.orderStatus) === normalizeString('Pendiente')
        );
      case 'in_progress':
        return (
          normalizeString(order.orderStatus) === normalizeString('Preparando')
        );
      case 'ready':
        return normalizeString(order.orderStatus) === normalizeString('Listo');
      case 'delivered':
        return (
          normalizeString(order.orderStatus) === normalizeString('Entregado')
        );
      default:
        return true;
    }
  });

  const downloadCSV = () => {
    if (orders.length === 0) {
      alert('No hay pedidos para exportar.');
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
      'Notas',
      'Historial'
    ];

    const csvRows = [
      headers.join(','), // Encabezados
      ...orders.map((order) =>
        [
          order.customerName,
          order.customerContact,
          order.description,
          order.amount,
          order.productType,
          order.deliveryDate.toString(),
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
          order.notes,
          order.orderHistory.toString()
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`) // Escapar comillas
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'pedidos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Tabs defaultValue="all" className=" overflow-hidden">
      <div className="flex items-center justify-center flex-col gap-4 xs:w-full md:inline-flex md:justify-between md:items-center md:flex-row ">
        <TabsList>
          <TabsTrigger onClick={() => setSelectedTab('all')} value="all">
            Todos
          </TabsTrigger>
          <TabsTrigger
            onClick={() => setSelectedTab('pending')}
            value="pending"
          >
            Pendientes
          </TabsTrigger>
          <TabsTrigger
            onClick={() => setSelectedTab('in_progress')}
            value="in_progress"
          >
            Preparando
          </TabsTrigger>
          <TabsTrigger onClick={() => setSelectedTab('ready')} value="ready">
            Listo
          </TabsTrigger>
          <TabsTrigger
            onClick={() => setSelectedTab('delivered')}
            value="delivered"
          >
            Entregado
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
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
              setIsCreating(true);
              setIsModalOpen(true);
            }}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Nuevo pedido
            </span>
          </Button>
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setOrderToEdit(null);
              setIsModalOpen(false);
              setIsEditing(false);
              setIsCreating(false);
              setOrderToShow(null);
            }}
          >
            {isEditing || isCreating ? (
              <OrderForm
                setIsModalOpen={setIsModalOpen}
                setOrders={setOrders}
                setIsEditing={setIsEditing}
                setIsCreating={setIsCreating}
                orderToEdit={isEditing ? orderToEdit : null}
              />
            ) : (
              <OrderDetails order={orderToShow!} />
            )}
          </Modal>
        </div>
      </div>
      {filteredOrders.length === 0 ? (
        <div className="flex justify-center items-center h-96">
          <p className="text-lg text-gray-500">No hay pedidos</p>
        </div>
      ) : (
        <TabsContent value={selectedTab} className=" xs:w-full">
          <OrdersTable
            setOrders={setOrders}
            editOrder={editOrder}
            showDetails={showDetails}
            orders={filteredOrders}
            offset={offset ?? 0}
            totalOrders={filteredOrders.length}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
