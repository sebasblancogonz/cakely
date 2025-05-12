'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminCreateBusinessSchema,
  AdminCreateBusinessData
} from '@/lib/validators/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateBusinessFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateBusinessForm({
  onSuccess,
  onCancel
}: CreateBusinessFormProps) {
  const { toast } = useToast();
  const [isSubmittingReal, setIsSubmittingReal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isRHFSubmitting },
    reset
  } = useForm<AdminCreateBusinessData>({
    resolver: zodResolver(adminCreateBusinessSchema),
    defaultValues: {
      name: '',
      ownerEmail: ''
    }
  });

  const processSubmit: SubmitHandler<AdminCreateBusinessData> = async (
    data
  ) => {
    setIsSubmittingReal(true);
    try {
      const response = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al crear el negocio');
      }

      toast({
        title: 'Éxito',
        description: `Negocio "${result.name}" creado.`
      });
      reset();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating business:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el negocio.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingReal(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 p-4">
      <div>
        <Label htmlFor="create-business-name">Nombre del Negocio</Label>
        <Input id="create-business-name" {...register('name')} />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="create-owner-email">
          Email del Propietario (usuario existente)
        </Label>
        <Input
          id="create-owner-email"
          type="email"
          {...register('ownerEmail')}
        />
        {errors.ownerEmail && (
          <p className="text-xs text-red-500 mt-1">
            {errors.ownerEmail.message}
          </p>
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
          Crear Negocio
        </Button>
      </div>
    </form>
  );
}
