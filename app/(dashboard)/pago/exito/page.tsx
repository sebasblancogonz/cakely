import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SuccessPageContent from './SuccessPageContent';

export default function SuccessPageContainer() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Cargando página de confirmación...</p>
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
