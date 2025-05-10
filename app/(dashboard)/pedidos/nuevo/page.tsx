'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import OrderForm from '@/components/forms/OrderForm';
import { Order } from '@types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function CreateNewOrderPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleOrderCreated = (createdOrder: Order) => {
    console.log(
      'CreateNewOrderPage: Order created successfully, ID:',
      createdOrder.id
    );
    toast({
      title: '¡Pedido Creado!',
      description: `El pedido #${createdOrder.businessOrderNumber ?? createdOrder.id} ha sido creado.`
    });

    router.push(`/pedidos/${createdOrder.id}`);
  };

  const handleCancelCreation = () => {
    console.log('CreateNewOrderPage: Order creation cancelled.');
    router.push('/pedidos');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/pedidos" aria-label="Volver a la lista de pedidos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Crear Nuevo Pedido
        </h1>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Completa los Datos del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <OrderForm
            onOrderCreated={handleOrderCreated}
            onCancelForm={handleCancelCreation}
            setIsModalOpen={() => {}}
            setOrders={() => {}}
            setIsCreating={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  );
}
