'use client';

import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

type PageStatus =
  | 'initial_loading'
  | 'session_id_missing'
  | 'verifying_payment'
  | 'polling_api_db'
  | 'updating_auth_session'
  | 'success'
  | 'requires_action'
  | 'error';

const POLLING_INTERVAL_MS = 2500;
const MAX_POLLING_ATTEMPTS = 8;

export default function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    data: currentNextAuthSession,
    update: updateNextAuthSession,
    status: sessionHookStatus
  } = useSession();

  const [pageStatus, setPageStatus] = useState<PageStatus>('initial_loading');
  const [message, setMessage] = useState(
    'Validando información, por favor espera...'
  );
  const [stripeSubscriptionIdUi, setStripeSubscriptionIdUi] = useState<
    string | null
  >(null);

  const attemptsRef = useRef(0);
  const pollingTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const componentIsMountedRef = useRef(true);
  const sessionRef = useRef(currentNextAuthSession);
  const hasProcessedSessionIdRef = useRef<Set<string>>(new Set());

  const sessionIdFromUrl = useMemo(() => {
    return searchParams.get('session_id');
  }, [searchParams]);

  useEffect(() => {
    sessionRef.current = currentNextAuthSession;
  }, [currentNextAuthSession]);

  useEffect(() => {
    console.log(
      `[SuccessPageContent] MOUNTED. Initial pageStatus: ${pageStatus}`
    );
    componentIsMountedRef.current = true;

    if (
      sessionIdFromUrl &&
      hasProcessedSessionIdRef.current.has(sessionIdFromUrl) &&
      pageStatus === 'initial_loading'
    ) {
      console.warn(
        `[SuccessPageContent] MOUNT: Session ID ${sessionIdFromUrl} was already processed (likely Fast Refresh). Determining final status.`
      );
    }

    return () => {
      console.log('[SuccessPageContent] UNMOUNTING');
      componentIsMountedRef.current = false;
      if (pollingTimeoutIdRef.current) {
        clearTimeout(pollingTimeoutIdRef.current);
      }
    };
  }, []);

  const stableToast = useCallback(toast, [toast]);
  const stableUpdateNextAuthSession = useCallback(updateNextAuthSession, [
    updateNextAuthSession
  ]);

  const pollApiForStatus = useCallback(
    async (
      currentSessionId: string,
      currentAttempt: number,
      abortSignal: AbortSignal
    ) => {
      if (!componentIsMountedRef.current) {
        console.log(
          `[Polling ${currentSessionId}] Abort: Component unmounted (pollApiForStatus start).`
        );
        return;
      }

      if (componentIsMountedRef.current) {
        if (currentAttempt === 0 && pageStatus !== 'verifying_payment') {
          setPageStatus('verifying_payment');
          setMessage('Confirmando tu pago con nuestro sistema...');
        } else if (currentAttempt > 0 && pageStatus !== 'polling_api_db') {
          setPageStatus('polling_api_db');
        }

        setMessage(`Verificando estado...`);
      }

      try {
        const response = await fetch(
          `/api/stripe/checkout-session-status?sessionId=${currentSessionId}`,
          { signal: abortSignal }
        );

        if (abortSignal.aborted || !componentIsMountedRef.current) {
          console.log(
            `[Polling ${currentSessionId}] Abort: Fetch aborted or component unmounted after fetch.`
          );
          return;
        }

        const data = await response.json();

        if (!response.ok && response.status !== 202) {
          throw new Error(
            data.message || 'Error al verificar la sesión de pago (API).'
          );
        }
        console.log(
          `[Polling ${currentSessionId}] API Data (Attempt ${currentAttempt + 1}):`,
          data
        );

        if (
          data.statusNeedsRefresh === true &&
          currentAttempt < MAX_POLLING_ATTEMPTS - 1
        ) {
          if (componentIsMountedRef.current) {
            pollingTimeoutIdRef.current = setTimeout(
              () =>
                pollApiForStatus(
                  currentSessionId,
                  currentAttempt + 1,
                  abortSignal
                ),
              POLLING_INTERVAL_MS
            );
          }
          return;
        }

        if (
          data.statusNeedsRefresh === true &&
          currentAttempt >= MAX_POLLING_ATTEMPTS - 1
        ) {
          throw new Error(
            'No se pudo confirmar actualización tras varios intentos. Contacta a soporte.'
          );
        }

        if (pollingTimeoutIdRef.current)
          clearTimeout(pollingTimeoutIdRef.current);

        if (
          data.stripePaymentStatus === 'paid' ||
          data.stripeCheckoutStatus === 'complete' ||
          (data.stripeCheckoutStatus === 'open' &&
            data.stripePaymentStatus === 'unpaid' &&
            data.cakelySubscriptionStatus)
        ) {
          if (!componentIsMountedRef.current) return;

          let successMsg = `¡Suscripción (${data.cakelySubscriptionStatus || 'desconocido'}) activa!`;
          if (data.cakelySubscriptionStatus === 'trialing') {
            successMsg = '¡Prueba gratuita iniciada correctamente!';
          }

          if (componentIsMountedRef.current) {
            setMessage(successMsg + ' Actualizando sesión...');
            setStripeSubscriptionIdUi(data.stripeSubscriptionId);
            setPageStatus('updating_auth_session');
          }

          if (stableToast && componentIsMountedRef.current) {
            stableToast({
              title: '¡Pago Confirmado!',
              description: 'Actualizando sesión...'
            });
          }

          console.log(
            `[Polling ${currentSessionId}] Calling updateNextAuthSession...`
          );
          const businessIdForUpdate = sessionRef.current?.user?.businessId;

          if (stableUpdateNextAuthSession && componentIsMountedRef.current) {
            await stableUpdateNextAuthSession({
              triggerInfo: {
                businessId: data.affectedBusinessId || businessIdForUpdate
              }
            });
          }

          if (componentIsMountedRef.current) {
            console.log(
              `[Polling ${currentSessionId}] Session update done. PageStatus -> success.`
            );
            hasProcessedSessionIdRef.current.add(currentSessionId);
            setPageStatus('success');
          }
        } else if (data.stripeCheckoutStatus === 'expired') {
          if (componentIsMountedRef.current) {
            setMessage('Sesión de pago expirada. Intenta de nuevo.');
            hasProcessedSessionIdRef.current.add(currentSessionId);
            setPageStatus('error');
            if (stableToast)
              stableToast({ title: 'Sesión Expirada', variant: 'destructive' });
          }
        } else {
          if (componentIsMountedRef.current) {
            const displayStatus =
              data.stripePaymentStatus ||
              data.stripeCheckoutStatus ||
              'desconocido';
            setMessage(
              `Estado de pago inesperado: ${displayStatus}. Contacta a soporte.`
            );
            hasProcessedSessionIdRef.current.add(currentSessionId);
            setPageStatus('error');
            if (stableToast)
              stableToast({
                title: 'Estado Inesperado',
                description: `Recibido: ${displayStatus}.`,
                variant: 'destructive'
              });
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || abortSignal.aborted) {
          console.log(
            `[Polling ${currentSessionId}] Fetch explicitly aborted (Attempt ${currentAttempt + 1}).`
          );
          return;
        }
        console.error(
          `Error en pollApiForStatus (${currentSessionId}, Attempt ${currentAttempt + 1}):`,
          error
        );
        if (pollingTimeoutIdRef.current)
          clearTimeout(pollingTimeoutIdRef.current);
        if (componentIsMountedRef.current) {
          setMessage(error.message || 'Error verificando tu pago.');
          hasProcessedSessionIdRef.current.add(currentSessionId);
          setPageStatus('error');
          if (stableToast)
            stableToast({
              title: 'Error de Verificación',
              description: error.message || 'No se pudo verificar.',
              variant: 'destructive'
            });
        }
      }
    },
    [stableToast, stableUpdateNextAuthSession, pageStatus]
  );

  useEffect(() => {
    console.log(
      `[SuccessPageContent] Main polling EFFECT RUN. sessionIdFromUrl: ${sessionIdFromUrl}, current pageStatus: ${pageStatus}, hook sessionStatus: ${sessionHookStatus}`
    );

    if (!sessionIdFromUrl) {
      if (
        componentIsMountedRef.current &&
        pageStatus !== 'session_id_missing'
      ) {
        console.log(
          '[SuccessPageContent] Setting status to session_id_missing due to no sessionIdFromUrl.'
        );
        setPageStatus('session_id_missing');
        setMessage('ID de sesión no encontrado. Serás redirigido.');
        if (stableToast)
          stableToast({
            title: 'Error',
            description: 'ID de sesión no encontrado.',
            variant: 'destructive'
          });
      }
      return;
    }

    if (hasProcessedSessionIdRef.current.has(sessionIdFromUrl)) {
      console.log(
        `[SuccessPageContent] Polling for ${sessionIdFromUrl} already completed. Current pageStatus: ${pageStatus}. Skipping new poll start.`
      );

      return;
    }

    if (
      componentIsMountedRef.current &&
      pageStatus !== 'verifying_payment' &&
      pageStatus !== 'polling_api_db'
    ) {
      console.log(
        `[SuccessPageContent] Initializing state for polling ${sessionIdFromUrl}.`
      );
      setPageStatus('verifying_payment');
      setMessage('Confirmando tu pago con nuestro sistema...');
      setStripeSubscriptionIdUi(null);
    }

    attemptsRef.current = 0;
    const abortController = new AbortController();

    console.log(
      `[SuccessPageContent] Starting polling for ${sessionIdFromUrl} from main effect.`
    );

    const initialStartTimeoutId = setTimeout(() => {
      if (componentIsMountedRef.current && !abortController.signal.aborted) {
        pollApiForStatus(sessionIdFromUrl, 0, abortController.signal);
      }
    }, 50);

    return () => {
      console.log(
        `[SuccessPageContent] Main polling effect CLEANUP for sessionId: ${sessionIdFromUrl || 'N/A'}. Aborting controller.`
      );
      abortController.abort();
      clearTimeout(initialStartTimeoutId);
      if (pollingTimeoutIdRef.current) {
        clearTimeout(pollingTimeoutIdRef.current);
        pollingTimeoutIdRef.current = null;
      }
    };
  }, [
    sessionIdFromUrl,
    stableUpdateNextAuthSession,
    stableToast,
    pollApiForStatus
  ]);

  useEffect(() => {
    let redirectTimer: NodeJS.Timeout | null = null;
    if (pageStatus === 'success' && componentIsMountedRef.current) {
      const finalSuccessMessage = stripeSubscriptionIdUi
        ? `¡Todo Listo! ID de Suscripción: ${stripeSubscriptionIdUi}`
        : '¡Todo Listo!';
      if (componentIsMountedRef.current) setMessage(finalSuccessMessage);

      redirectTimer = setTimeout(() => {
        if (componentIsMountedRef.current)
          router.push('/pedidos?session_refresh_required=true');
      }, 2000);
    }
    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [pageStatus, router, stripeSubscriptionIdUi]);

  useEffect(() => {
    let errorRedirectTimer: NodeJS.Timeout | null = null;
    if (pageStatus === 'session_id_missing' && componentIsMountedRef.current) {
      errorRedirectTimer = setTimeout(() => {
        if (componentIsMountedRef.current) router.push('/ajustes/suscripcion');
      }, 3000);
    }
    return () => {
      if (errorRedirectTimer) clearTimeout(errorRedirectTimer);
    };
  }, [pageStatus, router]);

  const getHeading = () => {
    switch (pageStatus) {
      case 'success':
        return '¡Todo Listo!';
      case 'error':
      case 'session_id_missing':
        return 'Hubo un Problema';
      case 'requires_action':
        return 'Acción Requerida';
      case 'polling_api_db':
        return 'Finalizando Configuración...';
      case 'updating_auth_session':
        return 'Actualizando tu Sesión...';
      case 'verifying_payment':
        return 'Verificando Pago...';
      case 'initial_loading':
      default:
        return 'Procesando Tu Solicitud...';
    }
  };

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12 px-4">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-card shadow-xl rounded-lg">
        <div className="flex flex-col items-center text-center">
          {(pageStatus === 'initial_loading' ||
            pageStatus === 'verifying_payment' ||
            pageStatus === 'polling_api_db' ||
            pageStatus === 'updating_auth_session') && (
            <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary mb-4 sm:mb-6" />
          )}
          {pageStatus === 'success' && (
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mb-4 sm:mb-6" />
          )}
          {(pageStatus === 'error' || pageStatus === 'session_id_missing') && (
            <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4 sm:mb-6" />
          )}
          {pageStatus === 'requires_action' && (
            <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-500 mb-4 sm:mb-6" />
          )}

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
            {getHeading()}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-md max-w-sm">
            {message}
          </p>
          {stripeSubscriptionIdUi && pageStatus === 'success' && (
            <p className="text-xs text-muted-foreground mt-4">
              ID de Suscripción (Stripe): {stripeSubscriptionIdUi}
            </p>
          )}
        </div>

        {(pageStatus === 'error' ||
          pageStatus === 'session_id_missing' ||
          pageStatus === 'success' ||
          pageStatus === 'requires_action') && (
          <Button
            onClick={() => router.push('/pedidos')}
            className="w-full mt-6"
            disabled={
              //@ts-ignore
              pageStatus === 'updating_auth_session' ||
              //@ts-ignore
              pageStatus === 'initial_loading' ||
              //@ts-ignore
              pageStatus === 'verifying_payment' ||
              //@ts-ignore
              pageStatus === 'polling_api_db'
            }
          >
            Ir a Mi Panel
          </Button>
        )}
        {(pageStatus === 'error' || pageStatus === 'session_id_missing') && (
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
