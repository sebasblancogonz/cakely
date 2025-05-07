'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Modal from '@/components/common/Modal';
import UpdateOrderForm from '@/components/forms/UpdateOrderForm';
import { Order } from '@types';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogAction
} from '../ui/alert-dialog';

interface OrderDetailActionsProps {
  order: Order;
  size?: string;
}

export function OrderDetailActions({ order, size }: OrderDetailActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const openEditModal = () => {
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleUpdateSuccess = (updatedOrder: Order) => {
    console.log('Order updated, refreshing page data...', updatedOrder);
    closeEditModal();

    router.refresh();
    toast({
      title: 'Pedido Actualizado',
      description: `El pedido #${updatedOrder.businessOrderNumber ?? updatedOrder.id} se ha guardado.`
    });
  };

  const handleDeleteOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }

      router.back();
      toast({ title: 'Éxito', description: 'Pedido eliminado.' });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: `No se pudo eliminar el pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Button variant="outline" onClick={openEditModal}>
        <Pencil className="mr-2 h-4 w-4" /> Editar Pedido
      </Button>
      <Button
        variant="destructive"
        className=" active:bg-red-800"
        onClick={() => setIsAlertDialogOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Modal isOpen={isEditModalOpen} onClose={closeEditModal}>
        <UpdateOrderForm
          orderToEdit={order}
          onCancel={closeEditModal}
          onUpdateSuccess={handleUpdateSuccess}
        />
      </Modal>

      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle className="text-lg font-medium text-center">
            Eliminar Pedido
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            ¿Estás seguro de que deseas eliminar el pedido #
            {order.businessOrderNumber ?? order.id}?
          </AlertDialogDescription>
          <AlertDialogAction
            className="hover:bg-red-500 active:bg-red-800"
            onClick={handleDeleteOrder}
          >
            Eliminar
          </AlertDialogAction>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
