'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Customer } from '@types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CustomerFormData,
  customerSchema,
  UpdateCustomerFormData
} from '@/lib/validators/customers';

interface CustomerFormProps {
  setIsModalOpen: (value: boolean) => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setIsEditing: (value: boolean) => void;
  setIsCreating: (value: boolean) => void;
  customerToEdit: Customer | null;
}

const CustomerForm = ({
  setIsModalOpen,
  setCustomers,
  setIsEditing,
  setIsCreating,
  customerToEdit
}: CustomerFormProps) => {
  const { toast } = useToast();
  const isEditingMode = !!customerToEdit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customerToEdit?.name || '',
      email: customerToEdit?.email || undefined,
      phone: customerToEdit?.phone || '',
      instagramHandle: customerToEdit?.instagramHandle || '',
      notes: customerToEdit?.notes || ''
    }
  });

  useEffect(() => {
    if (customerToEdit) {
      reset({
        name: customerToEdit.name || '',
        email: customerToEdit.email || undefined,
        phone: customerToEdit.phone || '',
        instagramHandle: customerToEdit.instagramHandle || '',
        notes: customerToEdit.notes || ''
      });
    }
  }, [customerToEdit, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      let savedCustomer: Customer;
      if (isEditingMode) {
        if (!isDirty) {
          toast({
            title: 'Sin Cambios',
            description: 'No has modificado ningún dato del cliente.',
            variant: 'default'
          });
          setIsModalOpen(false);
          setIsEditing(false);
          return;
        }
        const customerDataToUpdate: Partial<UpdateCustomerFormData> = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          instagramHandle: data.instagramHandle || undefined,
          notes: data.notes || undefined
        };

        const response = await fetch(`/api/customers/${customerToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerDataToUpdate)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update customer');
        }
        savedCustomer = {
          ...customerToEdit,
          ...data
        };
        setCustomers((prevCustomers) =>
          prevCustomers.map((c) =>
            c.id === savedCustomer.id ? savedCustomer : c
          )
        );
        toast({
          title: 'Éxito',
          description: 'Cliente actualizado correctamente.'
        });
      } else {
        const newCustomerData: Omit<
          Customer,
          'id' | 'registrationDate' | 'orders' | 'businessId'
        > = {
          name: data.name,
          email: data.email || null,
          phone: data.phone,
          instagramHandle: data.instagramHandle || null,
          notes: data.notes || null
        };
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCustomerData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create customer');
        }
        savedCustomer = await response.json();
        setCustomers((prevCustomers) => [...prevCustomers, savedCustomer]);
        toast({ title: 'Éxito', description: 'Cliente creado correctamente.' });
      }

      setIsModalOpen(false);
      setIsEditing(false);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Error',
        description: `No se pudo guardar el cliente: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setIsCreating(false);
    reset(
      isEditingMode
        ? {
            name: customerToEdit?.name || '',
            email: customerToEdit?.email || undefined,
            phone: customerToEdit?.phone || '',
            instagramHandle: customerToEdit?.instagramHandle || '',
            notes: customerToEdit?.notes || ''
          }
        : { name: '', email: '', phone: '', instagramHandle: '', notes: '' }
    );
  };

  return (
    <>
      <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">
        {isEditingMode ? 'Editar Cliente' : 'Nuevo Cliente'}
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            placeholder="Nombre completo del cliente"
            {...register('name')}
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            {...register('email')}
            className={cn(errors.email && 'border-destructive')}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Ej: 600112233"
            {...register('phone')}
            className={cn(errors.phone && 'border-destructive')}
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1">
              {errors.phone.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instagramHandle">Instagram (Opcional)</Label>
          <Input
            id="instagramHandle"
            placeholder="@usuario_instagram"
            {...register('instagramHandle')}
            className={cn(errors.instagramHandle && 'border-destructive')}
          />
          {errors.instagramHandle && (
            <p className="text-xs text-destructive mt-1">
              {errors.instagramHandle.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas (Opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Alergias, preferencias, etc."
            {...register('notes')}
            className={cn(errors.notes && 'border-destructive')}
          />
          {errors.notes && (
            <p className="text-xs text-destructive mt-1">
              {errors.notes.message}
            </p>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="submit" className="ml-2" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </>
  );
};

export default CustomerForm;
