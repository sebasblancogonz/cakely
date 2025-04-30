import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { invitations, teamMembers } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and, gt } from 'drizzle-orm';

const acceptSchema = z.object({
  token: z.string().min(1, 'Token es requerido')
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email?.toLowerCase();

    if (!userId || !userEmail) {
      return NextResponse.json(
        { message: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { message: 'Cuerpo de solicitud inválido' },
        { status: 400 }
      );
    }

    const validation = acceptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validation.error.format() },
        { status: 400 }
      );
    }
    const { token } = validation.data;

    const result = await db.transaction(async (tx: any) => {
      const now = new Date();
      const [invitation] = await tx
        .select({
          id: invitations.id,
          email: invitations.email,
          businessId: invitations.businessId,
          role: invitations.role
        })
        .from(invitations)
        .where(
          and(
            eq(invitations.token, token),
            eq(invitations.status, 'PENDING'),
            gt(invitations.expiresAt, now)
          )
        )
        .limit(1);

      if (!invitation) {
        throw new Error('INV_NOT_FOUND');
      }
      if (invitation.email.toLowerCase() !== userEmail) {
        throw new Error('INV_EMAIL_MISMATCH');
      }

      const [existingMembership] = await tx
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, userId),
            eq(teamMembers.businessId, invitation.businessId)
          )
        )
        .limit(1);

      if (existingMembership) {
        await tx
          .update(invitations)
          .set({ status: 'ACCEPTED' })
          .where(eq(invitations.id, invitation.id));
        throw new Error('ALREADY_MEMBER');
      }

      await tx.insert(teamMembers).values({
        userId: userId,
        businessId: invitation.businessId,
        role: invitation.role,
        joinedAt: now
      });

      await tx
        .update(invitations)
        .set({ status: 'ACCEPTED' })
        .where(eq(invitations.id, invitation.id));

      return { success: true };
    });

    return NextResponse.json({
      success: true,
      message: 'Invitación aceptada correctamente.'
    });
  } catch (error) {
    console.error('[INVITATIONS_ACCEPT_POST]', error);

    if (error instanceof Error) {
      if (error.message === 'INV_NOT_FOUND') {
        return NextResponse.json(
          { message: 'Invitación inválida, expirada o no encontrada.' },
          { status: 404 }
        );
      }
      if (error.message === 'INV_EMAIL_MISMATCH') {
        return NextResponse.json(
          { message: 'Esta invitación es para otro correo electrónico.' },
          { status: 403 }
        );
      }
      if (error.message === 'ALREADY_MEMBER') {
        return NextResponse.json(
          { message: 'Ya eres miembro de este equipo.' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al aceptar la invitación.' },
      { status: 500 }
    );
  }
}
