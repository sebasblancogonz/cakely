'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

type PageStatus =
  | 'initial_loading'
  | 'verifying_payment'
  | 'waiting_db_sync'
  | 'updating_auth_session'
  | 'success'
  | 'requires_action'
  | 'error';

const POLLING_API_INTERVAL_MS = 3000;
const MAX_POLLING_ATTEMPTS = 10;

export default function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: currentNextAuthSession, update: updateNextAuthSession } =
    useSession();

  const [pageStatus, setPageStatus] = useState<PageStatus>('initial_loading');
  const [message, setMessage] = useState(
    'Verificando el estado de tu pago, por favor espera...'
  );
  const [stripeSubscriptionIdUi, setStripeSubscriptionIdUi] = useState<
    string | null
  >(null);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);
  const currentProcessingSessionIdRef = useRef<string | null>(null);

  const isMountedRef = useRef(true);

  const runVerificationFlow = useCallback(
    async (sessionId: string) => {
      if (
        currentProcessingSessionIdRef.current === sessionId &&
        attemptsRef.current > 0 &&
        pageStatus !== 'waiting_db_sync' &&
        pageStatus !== 'verifying_payment'
      ) {
        console.log(
          `[Pago Éxito] runVerificationFlow: Proceso ya en curso o finalizado para ${sessionId}. Estado: ${pageStatus}`
        );
        return;
      }

      attemptsRef.current += 1;
      console.log(
        `[Pago Éxito] Iniciando Flujo de Verificación (intento ${attemptsRef.current}) para sessionId:`,
        sessionId
      );

      if (isMountedRef.current && attemptsRef.current === 1) {
        setPageStatus('verifying_payment');
        setMessage('Confirmando tu pago con nuestro sistema...');
      }

      try {
        const response = await fetch(
          `/api/stripe/checkout-session-status?sessionId=${sessionId}`
        );
        const data = await response.json();

        if (!isMountedRef.current) return;

        if (!response.ok && response.status !== 202) {
          throw new Error(
            data.message || 'Error al verificar la sesión de pago (API local).'
          );
        }
        console.log(
          '[Pago Éxito] Datos recibidos de /api/stripe/checkout-session-status:',
          data
        );

        if (
          data.statusNeedsRefresh === true &&
          attemptsRef.current < MAX_POLLING_ATTEMPTS
        ) {
          if (isMountedRef.current) {
            setMessage(
              'Procesamiento de Stripe exitoso. Finalizando la configuración de tu cuenta, un momento más...'
            );
            setPageStatus('waiting_db_sync');
            console.log(
              `[Pago Éxito] DB aún no actualizada (según API), reintentando en ${POLLING_API_INTERVAL_MS / 1000}s...`
            );
          }
          pollingTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) runVerificationFlow(sessionId);
          }, POLLING_API_INTERVAL_MS);
          return;
        }
        if (
          data.statusNeedsRefresh === true &&
          attemptsRef.current >= MAX_POLLING_ATTEMPTS
        ) {
          throw new Error(
            'No se pudo confirmar la actualización de tu cuenta después de varios intentos. Por favor, contacta a soporte o revisa tu panel en unos minutos.'
          );
        }

        if (
          data.stripePaymentStatus === 'paid' ||
          data.stripeCheckoutStatus === 'complete' ||
          (data.stripeCheckoutStatus === 'open' &&
            data.stripePaymentStatus === 'unpaid')
        ) {
          let successMsg = `¡Tu suscripción (${data.cakelySubscriptionStatus || 'estado desconocido'}) está activa!`;
          if (data.cakelySubscriptionStatus === 'trialing') {
            successMsg = '¡Tu prueba gratuita se ha iniciado correctamente!';
          }

          if (isMountedRef.current) {
            setMessage(successMsg + ' Actualizando tu sesión de usuario...');
            setStripeSubscriptionIdUi(data.stripeSubscriptionId);
            setPageStatus('updating_auth_session');
            toast({
              title: '¡Pago Confirmado!',
              description: 'Actualizando tu sesión...'
            });
          }

          console.log(
            '[Pago Éxito] DB confirmada. Llamando a updateNextAuthSession() con datos explícitos.'
          );

          currentProcessingSessionIdRef.current = sessionId;

          if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);

          await updateNextAuthSession({
            triggerInfo: {
              event: 'SUBSCRIPTION_UPDATED_AFTER_PAYMENT',
              newSubscriptionStatus: data.cakelySubscriptionStatus,
              newStripeCurrentPeriodEnd: data.cakelyStripeCurrentPeriodEnd,
              newIsLifetime: data.cakelyIsLifetime,
              businessId:
                data.affectedBusinessId ||
                currentNextAuthSession?.user?.businessId
            }
          });

          if (isMountedRef.current) {
            console.log(
              '[Pago Éxito] Solicitud de actualización de sesión NextAuth enviada.'
            );
            setPageStatus('success');
          }
        } else if (
          data.stripePaymentStatus === 'requires_action' ||
          data.stripeCheckoutStatus === 'open'
        ) {
          if (isMountedRef.current) {
            setMessage(
              'Tu pago requiere acción adicional o aún está en proceso.'
            );
            setPageStatus('requires_action');
          }
          currentProcessingSessionIdRef.current = sessionId;
        } else {
          if (isMountedRef.current) {
            setMessage(
              `Estado: ${data.stripePaymentStatus || data.stripeCheckoutStatus}. Contacta soporte.`
            );
            setPageStatus('error');
          }
          currentProcessingSessionIdRef.current = sessionId;
        }
      } catch (error: any) {
        console.error('Error en runVerificationFlow:', error);
        if (isMountedRef.current) {
          setMessage(error.message || 'Ocurrió un error al verificar tu pago.');
          setPageStatus('error');
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive'
          });
        }
        currentProcessingSessionIdRef.current = sessionId;
      }
    },
    [toast, updateNextAuthSession, currentNextAuthSession?.user?.businessId]
  );

  useEffect(() => {
    isMountedRef.current = true;
    const sessionIdFromUrl = searchParams.get('session_id');

    if (!sessionIdFromUrl) {
      if (isMountedRef.current) {
        setMessage('ID de sesión no encontrado. Serás redirigido.');
        setPageStatus('error');
        setTimeout(() => {
          if (isMountedRef.current) router.push('/ajustes/suscripcion');
        }, 3000);
      }
      return () => {
        isMountedRef.current = false;
        if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
      };
    }

    if (pageStatus === 'initial_loading' && sessionIdFromUrl) {
      if (sessionIdFromUrl !== currentProcessingSessionIdRef.current) {
        console.log(
          `[Pago Éxito] useEffect: Nuevo sessionId ${sessionIdFromUrl}. Iniciando runVerificationFlow.`
        );

        attemptsRef.current = 0;
        if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
        runVerificationFlow(sessionIdFromUrl);
      }
    }

    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [searchParams, pageStatus, router, runVerificationFlow]);

  useEffect(() => {
    let redirectTimer: NodeJS.Timeout;
    if (pageStatus === 'success') {
      console.log(
        "[Pago Éxito] pageStatus 'success', programando redirección a /pedidos?session_refresh_required=true"
      );
      redirectTimer = setTimeout(() => {
        router.push('/pedidos?session_refresh_required=true');
      }, 1500);
    }
    return () => clearTimeout(redirectTimer);
  }, [pageStatus, router]);

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card shadow-xl rounded-lg">
        <div className="flex flex-col items-center text-center">
          {(pageStatus === 'initial_loading' ||
            pageStatus === 'verifying_payment' ||
            pageStatus === 'waiting_db_sync' ||
            pageStatus === 'updating_auth_session') && (
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
          )}
          {pageStatus === 'success' && (
            <CheckCircle className="h-16 w-16 text-green-500 mb-6" />
          )}
          {pageStatus === 'error' && (
            <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
          )}
          {pageStatus === 'requires_action' && (
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-6" />
          )}

          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {pageStatus === 'success'
              ? '¡Todo Listo!'
              : pageStatus === 'error'
                ? 'Hubo un Problema'
                : pageStatus === 'requires_action'
                  ? 'Acción Requerida'
                  : pageStatus === 'waiting_db_sync'
                    ? 'Finalizando Configuración...'
                    : pageStatus === 'updating_auth_session'
                      ? 'Actualizando tu Sesión...'
                      : pageStatus === 'verifying_payment'
                        ? 'Verificando Pago...'
                        : 'Procesando Tu Solicitud...'}
          </h1>
          <p className="text-muted-foreground text-md max-w-sm">{message}</p>
          {stripeSubscriptionIdUi && pageStatus === 'success' && (
            <p className="text-xs text-muted-foreground mt-4">
              ID de Suscripción (Stripe): {stripeSubscriptionIdUi}
            </p>
          )}
        </div>

        {(pageStatus === 'error' ||
          pageStatus === 'success' ||
          pageStatus === 'requires_action') && (
          <Button
            onClick={() => router.push('/pedidos')}
            className="w-full mt-6"
          >
            Ir a Mi Panel
          </Button>
        )}
        {pageStatus === 'error' && (
          <Button
            onClick={() => router.push('/ajustes/suscripcion')}
            variant="outline"
            className="w-full mt-2"
          >
            Ver Planes de Suscripción
          </Button>
        )}
      </div>
    </div>
  );
}
