'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { getStripe } from '@/lib/stripe/getStripe';

export default function SubscribePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const { toast } = useToast();

  const [priceId, setPriceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('priceId');
    if (id) {
      setPriceId(id);
    } else {
      setErrorMessage(
        'No se especificó un plan. Volviendo a la página principal...'
      );
      setTimeout(() => router.push('/'), 3000);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!priceId || isLoading) return;

    if (sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      const callbackUrl = `${pathname}?priceId=${priceId}`;
      signIn(undefined, { callbackUrl });

      return;
    }

    if (sessionStatus === 'authenticated') {
      const createCheckout = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        toast({ title: 'Procesando tu suscripción...' });

        try {
          const response = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId })
          });

          const sessionData = await response.json();

          if (!response.ok || !sessionData.sessionId) {
            throw new Error(
              sessionData.message || 'No se pudo iniciar el checkout.'
            );
          }

          const stripe = await getStripe();
          if (!stripe) throw new Error('Stripe.js no se cargó.');

          const { error } = await stripe.redirectToCheckout({
            sessionId: sessionData.sessionId
          });

          if (error) throw error;
        } catch (error: any) {
          setErrorMessage(
            error.message ||
              'No se pudo procesar tu suscripción. Inténtalo de nuevo o contacta soporte.'
          );
          toast({
            title: 'Error de Suscripción',
            description: error.message || 'Inténtalo de nuevo.',
            variant: 'destructive'
          });
          setIsLoading(false);
        }
      };
      createCheckout();
    }
  }, [priceId, sessionStatus, router, pathname, toast, isLoading]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Procesando Suscripción</CardTitle>
          <CardDescription className="text-center">
            {errorMessage
              ? 'Ha ocurrido un error'
              : 'Espera un momento, te estamos redirigiendo a la pasarela de pago segura...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          {isLoading || sessionStatus === 'loading' ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          ) : null}
          {errorMessage && (
            <p className="text-red-600 text-center">{errorMessage}</p>
          )}
          {errorMessage && (
            <Button onClick={() => router.push('/')} variant="outline">
              Volver a la página principal
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
