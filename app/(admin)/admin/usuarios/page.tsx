// src/app/(admin)/admin/users/page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react'; // Añade useCallback
import useSWR, { mutate } from 'swr';
import Link from 'next/link'; // Para enlaces si los usas
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Edit,
  Trash2,
  CheckSquare,
  XSquare,
  Loader2,
  ShieldCheck,
  Shield,
  Search,
  PlusCircle
} from 'lucide-react'; // Añade PlusCircle
import Modal from '@/components/common/Modal';
import { useToast } from '@/hooks/use-toast';
import { User as UserType, TeamMemberWithUser } from '@types'; // Asegúrate que TeamMemberWithUser se importe si lo usas abajo
import { Input } from '@/components/ui/input';
import { PaginationControls } from '@/components/common/PaginationControls';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { CreateUserAdminForm } from '@/components/admin/CreateUserAdminForm';
import { EditUserAdminForm } from '@/components/admin/EditUserAdminForm';
import { BackButton } from '@/components/common/BackButton';

// Tipo para el usuario que se muestra en la tabla, incluyendo membresías de equipo
interface AdminUserView extends UserType {
  teamMemberships?: (TeamMemberWithUser & {
    // TeamMemberWithUser ya tiene 'user', ajusta si es necesario
    business?: { id: number; name: string | null };
  })[];
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      // Intenta parsear el error del cuerpo si es posible
      return res
        .json()
        .then((err) => Promise.reject(err.message || `Error: ${res.status}`));
    }
    return res.json();
  });

export default function AdminUsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const q = searchParams.get('q') || '';
  const offset = Number(searchParams.get('offset')) || 0;
  const limit = Number(searchParams.get('limit')) || 10; // O tu DEFAULT_PAGE_SIZE

  const [searchInput, setSearchInput] = useState(q);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Estado para modal de creación
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AdminUserView | null>(null);

  const SWR_KEY = `/api/admin/users?q=${encodeURIComponent(q)}&offset=${offset}&limit=${limit}`;

  const {
    data,
    error,
    isLoading,
    mutate: mutateUsers // Para revalidar datos SWR
  } = useSWR<{ users: AdminUserView[]; totalUsers: number }>(SWR_KEY, fetcher);

  const handleEdit = (user: AdminUserView) => {
    setUserToEdit(user);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (userId: string, userName: string | null) => {
    if (
      !confirm(
        `¿Seguro que quieres eliminar al usuario ${userName || userId}? Esta acción puede ser irreversible y, si es propietario de un negocio, podría borrar el negocio.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ message: 'Error al eliminar' }));
        throw new Error(errData.message || 'Error al eliminar usuario');
      }
      toast({ title: 'Éxito', description: 'Usuario eliminado.' });
      mutateUsers(); // Revalida la lista
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', searchInput);
    params.set('offset', '0');
    router.push(`${pathname}?${params.toString()}`);
  };

  // Sincronizar searchInput si 'q' cambia en URL
  useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
  }, [searchParams]);

  const currentPage = Math.floor(offset / limit) + 1;

  if (error)
    return (
      <p className="text-red-500 p-4">
        Error al cargar usuarios: {error.message}
      </p>
    );

  const users = data?.users || [];
  const totalUsers = data?.totalUsers || 0;

  return (
    <div className="space-y-4 p-2 md:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Gestionar Usuarios</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-grow sm:flex-grow-0"
          >
            <Input
              type="search"
              placeholder="Buscar usuario..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 w-full sm:w-[250px] h-9"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </form>

          <BackButton />
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="h-9"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Total:{' '}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin inline-block" />
            ) : (
              totalUsers
            )}{' '}
            usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && users.length === 0 ? ( // Muestra loader si está cargando Y no hay datos aún
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto relative border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">SuperAdmin</TableHead>
                    <TableHead>Negocios (Rol)</TableHead>
                    <TableHead className="text-center">Verificado</TableHead>
                    <TableHead className="text-right w-[100px]">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell
                        className="truncate max-w-[100px] font-mono text-xs"
                        title={user.id}
                      >
                        {user.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.name || '-'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-center">
                        {user.isSuperAdmin ? (
                          <ShieldCheck className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <Shield className="h-5 w-5 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate">
                        {user.teamMemberships && user.teamMemberships.length > 0
                          ? user.teamMemberships
                              .map(
                                (tm) =>
                                  `${tm.business?.name || `Neg. ID ${tm.business?.id}`} (${tm.role})`
                              )
                              .join('; ')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.emailVerified ? (
                          <CheckSquare className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <XSquare className="h-5 w-5 text-red-600 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(user)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(user.id, user.name)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        No hay usuarios que coincidan con la búsqueda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {totalUsers > 0 && !isLoading && (
          <CardFooter>
            <PaginationControls
              currentPage={currentPage} // Necesitas calcular currentPage
              totalPages={Math.ceil(totalUsers / limit)}
              limit={limit}
              basePath={pathname}
              searchParams={searchParams}
            />
          </CardFooter>
        )}
      </Card>

      {/* Modal para Crear Usuario */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Usuario"
      >
        <CreateUserAdminForm
          onSuccess={() => {
            mutateUsers(); // Revalida la lista SWR
            setIsCreateModalOpen(false);
          }}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Modal para Editar Usuario */}
      {userToEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setUserToEdit(null);
            setIsEditModalOpen(false);
          }}
          title={`Editar Usuario: ${userToEdit.name || userToEdit.email}`}
        >
          <EditUserAdminForm
            user={userToEdit}
            onSuccess={() => {
              mutateUsers();
              setIsEditModalOpen(false);
              setUserToEdit(null);
            }}
            onCancel={() => {
              setIsEditModalOpen(false);
              setUserToEdit(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
