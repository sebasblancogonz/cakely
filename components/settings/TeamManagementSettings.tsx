'use client';

import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Users,
  MailWarning,
  Send,
  Trash2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { TeamRole } from '@types';
import { useTeamMembers } from '@/hooks/use-team-members';
import { usePendingInvitations } from '@/hooks/use-pending-invitations';
import TableSkeleton from '../common/TableSkeleton';

const ROLES_ALLOWED_TO_INVITE = ['ADMIN', 'EDITOR'] as const;
const ASSIGNABLE_ROLES: TeamRole[] = ['ADMIN', 'EDITOR'];

const inviteMemberSchema = z.object({
  email: z.string().email('Introduce un email válido.'),

  role: z.enum(ROLES_ALLOWED_TO_INVITE, {
    required_error: 'Debes seleccionar un rol.'
  })
});
type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;

interface TeamManagementSettingsProps {
  currentUserRole: TeamRole | undefined | null;
  currentUserId: string | undefined | null;
  businessId: number | undefined;
}

const TeamManagementSettings: React.FC<TeamManagementSettingsProps> = ({
  currentUserRole,
  currentUserId
}) => {
  const { toast } = useToast();
  const canManageTeam =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const { teamMembers, isLoadingMembers, isErrorMembers, mutateMembers } =
    useTeamMembers();
  const {
    pendingInvitations,
    isLoadingInvitations,
    isErrorInvitations,
    mutatePendingInvitations
  } = usePendingInvitations(canManageTeam);

  const [processingId, setProcessingId] = useState<string | number | null>(
    null
  );

  const {
    register,
    handleSubmit,
    reset: resetInviteForm,
    control,
    formState: { errors: inviteErrors, isSubmitting: isInviting }
  } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      role: undefined
    }
  });

  const onInviteSubmit = async (data: InviteMemberFormData) => {
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al enviar la invitación');
      }

      toast({
        title: 'Éxito',
        description: `Invitación enviada a ${data.email}.`
      });
      resetInviteForm();
      await mutatePendingInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error al Invitar',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo enviar la invitación.',
        variant: 'destructive'
      });
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    if (!canManageTeam || processingId) return;
    if (
      !confirm(
        `¿Estás seguro de que quieres cancelar la invitación #${invitationId}?`
      )
    )
      return;

    setProcessingId(invitationId);
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error ${response.status} al cancelar`
        );
      }

      toast({ title: 'Éxito', description: 'Invitación cancelada.' });
      mutatePendingInvitations(
        (currentData) => ({
          invitations:
            currentData?.invitations.filter((inv) => inv.id !== invitationId) ??
            []
        }),
        { revalidate: false }
      );
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: 'Error al Cancelar',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo cancelar la invitación.',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    console.log(memberUserId);
    console.log(currentUserId);
    if (
      !canManageTeam ||
      processingId ||
      !currentUserId ||
      memberUserId === currentUserId
    )
      return;

    const memberToRemove = teamMembers.find((m) => m.userId === memberUserId);
    if (!memberToRemove) return;
    if (memberToRemove.role === 'OWNER') {
      toast({
        title: 'Acción no permitida',
        description: 'No se puede eliminar al propietario.',
        variant: 'destructive'
      });
      return;
    }
    if (currentUserRole === 'ADMIN' && memberToRemove.role === 'ADMIN') {
      toast({
        title: 'Acción no permitida',
        description: 'Un Admin no puede eliminar a otro Admin.',
        variant: 'destructive'
      });
      return;
    }

    if (
      !confirm(
        `¿Eliminar a ${memberToRemove.name || memberToRemove.email} del equipo?`
      )
    )
      return;

    setProcessingId(memberUserId);
    try {
      const response = await fetch(`/api/team-members/${memberUserId}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error ${response.status} al eliminar miembro`
        );
      }

      toast({
        title: 'Éxito',
        description: `Miembro ${memberToRemove.name || memberToRemove.email} eliminado.`
      });
      mutateMembers(
        (currentData) => ({
          members:
            currentData?.members.filter((m) => m.userId !== memberUserId) ?? []
        }),
        { revalidate: false }
      );
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error al Eliminar',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar al miembro.',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRoleChange = async (memberUserId: string, newRole: TeamRole) => {
    if (
      !canManageTeam ||
      processingId ||
      !currentUserId ||
      memberUserId === currentUserId
    )
      return;

    const memberToUpdate = teamMembers.find((m) => m.userId === memberUserId);
    if (!memberToUpdate || memberToUpdate.role === 'OWNER') return;
    if (
      currentUserRole === 'ADMIN' &&
      (memberToUpdate.role === 'ADMIN' || newRole === 'ADMIN')
    ) {
      toast({
        title: 'Permiso denegado',
        description: 'Un Admin no puede modificar o crear otros Admins.',
        variant: 'destructive'
      });
      return;
    }
    if (newRole === 'OWNER') {
      toast({
        title: 'Rol inválido',
        description: 'No se puede asignar el rol de Propietario.',
        variant: 'destructive'
      });
      return;
    }

    console.log(`Changing role for ${memberUserId} to ${newRole}`);
    setProcessingId(memberUserId);

    try {
      const response = await fetch(`/api/team-members/${memberUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error ${response.status} al cambiar rol`
        );
      }

      const updatedMember = await response.json();

      toast({
        title: 'Éxito',
        description: `Rol actualizado a ${updatedMember.role}.`
      });

      mutateMembers(
        (currentData) => ({
          members:
            currentData?.members.filter((m) => m.userId !== memberUserId) ?? []
        }),
        { revalidate: false }
      );
    } catch (error) {
      console.error('Error changing role:', error);
      toast({
        title: 'Error al Cambiar Rol',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el rol.',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="mr-2">Gestión de Equipo</CardTitle>
          <CardDescription>
            Invita y administra los miembros de tu equipo que pueden acceder a
            este negocio.
          </CardDescription>
        </div>
      </CardHeader>

      {canManageTeam && (
        <>
          <CardContent>
            <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">
                Invitar Nuevo Miembro
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="invite-email">Email del Colaborador</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    {...register('email')}
                    className={cn(inviteErrors.email && 'border-destructive')}
                    disabled={isInviting}
                  />
                  {inviteErrors.email && (
                    <p className="text-xs text-destructive mt-1">
                      {inviteErrors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Asignar Rol</Label>
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isInviting}
                      >
                        <SelectTrigger
                          id="invite-role"
                          className={cn(
                            inviteErrors.role && 'border-destructive'
                          )}
                        >
                          <SelectValue placeholder="Selecciona rol..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES_ALLOWED_TO_INVITE.map((roleValue) => (
                            <SelectItem key={roleValue} value={roleValue}>
                              {roleValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {inviteErrors.role && (
                    <p className="text-xs text-destructive mt-1">
                      {inviteErrors.role.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar Invitación
                </Button>
              </div>
            </form>
          </CardContent>
          <CardContent>
            <hr className="my-4" />
          </CardContent>
        </>
      )}

      {canManageTeam && (
        <CardContent>
          <h3 className="text-lg font-medium border-b pb-2 mb-4 flex items-center">
            <MailWarning className="mr-2 h-5 w-5 text-muted-foreground" />{' '}
            Invitaciones Pendientes
          </h3>
          {isLoadingInvitations ? (
            <TableSkeleton rows={3} cols={4} />
          ) : isErrorInvitations ? (
            <p className="text-destructive text-center py-4">
              Error al cargar invitaciones.
            </p>
          ) : pendingInvitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay invitaciones pendientes.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">
                      {invite.email}
                    </TableCell>
                    <TableCell>{invite.role}</TableCell>
                    <TableCell>
                      {invite.expiresAt
                        ? new Date(invite.expiresAt).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleCancelInvitation(invite.id)}
                        disabled={processingId === invite.id}
                        aria-label="Cancelar invitación"
                      >
                        {processingId === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      )}

      <CardContent>
        <h3 className="text-lg font-medium border-b pb-2 mb-4 flex items-center">
          <Users className="mr-2 h-5 w-5 text-muted-foreground" /> Miembros del
          Equipo
        </h3>
        {isLoadingMembers ? (
          <div className="flex justify-center items-center h-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isErrorMembers ? (
          <p className="text-destructive text-center py-4">
            Error al cargar miembros.
          </p>
        ) : teamMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay miembros en el equipo.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Se unió</TableHead>
                {canManageTeam && (
                  <TableHead className="text-right">Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => {
                const canEditThisMemberRole =
                  canManageTeam &&
                  member.role !== 'OWNER' &&
                  member.userId !== currentUserId &&
                  !(currentUserRole === 'ADMIN' && member.role === 'ADMIN');

                const canDeleteThisMember = canEditThisMemberRole;

                return (
                  <TableRow key={member.userId}>
                    <TableCell className="font-medium">
                      {member.name || '-'}
                    </TableCell>
                    <TableCell>{member.email || '-'}</TableCell>
                    <TableCell>
                      {canEditThisMemberRole ? (
                        <Select
                          value={member.role}
                          onValueChange={(newRole) =>
                            handleRoleChange(member.userId, newRole as TeamRole)
                          }
                          disabled={processingId === member.userId}
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue placeholder="Cambiar rol..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.map((roleValue) =>
                              currentUserRole === 'ADMIN' &&
                              roleValue === 'ADMIN' ? null : (
                                <SelectItem key={roleValue} value={roleValue}>
                                  {roleValue}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{member.role}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    {/* Celda de Acciones */}
                    {canManageTeam && (
                      <TableCell className="text-right">
                        {/* Botón Eliminar (si aplica) */}
                        {canDeleteThisMember && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={processingId === member.userId}
                            aria-label="Eliminar miembro"
                          >
                            {processingId === member.userId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamManagementSettings;
