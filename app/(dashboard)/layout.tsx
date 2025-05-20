'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { SubscriptionRequiredModal } from '@/components/modals/SubscriptionRequiredModal';
import DashboardClientLayout from '@/components/common/DashboardClientLayout';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { User } from './user';

const NON_SUBSCRIPTION_GATE_PATHS = [
  '/negocio/crear',
  '/perfil',
  '/ajustes/suscripcion',
  '/pago/exito',
  '/pago/cancelado',
  '/admin'
];

function DashboardCoreLogic({
  children,
  userComponentInstance
}: {
  children: React.ReactNode;
  userComponentInstance: React.ReactNode;
}) {
  const {
    data: session,
    status: sessionStatus,
    update: updateNextAuthSessionHook
  } = useSession();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const router = useRouter();

  // Efecto para refrescar la sesión si viene el flag en la URL
  useEffect(() => {
    const mutableSearchParams = new URLSearchParams(
      currentSearchParams.toString()
    );
    const needsRefresh =
      mutableSearchParams.get('session_refresh_required') === 'true';

    if (needsRefresh && sessionStatus === 'authenticated') {
      console.log(
        '[Layout] session_refresh_required detectado. Llamando a updateNextAuthSessionHook().'
      );

      // Llama a update() de useSession para forzar el refresco del token/sesión
      // Esto invocará el callback `jwt` en el backend.
      updateNextAuthSessionHook();

      // Limpia el query param para que no se refresque en cada F5 o navegación interna
      mutableSearchParams.delete('session_refresh_required');
      router.replace(`${pathname}?${mutableSearchParams.toString()}`, {
        scroll: false
      });
      console.log(
        '[Layout] Parámetro session_refresh_required eliminado de la URL.'
      );
    }
    // La dependencia currentSearchParams asegura que se re-evalúe si la URL cambia.
    // sessionStatus asegura que solo se haga si estamos autenticados.
  }, [
    sessionStatus,
    currentSearchParams,
    updateNextAuthSessionHook,
    pathname,
    router
  ]);

  // Efecto para mostrar el modal de suscripción (usa la sesión, que ahora debería estar fresca)
  useEffect(() => {
    console.log(
      `[Layout Suscripción Check] Path: ${pathname}, Status Sesión: ${sessionStatus}, User SubStatus: ${session?.user?.subscriptionStatus}`
    );
    // ... (tu lógica existente para setShowSubscriptionModal basada en session?.user)
    if (
      session?.user &&
      !session.user.isSuperAdmin &&
      session.user.businessId &&
      !NON_SUBSCRIPTION_GATE_PATHS.some((p) => pathname.startsWith(p))
    ) {
      const { subscriptionStatus, stripeCurrentPeriodEnd, isLifetime } =
        session.user;
      const isActive = subscriptionStatus === 'active';
      let isTrialingEffectivelyActive = false;
      if (subscriptionStatus === 'trialing' && stripeCurrentPeriodEnd) {
        isTrialingEffectivelyActive =
          new Date(stripeCurrentPeriodEnd) > new Date();
      }
      const hasLifetimeAccess = !!isLifetime;
      if (!hasLifetimeAccess && !isActive && !isTrialingEffectivelyActive) {
        setShowSubscriptionModal(true);
      } else {
        setShowSubscriptionModal(false);
      }
    } else {
      setShowSubscriptionModal(false);
    }
  }, [session, sessionStatus, pathname]);

  if (sessionStatus === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardClientLayout userComponent={userComponentInstance}>
      {children}
      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        subscriptionPageUrl="/ajustes/suscripcion"
      />
      {showSubscriptionModal && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}
    </DashboardClientLayout>
  );
}

export default function LayoutForDashboardPagesContainer({
  children
}: {
  children: React.ReactNode;
}) {
  const userComponentInstance = <User />;
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <DashboardCoreLogic userComponentInstance={userComponentInstance}>
        {children}
      </DashboardCoreLogic>
    </Suspense>
  );
}
