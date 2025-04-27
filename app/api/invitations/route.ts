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
import { auth } from '@/lib/auth';
import { eq, and, or } from 'drizzle-orm';
import { sendInvitationEmail } from '@/lib/email';

const inviteSchema = z.object({
  email: z.string().email('Email inválido.'),
  role: z.enum([teamRoleEnum.enumValues[1], teamRoleEnum.enumValues[2]])
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const inviterUserId = session?.user?.id;
    const businessId = session?.user?.businessId;

    if (!inviterUserId || !businessId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const inviterMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.userId, inviterUserId),
        eq(teamMembers.businessId, businessId),
        or(eq(teamMembers.role, 'OWNER'), eq(teamMembers.role, 'ADMIN'))
      ),
      columns: { role: true }
    });

    if (!inviterMembership) {
      return NextResponse.json(
        { message: 'No tienes permiso para invitar miembros' },
        { status: 403 }
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

    const validation = inviteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { email: invitedEmail, role: invitedRole } = validation.data;
    const lowerCaseInvitedEmail = invitedEmail.toLowerCase();

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessId),
      columns: { ownerId: true, name: true }
    });
    if (!business) {
      return NextResponse.json(
        { message: 'Negocio no encontrado' },
        { status: 404 }
      );
    }
    if (
      business.ownerId === inviterUserId &&
      inviterMembership.role !== 'OWNER'
    ) {
      const owner = await db.query.users.findFirst({
        where: eq(users.id, business.ownerId),
        columns: { email: true }
      });
      if (owner?.email?.toLowerCase() === lowerCaseInvitedEmail) {
        return NextResponse.json(
          { message: 'No puedes invitar al propietario del negocio.' },
          { status: 400 }
        );
      }
    }

    const existingMember = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.businessId, businessId))
    });
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
        eq(invitations.status, 'PENDING')
      )
    });

    if (existingInvitation) {
      return NextResponse.json(
        { message: 'Ya existe una invitación pendiente para este email.' },
        { status: 409 }
      );
    }

    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const token = Buffer.from(randomBytes).toString('base64url');
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
      inviterName: session?.user?.name
    }).catch((emailError) => {
      console.error(
        `[BACKGROUND_EMAIL_ERROR] Failed to send invitation email to ${newInvitation.email}:`,
        emailError
      );
    });

    return NextResponse.json(
      { success: true, message: 'Invitación enviada correctamente.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[INVITATIONS_POST]', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al enviar la invitación.' },
      { status: 500 }
    );
  }
}
