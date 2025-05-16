'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useBusinessProfile } from '@/hooks/use-business-profile';
import { SubscriptionReminderModal } from '@/components/modals/SubscriptionReminderModal';
import DashboardLayout from '@/components/common/DashboardClientLayout';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { User } from './user';

const NON_REMINDER_PATHS = [
  '/suscribirse',
  '/pago/exito',
  '/pago/cancelado',
  '/negocio/crear',
  '/ajustes/suscripcion'
];

export default function LayoutForDashboardPages({
  children
}: {
  children: React.ReactNode;
}) {
  const {
    profile: businessProfile,
    isLoadingProfile: isLoadingProfile,
    isErrorProfile: profileError
  } = useBusinessProfile();
  const [showSubscriptionReminder, setShowSubscriptionReminder] =
    useState(false);
  const pathname = usePathname();
  const userComponentInstance = <User />;

  useEffect(() => {
    if (
      isLoadingProfile ||
      profileError ||
      !businessProfile ||
      NON_REMINDER_PATHS.some((p) => pathname.includes(p))
    ) {
      setShowSubscriptionReminder(false);
      return;
    }

    const { subscriptionStatus, stripeCurrentPeriodEnd, isLifetime } =
      businessProfile;

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
        '[Subscription Reminder] Condiciones cumplidas para mostrar modal.'
      );
      setShowSubscriptionReminder(true);
    } else {
      setShowSubscriptionReminder(false);
    }
  }, [businessProfile, isLoadingProfile, profileError, pathname]);

  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <DashboardLayout userComponent={userComponentInstance}>
        {children}
        <SubscriptionReminderModal
          isOpen={showSubscriptionReminder}
          onClose={() => setShowSubscriptionReminder(false)}
          subscriptionPageUrl="/ajustes/suscripcion"
        />
      </DashboardLayout>
    </Suspense>
  );
}
