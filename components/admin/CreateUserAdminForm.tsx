// src/app/(admin)/admin/users/CreateUserAdminForm.tsx
'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminCreateUserSchema,
  AdminCreateUserData
} from '@/lib/validators/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateUserAdminFormProps {
  onSuccess: () => void; // Para refrescar lista y cerrar modal
  onCancel: () => void;
}

export function CreateUserAdminForm({
  onSuccess,
  onCancel
}: CreateUserAdminFormProps) {
  const { toast } = useToast();
  const [isSubmittingReal, setIsSubmittingReal] = useState(false);

  const {
    register,
    handleSubmit,
    control, // Para el Checkbox
    formState: { errors, isSubmitting: isRHFSubmitting },
    reset
  } = useForm<AdminCreateUserData>({
    //@ts-ignore
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      name: '',
      email: '',
      isSuperAdmin: false
    }
  });

  const processSubmit: SubmitHandler<AdminCreateUserData> = async (data) => {
    setIsSubmittingReal(true);
    // No necesitamos enviar confirmPassword a la API
    const { ...payload } = data;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al crear el usuario');
      }

      toast({
        title: 'Éxito',
        description: `Usuario "${result.email}" creado.`
      });
      reset();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el usuario.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingReal(false);
    }
  };

  return (
    <form
      //@ts-ignore
      onSubmit={handleSubmit(processSubmit)}
      className="space-y-4 p-1 sm:p-4"
    >
      <div>
        <Label htmlFor="admin-create-user-name">Nombre (Opcional)</Label>
        <Input id="admin-create-user-name" {...register('name')} />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="admin-create-user-email">Email</Label>
        <Input
          id="admin-create-user-email"
          type="email"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>
      <div className="flex items-center space-x-2 pt-2">
        <Controller
          name="isSuperAdmin"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="admin-create-user-isSuperAdmin"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-labelledby="isSuperAdmin-label"
            />
          )}
        />
        <Label
          htmlFor="admin-create-user-isSuperAdmin"
          id="isSuperAdmin-label"
          className="text-sm font-medium"
        >
          ¿Marcar como SuperAdmin?
        </Label>
        {errors.isSuperAdmin && (
          <p className="text-xs text-red-500">{errors.isSuperAdmin.message}</p>
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
          Crear Usuario
        </Button>
      </div>
    </form>
  );
}
