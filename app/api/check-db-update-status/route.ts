import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const userId = session.user.id;
  const flagKey = `user:${userId}:subscription_update_status`;

  try {
    const flagData = await redis.get<{
      status: string;
      eventType: string;
      subscriptionStatus: string;
      timestamp: number;
    }>(flagKey);

    if (flagData && flagData.status === 'COMPLETED') {
      console.log(
        `[Check DB Status API] Flag 'COMPLETED' encontrado para ${flagKey}. Eliminando flag.`
      );

      await redis.del(flagKey);

      return NextResponse.json({
        status: 'COMPLETED',
        eventType: flagData.eventType,
        actualSubscriptionStatus: flagData.subscriptionStatus
      });
    }

    return NextResponse.json({ status: 'PENDING' });
  } catch (error) {
    console.error(
      `[Check DB Status API] Error leyendo KV para ${flagKey}:`,
      error
    );
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
