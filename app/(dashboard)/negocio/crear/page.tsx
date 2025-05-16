'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createBusinessFormSchema,
  CreateBusinessFormData
} from '@/lib/validators/business';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function CreateBusinessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session, update: updateSession } = useSession();

  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isRHFSubmitting },
    reset
  } = useForm<CreateBusinessFormData>({
    resolver: zodResolver(createBusinessFormSchema),
    defaultValues: {
      name: ''
    }
  });

  const onSubmit: SubmitHandler<CreateBusinessFormData> = async (data) => {
    setIsSubmittingForm(true);
    console.log('Creando negocio con:', data);

    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al crear el negocio.');
      }

      toast({
        title: '¡Negocio Creado!',
        description: `El negocio "${result.name}" ha sido creado exitosamente.`
      });

      await updateSession({
        trigger: 'update'
      });

      reset();

      const redirectTo = searchParams.get('redirectTo');
      if (redirectTo) {
        console.log(`Redirigiendo a (desde redirectTo): ${redirectTo}`);
        router.push(redirectTo);
      } else {
        console.log('Redirigiendo al panel de pedidos.');
        router.push('/pedidos');
      }
    } catch (error: any) {
      console.error('Error al crear el negocio:', error);
      toast({
        title: 'Error',
        description:
          error.message || 'No se pudo crear el negocio. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  useEffect(() => {
    if (session?.user?.businessId) {
      console.log(
        'Usuario ya tiene businessId, redirigiendo desde /negocio/crear'
      );
      const redirectTo = searchParams.get('redirectTo');
      router.replace(redirectTo || '/pedidos');
    }
  }, [session, router, searchParams]);

  if (session && session.user && session.user.businessId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          Ya tienes un negocio asociado, redirigiendo...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            ¡Bienvenido/a a Cakely!
          </CardTitle>
          <CardDescription className="text-center pt-1">
            Empecemos creando tu negocio. Solo necesitas un nombre para
            comenzar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="business-name-create">
                Nombre de tu Negocio/Pastelería
              </Label>
              <Input
                id="business-name-create"
                placeholder="Ej: Dulces Creaciones de Ana"
                {...register('name')}
                autoFocus
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            {/* Podrías añadir más campos aquí si quieres */}
            <Button
              type="submit"
              className="w-full"
              disabled={isRHFSubmitting || isSubmittingForm}
            >
              {(isRHFSubmitting || isSubmittingForm) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear Negocio y Continuar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
