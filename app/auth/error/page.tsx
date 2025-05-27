import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AuthErrorClientPage from './AuthErrorClientPage';

export default function AuthErrorPageContainer() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Cargando...</p>
        </div>
      }
    >
      <AuthErrorClientPage />
    </Suspense>
  );
}
