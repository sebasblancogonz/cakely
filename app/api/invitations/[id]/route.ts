import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invitations, teamMembers } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { TeamRole } from '@/types/next-auth';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const businessId = session?.user?.businessId;
    const currentUserRole = session?.user?.role as TeamRole | undefined;

    if (!userId || !businessId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      return NextResponse.json(
        { message: 'No tienes permiso para cancelar invitaciones.' },
        { status: 403 }
      );
    }

    const { pathname } = request.nextUrl;
    const invitationId = Number(pathname.split('/').pop());

    console.log(invitationId);
    if (isNaN(invitationId)) {
      return NextResponse.json(
        { message: 'ID de invitación inválido' },
        { status: 400 }
      );
    }

    const deleteResult = await db
      .delete(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.businessId, businessId),
          eq(invitations.status, 'PENDING')
        )
      )
      .returning({ deletedId: invitations.id });

    if (deleteResult.length === 0) {
      return NextResponse.json(
        {
          message:
            'Invitación pendiente no encontrada o no válida para cancelar.'
        },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[INVITATIONS_CANCEL_DELETE]', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al cancelar la invitación.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const businessId = session?.user?.businessId;
    const currentUserRole = session?.user?.role as TeamRole | undefined;

    if (!userId || !businessId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      return NextResponse.json(
        { message: 'No tienes permiso para cancelar invitaciones.' },
        { status: 403 }
      );
    }

    const { pathname } = request.nextUrl;
    const invitationIdNum = Number(pathname.split('/').pop());

    if (isNaN(invitationIdNum)) {
      return NextResponse.json(
        { message: 'ID de invitación inválido' },
        { status: 400 }
      );
    }

    const updateResult = await db
      .update(invitations)
      .set({
        status: 'CANCELLED',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(invitations.id, invitationIdNum),
          eq(invitations.businessId, businessId),
          eq(invitations.status, 'PENDING')
        )
      )
      .returning({ id: invitations.id, status: invitations.status });

    if (updateResult.length === 0) {
      return NextResponse.json(
        {
          message:
            'Invitación pendiente no encontrada o no válida para cancelar.'
        },
        { status: 404 }
      );
    }

    console.log(
      `User ${userId} cancelled invitation ${invitationIdNum} for business ${businessId}`
    );
    return NextResponse.json(updateResult[0]);
  } catch (error) {
    console.error('[INVITATIONS_CANCEL_PATCH]', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al cancelar la invitación.' },
      { status: 500 }
    );
  }
}
