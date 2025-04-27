import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invitations, businesses } from '@/lib/db';
import { eq, and, gt } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { message: 'Token no proporcionado' },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const result = await db
      .select({
        email: invitations.email,
        role: invitations.role,
        businessName: businesses.name
      })
      .from(invitations)
      .innerJoin(businesses, eq(invitations.businessId, businesses.id))
      .where(
        and(
          eq(invitations.token, token),
          eq(invitations.status, 'PENDING'),
          gt(invitations.expiresAt, now)
        )
      )
      .limit(1);

    const invitationDetails = result[0];

    if (!invitationDetails) {
      return NextResponse.json(
        { message: 'Invitación inválida o expirada' },
        { status: 404 }
      );
    }

    return NextResponse.json(invitationDetails);
  } catch (error) {
    console.error('[INVITATIONS_VERIFY_GET]', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al verificar la invitación' },
      { status: 500 }
    );
  }
}
