'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  CheckCircle,
  XCircle,
  LogIn,
  UserPlus,
  AlertTriangle
} from 'lucide-react';

import { useSession, signIn, signOut } from 'next-auth/react';

interface InvitationDetails {
  email: string;
  role: string;
  businessName: string;
}

function AcceptInvitationClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();

  const [isLoadingVerify, setIsLoadingVerify] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [invitationDetails, setInvitationDetails] =
    useState<InvitationDetails | null>(null);

  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === 'authenticated';
  const isLoadingSession = sessionStatus === 'loading';

  useEffect(() => {
    if (!token) {
      setVerificationError('Token de invitación no encontrado en la URL.');
      setIsLoadingVerify(false);
      return;
    }

    setIsLoadingVerify(true);
    setVerificationError(null);
    setInvitationDetails(null);

    const verifyToken = async () => {
      try {
        const response = await fetch(
          `/api/invitations/verify?token=${encodeURIComponent(token)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Error al verificar la invitación.');
        }
        setInvitationDetails(data as InvitationDetails);
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationError(
          error instanceof Error
            ? error.message
            : 'Error desconocido al verificar.'
        );
      } finally {
        setIsLoadingVerify(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleAccept = async () => {
    if (!token || !isAuthenticated || !invitationDetails || isProcessingAction)
      return;

    if (
      session?.user?.email?.toLowerCase() !==
      invitationDetails.email.toLowerCase()
    ) {
      setActionError(
        'Debes iniciar sesión con el email de la invitación para aceptar.'
      );
      return;
    }

    setIsProcessingAction(true);
    setActionError(null);
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al aceptar');

      toast({
        title: '¡Invitación Aceptada!',
        description: `Ahora eres miembro de ${invitationDetails.businessName}.`
      });
      setTimeout(() => router.push('/'), 1500);
    } catch (error) {
      console.error('Acceptance error:', error);
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      setActionError(message);
      toast({
        title: 'Error al Aceptar',
        description: message,
        variant: 'destructive'
      });
      setIsProcessingAction(false);
    }
  };

  const handleDecline = async () => {
    if (!token || isProcessingAction) return;
    if (!confirm('¿Estás seguro de que quieres rechazar esta invitación?'))
      return;

    setIsProcessingAction(true);
    setActionError(null);
    try {
      const response = await fetch('/api/invitations/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al rechazar');

      toast({ title: 'Invitación Rechazada' });
      setTimeout(() => router.push('/'), 1500);
    } catch (error) {
      console.error('Decline error:', error);
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      setActionError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setIsProcessingAction(false);
    }
  };

  if (isLoadingVerify || isLoadingSession) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{verificationError}</p>
            <Button
              onClick={() => router.push('/')}
              className="mt-4"
              variant="outline"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitationDetails) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <p>No se pudieron cargar los detalles de la invitación.</p>
      </div>
    );
  }

  if (
    isAuthenticated &&
    session?.user?.email?.toLowerCase() ===
      invitationDetails.email.toLowerCase()
  ) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4 bg-muted/40">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>¡Has sido invitado!</CardTitle>
            <CardDescription>
              {session?.user?.name || 'Alguien'} te ha invitado a unirte a{' '}
              <strong className="font-semibold">
                {invitationDetails.businessName}
              </strong>{' '}
              como{' '}
              <strong className="font-semibold">
                {invitationDetails.role}
              </strong>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conectado como: {session.user.email}
            </p>
            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={handleAccept}
                disabled={isProcessingAction}
                className="w-full sm:w-auto"
              >
                {isProcessingAction ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Aceptar Invitación
              </Button>
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={isProcessingAction}
                className="w-full sm:w-auto"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    isAuthenticated &&
    session?.user?.email?.toLowerCase() !==
      invitationDetails.email.toLowerCase()
  ) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4 bg-muted/40">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Cuenta Incorrecta</CardTitle>
            <CardDescription>
              Esta invitación es para{' '}
              <strong className="font-semibold">
                {invitationDetails.email}
              </strong>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Actualmente has iniciado sesión como{' '}
              <strong className="font-semibold">{session?.user?.email}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Por favor, cierra sesión y vuelve a entrar o regístrate con la
              cuenta de email correcta para aceptar.
            </p>
            <Button
              onClick={() =>
                signOut({ callbackUrl: `/accept-invitation?token=${token}` })
              }
              variant="outline"
            >
              Cerrar sesión e intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4 bg-muted/40">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>¡Has sido invitado!</CardTitle>
            <CardDescription>
              A unirte a{' '}
              <strong className="font-semibold">
                {invitationDetails.businessName}
              </strong>{' '}
              como{' '}
              <strong className="font-semibold">
                {invitationDetails.role}
              </strong>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para aceptar, por favor inicia sesión o crea una cuenta usando el
              email:
            </p>
            <p className="font-semibold">{invitationDetails.email}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              {/* Botón Iniciar Sesión */}
              <Button
                onClick={() =>
                  signIn(undefined, {
                    callbackUrl: `/accept-invitation?token=${token}`
                  })
                }
                className="w-full sm:w-auto"
              >
                <LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <p>Estado inesperado.</p>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AcceptInvitationClientContent />
    </Suspense>
  );
}
