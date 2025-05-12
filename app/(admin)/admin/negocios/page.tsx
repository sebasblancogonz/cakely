'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { toast } from '@/hooks/use-toast';

import type { AdminBusiness } from '@types';
import { CreateBusinessForm } from '@/components/businesses/CreateBusinessForm';
import { EditBusinessForm } from '@/components/businesses/EditBusinessForm';
import { useBusinesses } from '@/hooks/use-businesses';
import { BackButton } from '@/components/common/BackButton';

export default function AdminBusinessesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [businessToEdit, setBusinessToEdit] = useState<AdminBusiness | null>(
    null
  );

  const {
    businesses,
    isErrorBusinesses,
    isLoadingBusinesses,
    mutateBusinesses
  } = useBusinesses(true);

  const handleEdit = (business: AdminBusiness) => {
    setBusinessToEdit(business);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (businessId: number) => {
    if (
      !confirm(
        `¿Seguro que quieres eliminar el negocio ID ${businessId}? Esta acción es irreversible y borrará todos sus datos asociados.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al eliminar negocio');
      }
      toast({ title: 'Éxito', description: 'Negocio eliminado.' });
      mutateBusinesses();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (isLoadingBusinesses)
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  if (isErrorBusinesses)
    return (
      <p className="text-red-500">
        Error al cargar negocios: {isErrorBusinesses.message}
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestionar Negocios</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Negocio
        </Button>
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Negocios</CardTitle>
          <CardDescription>Total: {businesses.length} negocios</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre Negocio</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Email Propietario</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.map((biz) => (
                <TableRow key={biz.id}>
                  <TableCell>{biz.id}</TableCell>
                  <TableCell className="font-medium">{biz.name}</TableCell>
                  <TableCell>{biz.ownerName || '-'}</TableCell>
                  <TableCell>{biz.ownerEmail || '-'}</TableCell>
                  <TableCell>
                    {new Date(biz.createdAt!).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(biz)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(biz.id!)}
                      title="Eliminar"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {businesses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No hay negocios registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modales para Crear y Editar */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Negocio"
      >
        <CreateBusinessForm
          onSuccess={() => {
            mutateBusinesses();
            setIsCreateModalOpen(false);
          }}
          onCancel={() => setIsCreateModalOpen(false)}
        />
        <p className="p-4">Formulario de Crear Negocio (Placeholder)</p>
        <Button
          onClick={() => setIsCreateModalOpen(false)}
          variant="outline"
          className="m-4"
        >
          Cerrar
        </Button>
      </Modal>

      {businessToEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Editar Negocio: ${businessToEdit.name}`}
        >
          <EditBusinessForm
            business={businessToEdit}
            onSuccess={() => {
              mutateBusinesses();
              setIsEditModalOpen(false);
            }}
            onCancel={() => setIsEditModalOpen(false)}
          />
          <p className="p-4">
            Formulario de Editar Negocio para {businessToEdit.name}{' '}
            (Placeholder)
          </p>
          <Button
            onClick={() => setIsEditModalOpen(false)}
            variant="outline"
            className="m-4"
          >
            Cerrar
          </Button>
        </Modal>
      )}
    </div>
  );
}
