'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

function DeniedMessage() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');

  let title = 'Acceso Denegado';
  let message = 'No tienes permiso para acceder o tu sesión ha expirado.';

  if (errorCode === 'NoInvitation') {
    title = 'Invitación Requerida';
    message =
      'No hemos encontrado una cuenta existente ni una invitación pendiente válida para tu email. Para acceder, necesitas recibir una invitación de un miembro del equipo.';
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            {title}
          </CardTitle>
          {message && <CardDescription>{message}</CardDescription>}
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/login">Ir a Inicio de Sesión</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeniedPage() {
  return (
    <Suspense fallback={<div>Cargando mensaje...</div>}>
      <DeniedMessage />
    </Suspense>
  );
}
