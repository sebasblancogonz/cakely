import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import {
  TableRow,
  TableCell,
  TableBody,
  Table,
  TableHeader,
  TableHead
} from '@/components/ui/table';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { IngredientForm } from '@/components/forms/IngredientForm';
import { IngredientPrice } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import TableSkeleton from '@/components/common/TableSkeleton';
import { IngredientFormData } from '@/lib/validators/ingredients';

interface IngredientsSettingsProps {
  ingredients: IngredientPrice[];
  loadingIngredients: boolean;
  isIngredientDialogOpen: boolean;
  editingIngredient: Partial<IngredientPrice> | null;
  setIsIngredientDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveIngredient: (data: IngredientFormData) => Promise<void>;
  handleDeleteIngredient: (id: number) => Promise<void>;
  openIngredientDialog: (ingredient?: Partial<IngredientPrice> | null) => void;
}

const IngredientsSettings: React.FC<IngredientsSettingsProps> = ({
  ingredients,
  loadingIngredients,
  isIngredientDialogOpen,
  editingIngredient,
  setIsIngredientDialogOpen,
  handleSaveIngredient,
  handleDeleteIngredient,
  openIngredientDialog
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Materias Primas</CardTitle>
          <CardDescription className="mr-2">
            Gestiona los precios de tus ingredientes.
          </CardDescription>
        </div>
        <Dialog
          open={isIngredientDialogOpen}
          onOpenChange={setIsIngredientDialogOpen}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openIngredientDialog()}>
              <PlusCircle className="h-3.5 w-3.5" />{' '}
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Añadir Ingrediente
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIngredient?.id ? 'Editar' : 'Añadir'} Ingrediente
              </DialogTitle>
            </DialogHeader>
            <IngredientForm
              ingredient={editingIngredient || {}}
              onSave={handleSaveIngredient}
              closeDialog={() => setIsIngredientDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loadingIngredients ? (
          <TableSkeleton rows={4} cols={5} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Precio/Unidad (€)</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.length > 0 ? (
                ingredients.map((ing) => (
                  <TableRow key={ing.id}>
                    <TableCell>{ing.name}</TableCell>
                    <TableCell>{ing.unit}</TableCell>
                    <TableCell>{Number(ing.pricePerUnit).toFixed(4)}</TableCell>
                    <TableCell>{ing.supplier || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openIngredientDialog(ing)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteIngredient(ing.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow key="no-ingredients-row">
                  <TableCell colSpan={5} className="text-center h-24">
                    No hay ingredientes definidos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default IngredientsSettings;
