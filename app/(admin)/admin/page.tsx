import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building, Users as UsersIcon } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Panel de SuperAdministración</h1>
      <p className="text-muted-foreground">
        Gestiona los negocios y usuarios de la plataforma.
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gestionar Negocios
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Ver, crear, editar o eliminar negocios registrados en la
              plataforma.
            </p>
            <Button asChild size="sm">
              <Link href="/admin/negocios">Ir a Negocios</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gestionar Usuarios
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Ver todos los usuarios, editar sus perfiles o roles de superadmin.
            </p>
            <Button asChild size="sm">
              <Link href="/admin/usuarios">Ir a Usuarios</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
