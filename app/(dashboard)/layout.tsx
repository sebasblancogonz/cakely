'use client';

import React, {
  useState,
  useEffect,
  Suspense,
  useCallback,
  useRef
} from 'react';
import { useSession } from 'next-auth/react';
import { SubscriptionRequiredModal } from '@/components/modals/SubscriptionRequiredModal';
import DashboardClientLayout from '@/components/common/DashboardClientLayout';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { User } from './user';
import { Toaster } from '@/components/ui/toaster';

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

  const processingRefreshReqRef = useRef(false);

  useEffect(() => {
    const mutableSearchParams = new URLSearchParams(
      currentSearchParams.toString()
    );
    const needsRefresh =
      mutableSearchParams.get('session_refresh_required') === 'true';

    if (needsRefresh) {
      if (
        sessionStatus === 'authenticated' &&
        !processingRefreshReqRef.current
      ) {
        console.log(
          '[Layout] session_refresh_required detectado. Iniciando proceso de refresco.'
        );
        processingRefreshReqRef.current = true;

        updateNextAuthSessionHook();

        mutableSearchParams.delete('session_refresh_required');
        const queryString = mutableSearchParams.toString();
        const newPath = queryString ? `${pathname}?${queryString}` : pathname;

        router.replace(newPath, {
          scroll: false
        });
        console.log(
          '[Layout] Parámetro session_refresh_required eliminado de la URL. Refresco de sesión en curso.'
        );
      } else if (processingRefreshReqRef.current) {
        console.log(
          '[Layout] Refresco de sesión ya en curso, esperando estabilización.'
        );
      }
    } else {
      if (processingRefreshReqRef.current) {
        console.log(
          '[Layout] Parámetro session_refresh_required ya no presente. Reseteando flag de proceso.'
        );
        processingRefreshReqRef.current = false;
      }
    }
  }, [
    sessionStatus,
    currentSearchParams,
    updateNextAuthSessionHook,
    pathname,
    router
  ]);

  useEffect(() => {
    console.log(
      `[Layout Suscripción Check] Path: ${pathname}, Status Sesión: ${sessionStatus}, User SubStatus: ${session?.user?.subscriptionStatus}`
    );
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

  return (
    <DashboardClientLayout userComponent={userComponentInstance}>
      {sessionStatus === 'loading' && !processingRefreshReqRef.current && (
        <div className="fixed inset-0 z-[100] flex h-screen w-full items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
      {/* Consider if the loader overlay should appear even when processingRefreshReqRef.current is true.
           The current !processingRefreshReqRef.current condition on the loader might be too restrictive
           if you want a visual cue during the session_refresh_required update.
           Simpler: always show overlay if sessionStatus is 'loading', as children are now always mounted.
       */}
      {/* Simpler loader condition:
       {sessionStatus === 'loading' && (
        <div className="fixed inset-0 z-[100] flex h-screen w-full items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
      */}
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
      <Toaster />
    </Suspense>
  );
}
