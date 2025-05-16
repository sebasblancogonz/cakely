'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useBusinessProfile } from '@/hooks/use-business-profile';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { mutateProfile } = useBusinessProfile();

  const [status, setStatus] = useState<
    'loading' | 'success' | 'error' | 'requires_action'
  >('loading');
  const [message, setMessage] = useState('Verificando el estado de tu pago...');
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setMessage('ID de sesión no encontrado. Redirigiendo...');
      setStatus('error');
      setTimeout(() => router.push('/'), 3000);
      return;
    }

    async function verifySession() {
      try {
        const response = await fetch(
          `/api/stripe/checkout-session-status?sessionId=${sessionId}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Error al verificar la sesión.');
        }

        if (data.payment_status === 'paid' || data.status === 'complete') {
          setMessage('¡Tu suscripción se ha activado correctamente!');
          if (data.subscription_id?.startsWith('sub_')) {
            setMessage('¡Tu prueba gratuita se ha iniciado correctamente!');
          }
          setStatus('success');
          setSubscriptionId(data.subscription_id);
          toast({
            title: '¡Éxito!',
            description: 'Tu suscripción o prueba está activa.'
          });
          mutateProfile();
          setTimeout(() => router.push('/pedidos'), 4000);
        } else if (data.status === 'open' && data.payment_status === 'unpaid') {
          setMessage('¡Tu prueba gratuita se ha iniciado correctamente!');
          setStatus('success');
          setSubscriptionId(data.subscription_id);
          toast({
            title: '¡Éxito!',
            description: 'Tu prueba gratuita está activa.'
          });
          mutateProfile();
          setTimeout(() => router.push('/pedidos'), 4000);
        } else if (data.payment_status === 'requires_action') {
          setMessage(
            'Tu pago requiere acción adicional. Por favor, sigue las instrucciones.'
          );
          setStatus('requires_action');
        } else {
          setMessage(
            `Estado del pago: ${data.payment_status}. Contacta con soporte si el problema persiste.`
          );
          setStatus('error');
        }
      } catch (error: any) {
        console.error('Error verificando sesión:', error);
        setMessage(error.message || 'Ocurrió un error al verificar tu pago.');
        setStatus('error');
      }
    }

    verifySession();
  }, [searchParams, router, toast, mutateProfile]);

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12">
      {status === 'loading' && (
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      )}
      {status === 'success' && (
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
      )}
      {status === 'error' && (
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      )}
      {status === 'requires_action' && (
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
      )}

      <h1 className="text-3xl font-bold mb-2">
        {status === 'success'
          ? '¡Operación Exitosa!'
          : status === 'error'
            ? 'Hubo un Problema'
            : status === 'requires_action'
              ? 'Acción Requerida'
              : 'Procesando...'}
      </h1>
      <p className="text-muted-foreground text-lg mb-8 text-center max-w-md">
        {message}
      </p>
      {subscriptionId && status === 'success' && (
        <p className="text-sm text-muted-foreground">
          ID de Suscripción: {subscriptionId}
        </p>
      )}
      {(status === 'error' ||
        status === 'success' ||
        status === 'requires_action') && (
        <Button onClick={() => router.push('/pedidos')} className="mt-6">
          Ir a mi panel
        </Button>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
