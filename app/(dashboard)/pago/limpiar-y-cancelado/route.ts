import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const cancelFlagCookie = cookieStore.get('stripe_checkout_cancel_flag');

  const subscriptionPageUrl = new URL('/ajustes/suscripcion', request.url);

  const actualCancelledContentPageUrl = new URL('/pago/cancelado', request.url);

  if (!cancelFlagCookie?.value) {
    console.log(
      '[LimpiaCancel Route] No se encontró la cookie "stripe_checkout_cancel_flag" o está vacía. Redirigiendo a planes.'
    );
    return NextResponse.redirect(subscriptionPageUrl);
  }

  console.log(
    '[LimpiaCancel Route] Cookie "stripe_checkout_cancel_flag" encontrada. Redirigiendo a la página de cancelación y eliminando cookie.'
  );

  const response = NextResponse.redirect(actualCancelledContentPageUrl);

  response.cookies.set('stripe_checkout_cancel_flag', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  return response;
}
