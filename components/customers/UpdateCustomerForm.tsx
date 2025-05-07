'use client';

import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Customer } from '@types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  UpdateCustomerFormData,
  updateCustomerSchema
} from '@/lib/validators/customers';
import { Loader2 } from 'lucide-react';

interface UpdateCustomerFormProps {
  setIsModalOpen: (value: boolean) => void;
  customerToEdit: Customer;
  onCancel: () => void;
  onUpdateSuccess: (updatedCustomer: Customer) => void;
}

const UpdateCustomerForm: React.FC<UpdateCustomerFormProps> = ({
  setIsModalOpen,
  customerToEdit,
  onCancel,
  onUpdateSuccess
}) => {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<UpdateCustomerFormData>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: {
      name: customerToEdit.name || '',
      email: customerToEdit.email ?? '',
      phone: customerToEdit.phone ?? '',
      instagramHandle: customerToEdit.instagramHandle ?? '',
      notes: customerToEdit.notes ?? ''
    }
  });

  useEffect(() => {
    console.log(
      'UpdateCustomerForm: Reseteando con customerToEdit:',
      customerToEdit
    );
    reset({
      name: customerToEdit.name || '',
      email: customerToEdit.email ?? null,
      phone: customerToEdit.phone ?? null,
      instagramHandle: customerToEdit.instagramHandle ?? null,
      notes: customerToEdit.notes ?? null
    });
  }, [customerToEdit, reset]);

  const onSubmit: SubmitHandler<UpdateCustomerFormData> = async (data) => {
    if (!isDirty) {
      toast({
        description: 'No has modificado ningún dato del cliente.',
        duration: 3000
      });
      onCancel();
      return;
    }

    const customerDataToUpdate: Partial<UpdateCustomerFormData> = {};

    for (const key in data) {
      const K = key as keyof UpdateCustomerFormData;
      if (data[K] !== undefined) {
        customerDataToUpdate[K] = data[K] === null ? undefined : data[K];
      }
    }

    Object.keys(customerDataToUpdate).forEach((key) => {
      if (
        customerDataToUpdate[key as keyof UpdateCustomerFormData] === undefined
      ) {
        delete customerDataToUpdate[key as keyof UpdateCustomerFormData];
      }
    });

    if (Object.keys(customerDataToUpdate).length === 0 && isDirty) {
      toast({
        description:
          'No hay datos válidos para guardar después de la limpieza.',
        variant: 'destructive'
      });
      return;
    }

    console.log(
      `Updating customer ${customerToEdit.id} with data:`,
      customerDataToUpdate
    );

    try {
      const response = await fetch(`/api/customers/${customerToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerDataToUpdate)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update customer');
      }
      const savedCustomer = await response.json();

      toast({
        title: 'Éxito',
        description: 'Cliente actualizado correctamente.'
      });
      onUpdateSuccess(savedCustomer);
      onCancel();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: 'Error',
        description: `No se pudo actualizar el cliente: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const handleCancelClick = () => {
    reset({
      name: customerToEdit.name || '',
      email: customerToEdit.email ?? null,
      phone: customerToEdit.phone ?? null,
      instagramHandle: customerToEdit.instagramHandle ?? null,
      notes: customerToEdit.notes ?? null
    });
    onCancel();
  };

  return (
    <>
      <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">
        Editar Cliente{' '}
        <span className="text-primary">#{customerToEdit.id}</span>
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <Label htmlFor={`update-customer-name-${customerToEdit.id}`}>
            Nombre
          </Label>
          <Input
            id={`update-customer-name-${customerToEdit.id}`}
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
          <Label htmlFor={`update-customer-email-${customerToEdit.id}`}>
            Email (Opcional)
          </Label>
          <Input
            id={`update-customer-email-${customerToEdit.id}`}
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
          <Label htmlFor={`update-customer-phone-${customerToEdit.id}`}>
            Teléfono (Opcional)
          </Label>
          <Input
            id={`update-customer-phone-${customerToEdit.id}`}
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
          <Label htmlFor={`update-customer-instagram-${customerToEdit.id}`}>
            Instagram (Opcional)
          </Label>
          <Input
            id={`update-customer-instagram-${customerToEdit.id}`}
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
          <Label htmlFor={`update-customer-notes-${customerToEdit.id}`}>
            Notas (Opcional)
          </Label>
          <Textarea
            id={`update-customer-notes-${customerToEdit.id}`}
            placeholder="Alergias, preferencias, dirección de entrega, etc."
            {...register('notes')}
            className={cn(errors.notes && 'border-destructive')}
            rows={3}
          />
          {errors.notes && (
            <p className="text-xs text-destructive mt-1">
              {errors.notes.message}
            </p>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={handleCancelClick}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="ml-2"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </form>
    </>
  );
};

export default UpdateCustomerForm;
