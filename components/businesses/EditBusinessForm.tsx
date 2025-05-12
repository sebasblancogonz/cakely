'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminUpdateBusinessSchema,
  AdminUpdateBusinessData
} from '@/lib/validators/admin';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Business } from '@types';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface EditBusinessFormProps {
  business: Business;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditBusinessForm({
  business,
  onSuccess,
  onCancel
}: EditBusinessFormProps) {
  const { toast } = useToast();
  const [isSubmittingReal, setIsSubmittingReal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isRHFSubmitting },
    reset
  } = useForm<AdminUpdateBusinessData>({
    resolver: zodResolver(adminUpdateBusinessSchema),
    defaultValues: {
      name: business.name || '',
      ownerUserId: business.ownerUserId || undefined
    }
  });

  useEffect(() => {
    reset({
      name: business.name || '',
      ownerUserId: business.ownerUserId || undefined
    });
  }, [business, reset]);

  const processSubmit: SubmitHandler<AdminUpdateBusinessData> = async (
    data
  ) => {
    setIsSubmittingReal(true);

    const changedData: Partial<AdminUpdateBusinessData> = {};
    (Object.keys(data) as Array<keyof AdminUpdateBusinessData>).forEach(
      (key) => {
        if (
          data[key] !== undefined &&
          data[key] !== business[key as keyof Business]
        ) {
          changedData[key] = data[key] as any;
        }
      }
    );

    if (Object.keys(changedData).length === 0) {
      toast({ description: 'No se realizaron cambios.' });
      setIsSubmittingReal(false);
      onCancel();
      return;
    }

    try {
      const response = await fetch(`/api/admin/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changedData)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Error al actualizar el negocio');
      }
      toast({
        title: 'Éxito',
        description: `Negocio "${result.name}" actualizado.`
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error updating business:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingReal(false);
    }
  };
  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 p-4">
      <div>
        <Label htmlFor={`edit-business-name-${business.id}`}>
          Nombre del Negocio
        </Label>
        <Input id={`edit-business-name-${business.id}`} {...register('name')} />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isRHFSubmitting || isSubmittingReal}>
          {(isRHFSubmitting || isSubmittingReal) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
