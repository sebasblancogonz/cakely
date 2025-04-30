import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teamMembers, users } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, asc, and } from 'drizzle-orm';
import { TeamRole } from '@/types/types';

type TeamMemberResponse = {
  userId: number;
  role: (typeof teamMembers.role.enumValues)[number];
  joinedAt: Date | null;
  name: string | null;
  email: string;
  image: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const businessId = session?.user?.businessId;

    if (!userId || !businessId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const membersData = await db
      .select({
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        name: users.name,
        email: users.email,
        image: users.image
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.businessId, businessId))
      .orderBy(asc(users.name));

    const members: TeamMemberResponse[] = membersData.map((m: any) => ({
      ...m
    }));

    console.log(members);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('[TEAM_MEMBERS_GET]', error);
    return NextResponse.json(
      {
        message:
          'Error interno del servidor al obtener los miembros del equipo.'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { memberUserId: string } }
) {
  try {
    const session = await auth();
    const requestingUserId = session?.user?.id;
    const businessId = session?.user?.businessId;
    const requestingUserRole = session?.user?.role as TeamRole | undefined;

    if (!requestingUserId || !businessId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const memberUserIdToDelete = params.memberUserId;

    if (requestingUserId === memberUserIdToDelete) {
      return NextResponse.json(
        { message: 'No puedes eliminarte a ti mismo del equipo.' },
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
      .select({ role: teamMembers.role, id: teamMembers.id })
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
        { message: 'No se puede eliminar al propietario del negocio.' },
        { status: 403 }
      );
    }
    if (requestingUserRole === 'ADMIN' && memberToDelete.role === 'ADMIN') {
      return NextResponse.json(
        { message: 'Un administrador no puede eliminar a otro administrador.' },
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
      .returning({ deletedId: teamMembers.id });

    if (deleteResult.length === 0) {
      console.error(
        `Error lógico: No se encontró el miembro ${memberUserIdToDelete} para eliminar en business ${businessId} después de las validaciones.`
      );
      return NextResponse.json(
        {
          message:
            'No se pudo encontrar el miembro para eliminar después de las validaciones.'
        },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[TEAM_MEMBERS_DELETE]', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar el miembro.' },
      { status: 500 }
    );
  }
}
