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
import { Github, Chrome } from 'lucide-react';

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    await signIn('google', { callbackUrl: '/' });
  };

  const handleGitHubSignIn = async () => {
    await signIn('github', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen flex justify-center items-start md:items-center p-4 sm:p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          {/* TODO: Add logo here */}
          {/* <img src="/logo.png" alt="Logo" className="w-20 h-20 mx-auto mb-4" /> */}
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Accede a tu panel de control de Aura Bakery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full"
          >
            <Chrome className="mr-2 h-4 w-4" />
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
