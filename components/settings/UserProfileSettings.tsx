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

import ProfilePictureUploadForm from '../forms/ProfilePictureUploadForm';

const userNameSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido.')
});
type UserNameFormData = z.infer<typeof userNameSchema>;

interface UserProfileSettingsProps {
  currentUserName: string | null | undefined;
  currentUserImage: string | null | undefined;
}

const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({
  currentUserName,
  currentUserImage
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
    defaultValues: { name: currentUserName ?? '' }
  });

  useEffect(() => {
    reset({ name: currentUserName ?? '' });
  }, [currentUserName, reset]);

  const onSubmitName = async (data: UserNameFormData) => {
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

      try {
        await updateSession({ name: updatedUser.name });
      } catch (updateError) {
        toast({
          title: 'Info',
          description:
            'Nombre guardado, pero la sesión no pudo refrescarse automáticamente.',
          variant: 'default'
        });
      }

      reset({ name: updatedUser.name });
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo actualizar tu nombre: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const handlePictureUpdateSuccess = async (newImageUrl: string | null) => {
    try {
      await updateSession({ image: newImageUrl });
      toast({ description: 'Sesión actualizada con la nueva foto.' });
    } catch (error) {
      toast({
        description:
          'Foto guardada, pero hubo un problema al refrescar tu sesión.',
        variant: 'default'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tu Perfil</CardTitle>
        <CardDescription>Actualiza tu nombre y foto de perfil.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmitName)}>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="user-profile-name">Tu Nombre</Label>
            <Input
              id="user-profile-name"
              placeholder="Tu nombre completo"
              {...register('name')}
              className={cn(errors.name && 'border-destructive')}
              disabled={isSubmitting}
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

      <CardContent>
        <hr className="my-6" />
        <div className="space-y-2">
          <Label className="text-base font-medium">Foto de Perfil</Label>
          <p className="text-sm text-muted-foreground">
            Sube o cambia tu foto (PNG, JPG, WEBP, GIF).
          </p>
        </div>
        <div className="mt-4">
          <ProfilePictureUploadForm
            currentImageUrl={currentUserImage}
            onUploadSuccess={handlePictureUpdateSuccess}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileSettings;
