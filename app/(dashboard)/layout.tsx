import React from 'react';
import { User } from './user';
import DashboardLayout from './common/DashboardClientLayout';

export default async function LayoutForDashboardPages({
  children
}: {
  children: React.ReactNode;
}) {
  const userComponentInstance = <User />;

  return (
    <DashboardLayout userComponent={userComponentInstance}>
      {children}
    </DashboardLayout>
  );
}
