'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import OrderForm from '@/components/forms/OrderForm';
import { Customer, Order } from '@types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import CustomerForm from '@/components/forms/CustomerForm';

export default function CreateNewOrderPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleCustomerCreated = (createdCustomer: Customer) => {
    toast({
      title: 'Cliente Creado!',
      description: `El cliente #${createdCustomer.name ?? createdCustomer.id} ha sido dado de alta.`
    });

    router.push(`/clientes/${createdCustomer.id}`);
  };

  const handleCancelCreation = () => {
    router.push('/clientes');
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
          Dar de alta un Cliente
        </h1>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Completa los Datos del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <CustomerForm
            onCustomerCreated={handleCustomerCreated}
            customerToEdit={null}
            setIsEditing={() => {}}
            setIsModalOpen={() => {}}
            setCustomers={() => {}}
            setIsCreating={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  );
}
