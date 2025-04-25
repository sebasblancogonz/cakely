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
import Image from 'next/image';
import { cn } from '@/lib/utils';

const businessProfileSchema = z.object({
  name: z.string().min(1, 'El nombre del negocio es requerido.'),
  logoUrl: z
    .string()
    .url('Debe ser una URL válida o estar vacío.')
    .or(z.literal(''))
    .optional()
});

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

interface BusinessProfileSettingsProps {
  currentName: string | null;
  currentLogoUrl: string | null;
  loadingProfile: boolean;
  onSaveProfile: (data: BusinessProfileFormData) => Promise<void>;
}

const BusinessProfileSettings: React.FC<BusinessProfileSettingsProps> = ({
  currentName,
  currentLogoUrl,
  loadingProfile,
  onSaveProfile
}) => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: currentName ?? '',
      logoUrl: currentLogoUrl ?? ''
    }
  });

  useEffect(() => {
    reset({
      name: currentName ?? '',
      logoUrl: currentLogoUrl ?? ''
    });
  }, [currentName, currentLogoUrl, reset]);

  const onSubmit = async (data: BusinessProfileFormData) => {
    if (!isDirty) {
      toast({
        title: 'Sin Cambios',
        description: 'No has modificado los datos del perfil.'
      });
      return;
    }
    await onSaveProfile(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil del Negocio</CardTitle>
        <CardDescription>
          Define el nombre y logo que verán tus clientes.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {loadingProfile ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Nombre del Negocio</Label>
                <Input
                  id="profile-name"
                  placeholder="Mi Pastelería Creativa"
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
                <Label htmlFor="profile-logoUrl">URL del Logo (Opcional)</Label>
                <Input
                  id="profile-logoUrl"
                  placeholder="https://ejemplo.com/logo.png"
                  {...register('logoUrl')}
                  className={cn(errors.logoUrl && 'border-destructive')}
                />
                {errors.logoUrl && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.logoUrl.message}
                  </p>
                )}
              </div>

              {currentLogoUrl && (
                <div className="space-y-1.5">
                  <Label>Logo Actual</Label>
                  <div className="relative h-24 w-24 rounded-md overflow-hidden border p-1">
                    <Image
                      src={currentLogoUrl}
                      alt="Logo Actual"
                      layout="fill"
                      objectFit="contain"
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || loadingProfile}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Perfil
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default BusinessProfileSettings;
