'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getStripe } from '@/lib/stripe/getStripe';
import {
  CheckCircle,
  Loader2,
  Zap,
  Settings,
  ExternalLink
} from 'lucide-react';
import { useBusinessProfile } from '@/hooks/use-business-profile';
import { cn, displayDate } from '@/lib/utils';

const plans = [
  {
    id: 'plan_basico_mensual_trial',
    name: 'Plan Básico - Prueba Gratuita',
    description: 'Ideal para empezar y probar todas las funcionalidades.',
    priceIdStripe: 'price_1RObViDMvGCWBYUyH37UyLMy',
    priceDisplay: 'Gratis por 14 días',
    priceNumerical: 0,
    interval: 'luego 19.99€/mes',
    features: [
      'Gestión de hasta 100 pedidos/mes',
      'Soporte por email',
      'Analíticas básicas'
    ],
    isTrialOption: true
  },
  {
    id: 'plan_basico_mensual',
    name: 'Plan Básico',
    description: 'Todas las herramientas esenciales para crecer.',
    priceIdStripe: 'price_1RObViDMvGCWBYUyH37UyLMy',
    priceDisplay: '19.99€',
    priceNumerical: 19.99,
    interval: '/mes',
    features: [
      'Gestión de hasta 100 pedidos/mes',
      'Soporte por email',
      'Analíticas básicas'
    ]
  },
  {
    id: 'plan_basico_anual',
    name: 'Plan Básico - Anual',
    description: 'Ahorra con el plan anual.',
    priceIdStripe: 'price_1RObViDMvGCWBYUycKZf1H8c',
    priceDisplay: '199.99€',
    priceNumerical: 199.99,
    interval: '/año',
    features: [
      'Gestión de hasta 100 pedidos/mes',
      'Soporte por email',
      'Analíticas básicas'
    ]
  },
  {
    id: 'plan_pro_mensual',
    name: 'Plan Pro',
    description: 'Para negocios con mayor volumen y necesidades.',
    priceIdStripe: 'price_1ROdz1DMvGCWBYUyUxkysBfh',
    priceDisplay: '49.99€',
    priceNumerical: 49.99,
    interval: '/mes',
    features: [
      'Pedidos ilimitados',
      'Soporte prioritario',
      'Analíticas avanzadas',
      'Múltiples usuarios'
    ],
    popular: true
  },
  {
    id: 'plan_avanzado_anual',
    name: 'Plan Avanzado - Anual',
    description: 'Para negocios que buscan más funcionalidades.',
    priceIdStripe: 'price_1ROdz1DMvGCWBYUyWavSndVB',
    priceDisplay: '499.99€',
    priceNumerical: 499.99,
    interval: '/año',
    features: [
      'Gestión ilimitada de pedidos',
      'Soporte prioritario',
      'Analíticas avanzadas',
      'Múltiples usuarios',
      'Integraciones personalizadas'
    ]
  }
];

function SubscriptionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast();
  const {
    profile: businessProfile,
    isLoadingProfile,
    mutateProfile
  } = useBusinessProfile();

  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  useEffect(() => {
    const priceIdFromUrl = searchParams.get('priceId');
    const initiateTrial = searchParams.get('trial') === 'true';

    if (
      priceIdFromUrl &&
      sessionStatus === 'authenticated' &&
      businessProfile &&
      !isLoadingProfile
    ) {
      const planExists = plans.some((p) => p.priceIdStripe === priceIdFromUrl);
      if (planExists) {
        if (
          !businessProfile.subscriptionStatus ||
          businessProfile.subscriptionStatus === 'canceled'
        ) {
          console.log(
            `Iniciando checkout para priceId desde URL: ${priceIdFromUrl}, es prueba: ${initiateTrial}`
          );
          handleSubscribe(
            priceIdFromUrl,
            `Plan con ID ${priceIdFromUrl}`,
            initiateTrial
          );
        }
      } else {
        toast({
          title: 'Plan no válido',
          description: 'El plan seleccionado desde la URL no es válido.',
          variant: 'destructive'
        });
      }
      router.replace(pathname, { scroll: false });
    }
  }, [
    searchParams,
    sessionStatus,
    businessProfile,
    isLoadingProfile,
    router,
    toast
  ]);

  const pathname = usePathname();

  const handleSubscribe = async (
    priceId: string,
    planName: string,
    isTrialFlow: boolean
  ) => {
    setLoadingActionId(priceId);
    toast({
      title: 'Procesando...',
      description: `Iniciando ${isTrialFlow ? 'prueba gratuita' : 'suscripción'} para ${planName}.`
    });

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, isTrial: isTrialFlow })
      });
      const sessionData = await response.json();
      if (!response.ok || !sessionData.sessionId) {
        if (
          response.status === 400 &&
          sessionData.action === 'manage_subscription'
        ) {
          toast({
            title: 'Suscripción Existente',
            description:
              sessionData.message ||
              'Ya tienes una suscripción activa o de prueba. Puedes gestionarla.',
            variant: 'default',
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
              >
                Gestionar
              </Button>
            )
          });
        }
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
      toast({
        title: 'Error',
        description: error.message || 'No se pudo procesar la acción.',
        variant: 'destructive'
      });
      setLoadingActionId(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingActionId('manage_portal');
    toast({
      title: 'Redirigiendo...',
      description: 'Abriendo el portal de gestión de suscripción.'
    });
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST'
      });
      const portalData = await response.json();
      if (!response.ok || !portalData.url) {
        throw new Error(
          portalData.message || 'No se pudo abrir el portal de cliente.'
        );
      }
      router.push(portalData.url);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      setLoadingActionId(null);
    }
  };

  if (sessionStatus === 'loading' || isLoadingProfile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (sessionStatus === 'unauthenticated') {
    signIn(undefined, { callbackUrl: pathname + searchParams.toString() });
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (!businessProfile) {
    return (
      <div className="container mx-auto max-w-2xl py-12 text-center">
        <CardTitle className="text-xl mb-4">Necesitas un Negocio</CardTitle>
        <p className="mb-4 text-muted-foreground">
          Para gestionar suscripciones, primero necesitas crear o seleccionar un
          negocio.
        </p>
        <Button onClick={() => router.push('/negocio/crear')}>
          Crear Negocio
        </Button>
      </div>
    );
  }

  const {
    subscriptionStatus,
    stripeCurrentPeriodEnd,
    stripePriceId,
    isLifetime
  } = businessProfile;
  const isActive = subscriptionStatus === 'active';
  const isEffectivelyTrialing =
    subscriptionStatus === 'trialing' &&
    stripeCurrentPeriodEnd &&
    new Date(stripeCurrentPeriodEnd) > new Date();

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 md:px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Suscripción de Cakely
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          {isLifetime
            ? 'Disfrutas de acceso vitalicio. ¡Gracias!'
            : isActive
              ? 'Gestiona tu plan actual o explora otras opciones.'
              : isEffectivelyTrialing
                ? `Estás en tu periodo de prueba. Finaliza el ${displayDate(stripeCurrentPeriodEnd)}.`
                : 'Elige el plan que mejor se adapte a las necesidades de tu negocio.'}
        </p>
      </div>

      {(isActive || isEffectivelyTrialing || isLifetime) && (
        <Card className="mb-10 shadow-md bg-gradient-to-r from-primary/10 via-transparent to-transparent">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center">
              <Zap className="mr-2 h-6 w-6" /> Tu Plan Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLifetime ? (
              <p className="text-lg font-semibold">Plan Vitalicio</p>
            ) : (
              <p className="text-lg font-semibold">
                {plans.find((p) => p.priceIdStripe === stripePriceId)?.name ||
                  'Plan Actual Desconocido'}
              </p>
            )}
            {isEffectivelyTrialing && stripeCurrentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Periodo de prueba finaliza el:{' '}
                {displayDate(stripeCurrentPeriodEnd)}
              </p>
            )}
            {isActive && !isLifetime && stripeCurrentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Próxima renovación el: {displayDate(stripeCurrentPeriodEnd)}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Estado:{' '}
              <span
                className={cn(
                  'font-semibold',
                  isActive || isEffectivelyTrialing || isLifetime
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {isLifetime ? 'Vitalicio' : subscriptionStatus}
              </span>
            </p>
          </CardContent>
          {!isLifetime && (
            <CardFooter>
              <Button
                onClick={handleManageSubscription}
                disabled={loadingActionId === 'manage_portal'}
                className="w-full sm:w-auto"
              >
                {loadingActionId === 'manage_portal' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Settings className="mr-2 h-4 w-4" /> Gestionar Suscripción y
                Facturación
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {!isLifetime && !isActive && !isEffectivelyTrialing && (
        <>
          <h2 className="text-2xl font-semibold text-center mb-8">
            Nuestros Planes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  'flex flex-col hover:shadow-xl transition-shadow',
                  plan.popular && 'border-primary ring-2 ring-primary'
                )}
              >
                {plan.popular && (
                  <div className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-t-lg text-center tracking-wider">
                    MÁS POPULAR
                  </div>
                )}
                <CardHeader className="pb-4 text-center">
                  <CardTitle className="text-2xl font-semibold">
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {plan.priceDisplay}
                    </span>
                    <span className="ml-1 text-xl font-medium text-muted-foreground">
                      {plan.interval}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full gap-1"
                    onClick={() =>
                      handleSubscribe(
                        plan.priceIdStripe,
                        plan.name,
                        !!plan.isTrialOption
                      )
                    }
                    disabled={!!loadingActionId}
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    {loadingActionId === plan.priceIdStripe && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {plan.isTrialOption
                      ? 'Iniciar Prueba Gratuita'
                      : 'Suscribirse Ahora'}
                    {!plan.isTrialOption && (
                      <ExternalLink className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground mt-12">
        Los precios no incluyen IVA donde aplique. Puedes gestionar o cancelar
        tu suscripción en cualquier momento desde esta página.
      </p>
    </div>
  );
}

export default function SubscriptionPageContainer() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  );
}
