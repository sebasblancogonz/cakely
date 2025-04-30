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
import LogoUploadForm from '../forms/UploadImageForm';

const businessNameSchema = z.object({
  name: z.string().min(1, 'El nombre del negocio es requerido.')
});

type BusinessNameFormData = z.infer<typeof businessNameSchema>;

interface BusinessProfileSettingsProps {
  currentName: string | null;
  currentLogoUrl: string | null;
  loadingProfile: boolean;
  onSaveProfile: (data: BusinessNameFormData) => Promise<void>;
  businessId: number | undefined;
  mutateProfile: () => void;
}

const BusinessProfileSettings: React.FC<BusinessProfileSettingsProps> = ({
  currentName,
  currentLogoUrl,
  loadingProfile,
  onSaveProfile,
  businessId,
  mutateProfile
}) => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<BusinessNameFormData>({
    resolver: zodResolver(businessNameSchema),
    defaultValues: {
      name: currentName ?? ''
    }
  });

  useEffect(() => {
    reset({
      name: currentName ?? ''
    });
  }, [currentName, reset]);

  const onSubmitName = async (data: BusinessNameFormData) => {
    if (!isDirty) {
      toast({
        title: 'Sin Cambios',
        description: 'No has modificado el nombre del negocio.'
      });
      return;
    }
    await onSaveProfile(data);
  };

  const handleLogoUpdateSuccess = () => {
    mutateProfile();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil del Negocio</CardTitle>
        <CardDescription>
          Define el nombre y logo que verán tus clientes.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmitName)}>
        <CardContent className="space-y-4">
          {loadingProfile ? (
            <div className="flex items-center justify-center h-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
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
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || loadingProfile}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Nombre
          </Button>
        </CardFooter>
      </form>

      <CardContent>
        <hr className="my-6" />
        <div className="space-y-2">
          <Label className="text-base font-medium">Logo del Negocio</Label>
          <p className="text-sm text-muted-foreground">
            Sube o cambia el logo (SVG o PNG).
          </p>
        </div>

        {loadingProfile ? (
          <div className="flex items-center justify-center h-20 mt-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : businessId ? (
          <div className="mt-4">
            <LogoUploadForm
              businessId={businessId}
              currentLogoUrl={currentLogoUrl}
              onUploadSuccess={handleLogoUpdateSuccess}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-4">
            No se pudo cargar la información para la subida del logo.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BusinessProfileSettings;
