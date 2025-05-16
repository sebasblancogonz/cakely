import CancelledPageClientContent from '@/components/payments/CancelledPageClientContent';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function PaymentCancelledServerPage() {
  const cookieStore = await cookies();
  const cancelFlagCookie = cookieStore.get('stripe_checkout_cancel_flag');

  if (!cancelFlagCookie) {
    console.log(
      '[PaymentCancelledPage] No se encontró la cookie "stripe_checkout_cancel_flag". Redirigiendo...'
    );
    redirect('/ajustes/suscripcion'); // O a '/'
  }
  return <CancelledPageClientContent />;
}
