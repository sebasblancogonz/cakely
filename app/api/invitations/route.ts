import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  invitations,
  teamMembers,
  businesses,
  users,
  teamRoleEnum
} from '@/lib/db';
import { eq, and, gt } from 'drizzle-orm';
import { sendInvitationEmail } from '@/lib/email';

import { getSessionInfo, checkPermission } from '@/lib/auth/utils';

const inviteSchema = z.object({
  email: z.string().email('Email inválido.'),

  role: z.enum([teamRoleEnum.enumValues[1], teamRoleEnum.enumValues[2]], {
    required_error: 'Debes seleccionar un rol.'
  })
});

export async function POST(request: NextRequest) {
  const sessionInfo = await getSessionInfo(request);
  if (sessionInfo instanceof NextResponse) {
    return sessionInfo;
  }

  const { session, userId: inviterUserId, businessId } = sessionInfo;
  const inviterName = session.user?.name;

  const permissionCheck = await checkPermission(inviterUserId, businessId, [
    'OWNER',
    'ADMIN'
  ]);
  if (permissionCheck instanceof NextResponse) {
    return permissionCheck;
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { message: 'Cuerpo de solicitud inválido (JSON mal formado)' },
      { status: 400 }
    );
  }

  const validation = inviteSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        message: 'Datos de invitación inválidos',
        errors: validation.error.format()
      },
      { status: 400 }
    );
  }
  const { email: invitedEmail, role: invitedRole } = validation.data;
  const lowerCaseInvitedEmail = invitedEmail.toLowerCase();

  try {
    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessId),
      columns: { ownerId: true, name: true }
    });
    if (!business) {
      return NextResponse.json(
        { message: 'Negocio asociado no encontrado' },
        { status: 404 }
      );
    }

    if (business.ownerId === inviterUserId) {
      const ownerUser = await db.query.users.findFirst({
        where: eq(users.id, business.ownerId),
        columns: { email: true }
      });
      if (ownerUser?.email?.toLowerCase() === lowerCaseInvitedEmail) {
        return NextResponse.json(
          { message: 'No puedes invitar al propietario del negocio.' },
          { status: 400 }
        );
      }
    }

    const invitedUser = await db.query.users.findFirst({
      where: eq(users.email, lowerCaseInvitedEmail),
      columns: { id: true }
    });

    if (invitedUser) {
      const isAlreadyMember = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.userId, invitedUser.id),
          eq(teamMembers.businessId, businessId)
        )
      });
      if (isAlreadyMember) {
        return NextResponse.json(
          { message: 'Este usuario ya es miembro del equipo.' },
          { status: 409 }
        );
      }
    }

    const existingInvitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.email, lowerCaseInvitedEmail),
        eq(invitations.businessId, businessId),
        eq(invitations.status, 'PENDING'),
        gt(invitations.expiresAt, new Date())
      )
    });

    if (existingInvitation) {
      return NextResponse.json(
        {
          message:
            'Ya existe una invitación pendiente y válida para este email.'
        },
        { status: 409 }
      );
    }

    const randomBytesArray = new Uint8Array(32);
    crypto.getRandomValues(randomBytesArray);
    const token = Buffer.from(randomBytesArray).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [newInvitation] = await db
      .insert(invitations)
      .values({
        email: lowerCaseInvitedEmail,
        businessId: businessId,
        role: invitedRole,
        invitedByUserId: inviterUserId,
        status: 'PENDING',
        token: token,
        expiresAt: expiresAt
      })
      .returning({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role
      });

    if (!newInvitation) {
      throw new Error('No se pudo crear la invitación en la base de datos.');
    }

    void sendInvitationEmail({
      to: newInvitation.email,
      token: token,
      businessName: business.name ?? 'tu negocio',
      role: newInvitation.role,
      inviterName: inviterName
    }).catch((emailError) => {
      console.error(
        `[BACKGROUND_EMAIL_ERROR] Failed to send invitation email to ${newInvitation.email} for business ${businessId}:`,
        emailError
      );
    });

    return NextResponse.json(
      { success: true, message: 'Invitación enviada correctamente.' },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      '[INVITATIONS_POST] Error during business logic/DB operation:',
      error
    );

    return NextResponse.json(
      { message: 'Error interno del servidor al procesar la invitación.' },
      { status: 500 }
    );
  }
}
