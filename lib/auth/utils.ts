import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { teamMembers } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import type { Session } from 'next-auth';
import type { TeamRole } from '@/types/next-auth';

export interface SessionInfo {
  session: Session;
  userId: string;
  businessId: number;
}

export async function getSessionInfo(
  request?: NextRequest
): Promise<SessionInfo | NextResponse> {
  const session = await auth();

  const userId = session?.user?.id;
  const businessId = session?.user?.businessId;

  if (!session || !session.user || !userId || !businessId) {
    console.warn(
      'getSessionInfo: No autorizado - Falta sesión, userId o businessId.'
    );
    return NextResponse.json(
      { message: 'No autorizado o sesión inválida' },
      { status: 401 }
    );
  }

  if (typeof businessId !== 'number' || businessId <= 0) {
    console.warn(
      `getSessionInfo: businessId inválido en sesión: ${businessId}`
    );
    return NextResponse.json(
      { message: 'ID de negocio inválido en la sesión' },
      { status: 400 }
    );
  }

  return { session, userId, businessId };
}

interface PermissionGranted {
  role: TeamRole;
}

export async function checkPermission(
  userId: string,
  businessId: number,
  allowedRoles: TeamRole[]
): Promise<PermissionGranted | NextResponse> {
  if (!allowedRoles || allowedRoles.length === 0) {
    console.error(
      `checkPermission: No se especificaron roles permitidos para user ${userId}, business ${businessId}`
    );
    return NextResponse.json(
      { message: 'Error de configuración de permisos internos.' },
      { status: 500 }
    );
  }

  try {
    const [membership] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.businessId, businessId)
        )
      )
      .limit(1);

    const userRole = membership?.role as TeamRole | undefined;

    if (!userRole) {
      console.warn(
        `checkPermission: Usuario ${userId} no encontrado en equipo del negocio ${businessId}`
      );

      return NextResponse.json(
        { message: 'No eres miembro de este negocio.' },
        { status: 403 }
      );
    }

    if (!allowedRoles.includes(userRole)) {
      console.warn(
        `checkPermission: Rol denegado. User ${userId} (${userRole}) no está en [${allowedRoles.join(', ')}] para business ${businessId}`
      );
      return NextResponse.json(
        { message: 'No tienes permiso para realizar esta acción.' },
        { status: 403 }
      );
    }

    return { role: userRole };
  } catch (error) {
    console.error(
      `checkPermission: Error DB verificando permisos para User ${userId}, Business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Error interno al verificar permisos.' },
      { status: 500 }
    );
  }
}
