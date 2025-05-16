'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { XCircle, ShoppingCart, Home } from 'lucide-react';

export default function CancelledPageClientContent() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12 px-4 text-center">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-red-100 dark:bg-red-900/30 p-3 rounded-full w-fit">
            <XCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold mt-4">
            Proceso de Pago Cancelado
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Parece que has cancelado el proceso de suscripción o algo no ha
            salido como esperábamos. No te preocupes, no se ha realizado ningún
            cargo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Si fue un error o cambiaste de opinión, puedes volver a intentarlo.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/ajustes/suscripcion">
              <ShoppingCart className="mr-2 h-4 w-4" /> Ver Planes de
              Suscripción
            </Link>
          </Button>
          <Button className="w-full sm:w-auto" asChild>
            <Link href="/pedidos">
              <Home className="mr-2 h-4 w-4" /> Ir a Mi Panel
            </Link>
          </Button>
        </CardFooter>
      </Card>
      <p className="mt-8 text-xs text-muted-foreground">
        Si tienes algún problema, no dudes en{' '}
        <Link href="/contacto" className="underline hover:text-primary">
          contactar con soporte
        </Link>
        .
      </p>
    </div>
  );
}
