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
