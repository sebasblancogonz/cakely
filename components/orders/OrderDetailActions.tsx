'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Modal from '@/components/common/Modal';
import UpdateOrderForm from '@/components/forms/UpdateOrderForm';
import { Order } from '@types';
import { Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderDetailActionsProps {
  order: Order;
}

export function OrderDetailActions({ order }: OrderDetailActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  return (
    <>
      <Button variant="outline" onClick={openEditModal}>
        <Pencil className="mr-2 h-4 w-4" /> Editar Pedido
      </Button>

      <Modal isOpen={isEditModalOpen} onClose={closeEditModal}>
        <UpdateOrderForm
          orderToEdit={order}
          onCancel={closeEditModal}
          onUpdateSuccess={handleUpdateSuccess}
        />
      </Modal>
    </>
  );
}
