import { NextRequest, NextResponse } from 'next/server';
import { db, teamRoleEnum } from '@/lib/db';
import { teamMembers } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { TeamRole } from '@/types/next-auth';
import { getSessionInfo } from '@/lib/auth/utils';
import { z } from 'zod';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const requestingUserId = session?.user?.id;
    const businessId = session?.user?.businessId;
    const requestingUserRole = session?.user?.role as TeamRole | undefined;

    if (!requestingUserId || !businessId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { pathname } = request.nextUrl;
    const memberUserIdToDelete = pathname.split('/').pop()!;

    if (requestingUserId === memberUserIdToDelete) {
      return NextResponse.json(
        { message: 'No puedes eliminarte a ti mismo.' },
        { status: 400 }
      );
    }

    if (requestingUserRole !== 'OWNER' && requestingUserRole !== 'ADMIN') {
      return NextResponse.json(
        { message: 'No tienes permiso para eliminar miembros.' },
        { status: 403 }
      );
    }

    const [memberToDelete] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, memberUserIdToDelete),
          eq(teamMembers.businessId, businessId)
        )
      )
      .limit(1);

    if (!memberToDelete) {
      return NextResponse.json(
        { message: 'Miembro no encontrado en este negocio.' },
        { status: 404 }
      );
    }

    if (memberToDelete.role === 'OWNER') {
      return NextResponse.json(
        { message: 'No se puede eliminar al propietario.' },
        { status: 403 }
      );
    }
    if (requestingUserRole === 'ADMIN' && memberToDelete.role === 'ADMIN') {
      return NextResponse.json(
        { message: 'Un Admin no puede eliminar a otro Admin.' },
        { status: 403 }
      );
    }

    const deleteResult = await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, memberUserIdToDelete),
          eq(teamMembers.businessId, businessId)
        )
      )
      .returning({ deletedId: teamMembers.userId });

    if (deleteResult.length === 0) {
      console.error(
        `Error lógico: No se encontró miembro ${memberUserIdToDelete} para eliminar en business ${businessId} post-validación.`
      );
      return NextResponse.json(
        { message: 'No se pudo encontrar el miembro a eliminar.' },
        { status: 404 }
      );
    }

    console.log(
      `User ${requestingUserId} removed user ${memberUserIdToDelete} from business ${businessId}`
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[TEAM_MEMBERS_DELETE]', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar el miembro.' },
      { status: 500 }
    );
  }
}

const assignableRoles = teamRoleEnum.enumValues.filter(
  (r) => r !== 'OWNER'
) as [TeamRole, ...TeamRole[]];

const updateRoleSchema = z.object({
  role: z.enum(assignableRoles, {
    required_error: 'El rol es requerido.',
    invalid_type_error: 'Rol inválido proporcionado.'
  })
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { memberUserId: string } }
) {
  const sessionInfo = await getSessionInfo(request);
  if (sessionInfo instanceof NextResponse) return sessionInfo;
  const { userId: requestingUserId, businessId, session } = sessionInfo;
  const requestingUserRole = session.user?.role;

  const { pathname } = request.nextUrl;
  const memberUserIdToUpdate = pathname.split('/').pop()!;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 });
  }

  const validation = updateRoleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.error.format() },
      { status: 400 }
    );
  }
  const { role: newRole } = validation.data;

  if (requestingUserId === memberUserIdToUpdate) {
    return NextResponse.json(
      { message: 'No puedes cambiar tu propio rol aquí.' },
      { status: 400 }
    );
  }

  if (requestingUserRole !== 'OWNER' && requestingUserRole !== 'ADMIN') {
    return NextResponse.json(
      { message: 'No tienes permiso para cambiar roles.' },
      { status: 403 }
    );
  }

  const [memberToUpdate] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, memberUserIdToUpdate),
        eq(teamMembers.businessId, businessId)
      )
    )
    .limit(1);

  if (!memberToUpdate) {
    return NextResponse.json(
      { message: 'Miembro no encontrado en este negocio.' },
      { status: 404 }
    );
  }

  if (memberToUpdate.role === 'OWNER') {
    return NextResponse.json(
      { message: 'No se puede cambiar el rol del propietario.' },
      { status: 403 }
    );
  }
  if (requestingUserRole === 'ADMIN' && memberToUpdate.role === 'ADMIN') {
    return NextResponse.json(
      { message: 'Un administrador no puede modificar a otro administrador.' },
      { status: 403 }
    );
  }

  if (requestingUserRole === 'ADMIN' && newRole === 'ADMIN') {
    return NextResponse.json(
      { message: 'Un administrador no puede asignar el rol de administrador.' },
      { status: 403 }
    );
  }

  try {
    const updateResult = await db
      .update(teamMembers)
      .set({
        role: newRole,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(teamMembers.userId, memberUserIdToUpdate),
          eq(teamMembers.businessId, businessId)
        )
      )
      .returning({ userId: teamMembers.userId, role: teamMembers.role });

    if (updateResult.length === 0) {
      return NextResponse.json(
        { message: 'No se pudo encontrar el miembro para actualizar.' },
        { status: 404 }
      );
    }

    console.log(
      `User ${requestingUserId} changed role of user ${memberUserIdToUpdate} to ${newRole} for business ${businessId}`
    );
    return NextResponse.json(updateResult[0]);
  } catch (error) {
    console.error('[TEAM_MEMBERS_PATCH]', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar el rol.' },
      { status: 500 }
    );
  }
}
