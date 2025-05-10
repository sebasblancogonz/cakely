import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function SettingsPageLoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-8 w-1/3 mb-6" /> {/* Título Ajustes */}
      <Skeleton className="h-10 w-full mb-6" /> {/* TabsList */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsTabLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<SettingsPageLoadingSkeleton />}>{children}</Suspense>
  );
}
