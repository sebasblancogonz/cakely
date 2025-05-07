'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Modal from '@/components/common/Modal';
import { Customer } from '@types';
import { Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UpdateCustomerForm from './UpdateCustomerForm';

interface CustomerDetailActionsProps {
  customer: Customer;
}

export function CustomerDetailActions({
  customer
}: CustomerDetailActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const openEditModal = () => {
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleUpdateSuccess = (updatedCustomer: Customer) => {
    console.log('Customer updated, refreshing data...', updatedCustomer);
    closeEditModal();

    router.refresh();
    toast({
      title: 'Cliente Actualizado',
      description: `Los datos de ${updatedCustomer.name} se han guardado.`
    });
  };

  return (
    <>
      <Button variant="outline" onClick={openEditModal}>
        <Pencil className="mr-2 h-4 w-4" /> Editar Cliente
      </Button>

      <Modal isOpen={isEditModalOpen} onClose={closeEditModal}>
        <UpdateCustomerForm
          customerToEdit={customer}
          setIsModalOpen={setIsEditModalOpen}
          onCancel={closeEditModal}
          onUpdateSuccess={handleUpdateSuccess}
        />
      </Modal>
    </>
  );
}
