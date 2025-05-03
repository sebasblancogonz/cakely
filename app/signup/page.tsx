'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Google } from '@/components/icons';
import Image from 'next/image';

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailHint = searchParams.get('email');
  const callbackUrl = searchParams.get('callbackUrl');

  const handleGoogleSignUp = async () => {
    try {
      const result = await signIn('google', {
        callbackUrl: callbackUrl || '/accept-invitation'
      });

      if (result?.error) {
        console.error('Google Sign-In Error en /signup:', result.error);
        toast({
          title: 'Error de inicio de sesión',
          description: result.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Sign-Up/Sign-In failed:', error);

      toast({
        title: 'Error',
        description: 'No se pudo iniciar sesión/registrar.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-start md:items-center p-4 sm:p-8">
      <Card className="w-full max-w-sm border-none shadow-none">
        <CardHeader className="text-center">
          <Image
            src="/img/logo.webp"
            width={80}
            height={80}
            alt="Cakely"
            className="mx-auto mb-4 rounded-lg"
          />
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>
            {emailHint
              ? `Usa Google con ${emailHint} para crear tu cuenta y aceptar la invitación.`
              : 'Usa un proveedor para crear tu cuenta.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Button
            onClick={handleGoogleSignUp}
            variant="outline"
            className="w-full"
          >
            <Google />
            Continuar con Google
          </Button>
          <CardFooter className="text-xs text-center text-muted-foreground">
            Al continuar, aceptas nuestros Términos y Política de Privacidad.
          </CardFooter>
          <Button
            variant="link"
            size="sm"
            onClick={() =>
              router.push(
                callbackUrl
                  ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : '/login'
              )
            }
          >
            ¿Ya tienes cuenta? Inicia Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
