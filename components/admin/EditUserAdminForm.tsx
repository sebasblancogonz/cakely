import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminUpdateUserSchema,
  AdminUpdateUserData
} from '@/lib/validators/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { User as UserType } from '@types';
import { DialogFooter } from '@/components/ui/dialog';

interface EditUserFormProps {
  user: UserType;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditUserAdminForm({
  user,
  onSuccess,
  onCancel
}: EditUserFormProps) {
  const { toast } = useToast();
  const [isSubmittingReal, setIsSubmittingReal] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting: isRHFSubmitting, isDirty },
    reset
  } = useForm<AdminUpdateUserData>({
    resolver: zodResolver(adminUpdateUserSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      isSuperAdmin: !!user.isSuperAdmin
    }
  });

  useEffect(() => {
    reset({
      name: user.name || '',
      email: user.email || '',
      isSuperAdmin: !!user.isSuperAdmin
    });
  }, [user, reset]);

  const processSubmit: SubmitHandler<AdminUpdateUserData> = async (data) => {
    if (!isDirty) {
      toast({ description: 'No se realizaron cambios.' });

      return;
    }
    setIsSubmittingReal(true);

    const payload: Partial<AdminUpdateUserData> = {};

    if (data.name !== undefined && data.name !== user.name) {
      payload.name = data.name === '' ? undefined : data.name;
    }
    if (data.email !== undefined && data.email !== user.email) {
      payload.email = data.email;
    }
    if (
      data.isSuperAdmin !== undefined &&
      data.isSuperAdmin !== !!user.isSuperAdmin
    ) {
      payload.isSuperAdmin = data.isSuperAdmin;
    }

    if (Object.keys(payload).length === 0) {
      toast({ description: 'No hay cambios detectados para guardar.' });
      setIsSubmittingReal(false);
      onCancel();
      return;
    }

    console.log('Sending PATCH data to API:', payload);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Error al actualizar usuario');
      }
      toast({ title: 'Éxito', description: 'Usuario actualizado.' });
      onSuccess();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingReal(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(processSubmit)}
      className="space-y-4 p-1 sm:p-4"
    >
      <div>
        <Label htmlFor={`admin-edit-user-name-${user.id}`}>Nombre</Label>
        <Input
          id={`admin-edit-user-name-${user.id}`}
          {...register('name')}
          placeholder={user.name || 'Nombre'}
        />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor={`admin-edit-user-email-${user.id}`}>Email</Label>
        <Input
          id={`admin-edit-user-email-${user.id}`}
          type="email"
          {...register('email')}
          placeholder={user.email || 'correo@ejemplo.com'}
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
              id={`admin-edit-user-isSuperAdmin-${user.id}`}
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-labelledby={`isSuperAdmin-label-edit-${user.id}`}
            />
          )}
        />
        <Label
          htmlFor={`admin-edit-user-isSuperAdmin-${user.id}`}
          id={`isSuperAdmin-label-edit-${user.id}`}
          className="text-sm font-medium"
        >
          ¿Es SuperAdmin?
        </Label>
        {errors.isSuperAdmin && (
          <p className="text-xs text-red-500">{errors.isSuperAdmin.message}</p>
        )}
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isRHFSubmitting || isSubmittingReal || !isDirty}
        >
          {' '}
          {/* Deshabilita si no hay cambios */}
          {(isRHFSubmitting || isSubmittingReal) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Guardar Cambios
        </Button>
      </DialogFooter>
    </form>
  );
}
