import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invitations, teamMembers } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and, gt, or, desc } from 'drizzle-orm';

type PendingInvitationResponse = {
  id: number;
  email: string;
  role: (typeof invitations.role.enumValues)[number];
  status: (typeof invitations.status.enumValues)[number];
  expiresAt: Date | null;
  createdAt: Date | null;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const businessId = session?.user?.businessId;

    if (!userId || !businessId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const [currentUserMembership] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.businessId, businessId)
        )
      )
      .limit(1);

    const currentUserRole = currentUserMembership?.role;

    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      return NextResponse.json(
        { message: 'No tienes permiso para ver las invitaciones pendientes.' },
        { status: 403 }
      );
    }

    const now = new Date();
    const pendingInvitationsData = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.businessId, businessId),
          eq(invitations.status, 'PENDING'),
          gt(invitations.expiresAt, now)
        )
      )
      .orderBy(desc(invitations.createdAt));

    const invitationsList: PendingInvitationResponse[] =
      pendingInvitationsData.map((inv: PendingInvitationResponse) => ({
        ...inv
      }));

    return NextResponse.json({ invitations: invitationsList });
  } catch (error) {
    console.error('[INVITATIONS_PENDING_GET]', error);
    return NextResponse.json(
      {
        message:
          'Error interno del servidor al obtener las invitaciones pendientes.'
      },
      { status: 500 }
    );
  }
}
