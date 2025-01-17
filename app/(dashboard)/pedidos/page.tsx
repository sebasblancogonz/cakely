'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrdersTable } from './orders-table';
import { Order } from '@types';
import Modal from '../common/Modal';
import OrderForm from './order-form';

export default function OrdersPage(props: {
  searchParams: Promise<{ q: string; offset: string }>;
}) {
  const [selectedTab, setSelectedTab] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOffset, setNewOffset] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      const searchParams = await props.searchParams;
      const search = searchParams.q ?? '';
      const offset = searchParams.offset ?? 0;

      const response = await fetch(
        `/api/orders?search=${search}&offset=${offset}`
      );
      const data = await response.json();

      setOrders(data.orders);
      setNewOffset(data.newOffset ?? 0);
    }
    fetchOrders();
  }, [props.searchParams]);

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
          normalizeString(order.orderStatus) ===
          normalizeString('En Preparación')
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

  return (
    <Tabs defaultValue="all" className='flex flex-col gap-4 mt-auto'>
      <div className="flex items-center justify-center flex-col gap-4 w-[80%] xs:w-full md:inline-flex md:justify-between md:items-center md:flex-row "> 
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
            En Preparación
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
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Exportar
            </span>
          </Button>
          <Button size="sm" className="h-8 gap-1" onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Nuevo pedido
            </span>
          </Button>
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <OrderForm setIsModalOpen={setIsModalOpen} setOrders={setOrders}/>
          </Modal>
        </div>
      </div>
      {filteredOrders.length === 0 ? (
        <div className="flex justify-center items-center h-96">
          <p className="text-lg text-gray-500">No hay pedidos</p>
        </div>
      ) : (
        <TabsContent value={selectedTab} className=' w-[80%] xs:w-full'>
          <OrdersTable
            setOrders={setOrders}
            orders={filteredOrders}
            offset={newOffset ?? 0}
            totalOrders={filteredOrders.length}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
