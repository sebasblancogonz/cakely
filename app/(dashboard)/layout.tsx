import React from 'react';
import { User } from './user';
import DashboardLayout from '@/components/common/DashboardClientLayout';
import { Toaster } from '@/components/ui/toaster';

export default async function LayoutForDashboardPages({
  children
}: {
  children: React.ReactNode;
}) {
  const userComponentInstance = <User />;

  return (
    <DashboardLayout userComponent={userComponentInstance}>
      {children}
      <Toaster />
    </DashboardLayout>
  );
}
