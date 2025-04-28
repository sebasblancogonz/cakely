import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teamMembers } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { TeamRole } from '@/types/next-auth';

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
