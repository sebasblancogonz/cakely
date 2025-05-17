'use client';

import React, { useState, useEffect, Suspense } from 'react';

import { useSession } from 'next-auth/react';
import { SubscriptionReminderModal } from '@/components/modals/SubscriptionReminderModal';
import DashboardClientLayout from '@/components/common/DashboardClientLayout';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { User } from './user';

const NON_REMINDER_PATHS = [
  '/suscribirse',
  '/pago/exito',
  '/pago/cancelado',
  '/negocio/crear',
  '/ajustes/suscripcion',
  '/admin'
];

function DashboardCoreLogic({
  children,
  userComponentInstance
}: {
  children: React.ReactNode;
  userComponentInstance: React.ReactNode;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const [showSubscriptionReminder, setShowSubscriptionReminder] =
    useState(false);
  const pathname = usePathname();

  console.log(session);

  useEffect(() => {
    console.log('[LayoutForDashboard] Session Status:', sessionStatus);
    console.log('[LayoutForDashboard] Session Data:', session);
    console.log('[LayoutForDashboard] Current Pathname:', pathname);

    if (
      sessionStatus === 'loading' ||
      sessionStatus === 'unauthenticated' ||
      !session?.user ||
      !session.user.businessId ||
      session.user.isSuperAdmin ||
      NON_REMINDER_PATHS.some((p) => pathname.includes(p))
    ) {
      setShowSubscriptionReminder(false);
      return;
    }

    const { subscriptionStatus, stripeCurrentPeriodEnd, isLifetime } =
      session.user;

    console.log(
      '[LayoutForDashboard] Subscription check. Status:',
      subscriptionStatus,
      'Period End:',
      stripeCurrentPeriodEnd,
      'Lifetime:',
      isLifetime
    );

    const isActive = subscriptionStatus === 'active';
    let isTrialingEffectivelyActive = false;
    if (subscriptionStatus === 'trialing' && stripeCurrentPeriodEnd) {
      const trialEndDate = new Date(stripeCurrentPeriodEnd);
      if (trialEndDate > new Date()) {
        isTrialingEffectivelyActive = true;
      }
    }

    const hasLifetimeAccess = !!isLifetime;

    if (!hasLifetimeAccess && !isActive && !isTrialingEffectivelyActive) {
      console.log(
        '[LayoutForDashboard] Condiciones cumplidas para mostrar modal de recordatorio de suscripción.'
      );
      setShowSubscriptionReminder(true);
    } else {
      setShowSubscriptionReminder(false);
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
      {' '}
      {/* Tu layout visual */}
      {children}
      <SubscriptionReminderModal
        isOpen={showSubscriptionReminder}
        onClose={() => setShowSubscriptionReminder(false)}
        subscriptionPageUrl="/ajustes/suscripcion"
      />
    </DashboardClientLayout>
  );
}

export default function LayoutForDashboardPages({
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
