'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Modal from '@/components/common/Modal';
import { Customer } from '@types';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UpdateCustomerForm from './UpdateCustomerForm';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogAction
} from '../ui/alert-dialog';

interface CustomerDetailActionsProps {
  customer: Customer;
}

export function CustomerDetailActions({
  customer
}: CustomerDetailActionsProps) {
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

  const handleUpdateSuccess = (updatedCustomer: Customer) => {
    console.log('Customer updated, refreshing data...', updatedCustomer);
    closeEditModal();

    router.refresh();
    toast({
      title: 'Cliente Actualizado',
      description: `Los datos de ${updatedCustomer.name} se han guardado.`
    });
  };

  const handleDeleteCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }

      router.back();
      toast({ title: 'Éxito', description: 'Cliente eliminado.' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Error',
        description: `No se pudo eliminar el cliente: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Button variant="outline" onClick={openEditModal}>
        <Pencil className="mr-2 h-4 w-4" /> Editar Cliente
      </Button>
      {/*  <Button
        variant="destructive"
        className=" active:bg-red-800"
        onClick={() => setIsAlertDialogOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button> */}

      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle className="text-lg font-medium text-center">
            Eliminar Pedido
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            ¿Estás seguro de que deseas eliminar a {customer.name}?
          </AlertDialogDescription>
          <AlertDialogAction
            className="hover:bg-red-500 active:bg-red-800"
            onClick={handleDeleteCustomer}
          >
            Eliminar
          </AlertDialogAction>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
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
