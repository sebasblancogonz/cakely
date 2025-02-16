import { Suspense } from 'react';
import './globals.css';

import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'Aura Bakery - Panel de control',
  description:
    'Un panel de control para administrar pedidos, clientes y productos de Aura Bakery.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen w-full flex-col">
        <Suspense fallback={<div>Cargando...</div>}>{children}</Suspense>
      </body>
      <Analytics />
    </html>
  );
}
