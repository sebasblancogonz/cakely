import { Suspense } from 'react';
import './globals.css';

import { Analytics } from '@vercel/analytics/react';
import { SessionProvider } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Cakely - Panel de control',
  description:
    'Un panel de control para administrar pedidos, clientes y productos de tu negocio.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen w-full flex-col">
        <SessionProvider>
          <Suspense
            fallback={
              <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
          >
            {children}
          </Suspense>
        </SessionProvider>
      </body>
      <Analytics />
    </html>
  );
}
