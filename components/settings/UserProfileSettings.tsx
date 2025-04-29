'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useSession } from 'next-auth/react';

const userNameSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido.')
});
type UserNameFormData = z.infer<typeof userNameSchema>;

interface UserProfileSettingsProps {
  currentUserName: string | null | undefined;
}

const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({
  currentUserName
}) => {
  const { toast } = useToast();

  const { update: updateSession } = useSession();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<UserNameFormData>({
    resolver: zodResolver(userNameSchema),
    defaultValues: {
      name: currentUserName ?? ''
    }
  });

  useEffect(() => {
    reset({ name: currentUserName ?? '' });
  }, [currentUserName, reset]);

  const onSubmit = async (data: UserNameFormData) => {
    if (!isDirty) {
      toast({ description: 'No has modificado tu nombre.' });
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al actualizar el nombre');
      }

      const updatedUser = await response.json();

      toast({
        title: 'Éxito',
        description: 'Tu nombre ha sido actualizado.'
      });

      await updateSession({ name: updatedUser.name });

      reset({ name: updatedUser.name });
    } catch (error) {
      console.error('Error updating user name:', error);
      toast({
        title: 'Error',
        description: `No se pudo actualizar tu nombre: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tu Perfil</CardTitle>
        <CardDescription>Actualiza tu nombre.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="user-profile-name">Tu Nombre</Label>
            <Input
              id="user-profile-name"
              placeholder="Tu nombre completo"
              {...register('name')}
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">
                {errors.name.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Nombre
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default UserProfileSettings;
