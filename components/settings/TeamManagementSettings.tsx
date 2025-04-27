'use client';

import React, { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import { Loader2, UserPlus, Users, MailWarning, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { TeamMemberWithUser, PendingInvitation } from '@/lib/db';

const inviteMemberSchema = z.object({
  email: z.string().email('Introduce un email válido.'),

  role: z.enum(['ADMIN', 'EDITOR'], {
    required_error: 'Debes seleccionar un rol.'
  })
});
type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;

interface TeamManagementSettingsProps {
  currentUserRole: string | undefined | null;

  businessId: number | undefined;
}

const TeamManagementSettings: React.FC<TeamManagementSettingsProps> = ({
  currentUserRole,
  businessId
}) => {
  const { toast } = useToast();
  const canManageTeam =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const [teamMembers, setTeamMembers] = useState<TeamMemberWithUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const fetchTeamMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const response = await fetch('/api/team-members');
      if (!response.ok) throw new Error('No se pudieron cargar los miembros');
      const data = await response.json();
      setTeamMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setLoadError('Error al cargar miembros del equipo.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los miembros del equipo.'
      });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const fetchPendingInvitations = async () => {
    if (!canManageTeam) {
      setIsLoadingInvitations(false);
      return;
    }
    setIsLoadingInvitations(true);
    try {
      const response = await fetch('/api/invitations/pending');
      if (!response.ok)
        throw new Error('No se pudieron cargar las invitaciones');
      const data = await response.json();
      setPendingInvitations(data.invitations || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
    fetchPendingInvitations();
  }, [canManageTeam]);

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
      fetchPendingInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo enviar la invitación.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Equipo</CardTitle>
        <CardDescription>
          Invita y administra los miembros de tu equipo que pueden acceder a
          este negocio.
        </CardDescription>
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
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="EDITOR">Editor</SelectItem>
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
            <div className="flex justify-center items-center h-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pendingInvitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay invitaciones pendientes.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol Asignado</TableHead>
                  <TableHead>Expira</TableHead>
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
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled>
                        Cancelar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      )}

      {/* --- Sección Miembros Actuales (Visible para todos, acciones limitadas) --- */}
      <CardContent>
        <h3 className="text-lg font-medium border-b pb-2 mb-4 flex items-center">
          <Users className="mr-2 h-5 w-5 text-muted-foreground" /> Miembros del
          Equipo
        </h3>
        {isLoadingMembers ? (
          <div className="flex justify-center items-center h-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
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
                {/* <TableHead className="text-right">Acciones</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell className="font-medium">
                    {member.user?.name || '-'}
                  </TableCell>
                  <TableCell>{member.user?.email}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>
                    {new Date(member.joinedAt!).toLocaleDateString()}
                  </TableCell>
                  {/* <TableCell className="text-right">
                              {canManageTeam && member.role !== 'OWNER' && member.userId !== currentUserId && ( 
                                 <>
                                    <Button variant="ghost" size="sm" disabled>Cambiar Rol</Button> 
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled>Eliminar</Button> 
                                 </>
                              )}
                           </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {loadError && (
          <p className="text-sm text-destructive mt-4">{loadError}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamManagementSettings;
