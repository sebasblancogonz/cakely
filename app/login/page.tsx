'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import Image from 'next/image';
import { Google } from '@/components/icons';

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    await signIn('google', { callbackUrl: '/' });
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
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Accede al panel de control de tu negocio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full"
          >
            <Google />
            Continuar con Google
          </Button>
        </CardContent>
        <CardFooter className="text-xs text-center text-muted-foreground">
          Al continuar, aceptas nuestros Términos y Política de Privacidad.
        </CardFooter>
      </Card>
    </div>
  );
}
