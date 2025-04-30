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
import { RecipeForm } from '@/components/forms/RecipeForm';
import { Recipe, RecipeWithIngredients, IngredientPrice } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import TableSkeleton from '@/components/common/TableSkeleton';
import { RecipeFormData } from '@/lib/validators/recipes';

interface RecipeSettingsProps {
  recipes: Recipe[];
  loadingRecipes: boolean;
  isRecipeDialogOpen: boolean;
  editingRecipe: Partial<RecipeWithIngredients> | null;
  ingredients: IngredientPrice[];
  loadingIngredients: boolean;
  setIsRecipeDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveRecipe: (data: RecipeFormData) => Promise<void>;
  handleDeleteRecipe: (id: number) => Promise<void>;
  openRecipeDialog: (recipe?: Partial<Recipe> | null) => Promise<void>;
}

const RecipeSettings: React.FC<RecipeSettingsProps> = ({
  recipes,
  loadingRecipes,
  isRecipeDialogOpen,
  editingRecipe,
  ingredients,
  loadingIngredients,
  setIsRecipeDialogOpen,
  handleSaveRecipe,
  handleDeleteRecipe,
  openRecipeDialog
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Recetas</CardTitle>
          <CardDescription className="mr-2">
            Define las recetas base para tus productos.
          </CardDescription>
        </div>
        <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openRecipeDialog(null)}>
              <PlusCircle className="h-3.5 w-3.5" />{' '}
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Añadir Receta
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingRecipe?.id ? 'Editar' : 'Añadir'} Receta
              </DialogTitle>
            </DialogHeader>
            {isRecipeDialogOpen && !loadingIngredients ? (
              <RecipeForm
                recipe={editingRecipe}
                availableIngredients={ingredients}
                onSave={handleSaveRecipe}
                closeDialog={() => setIsRecipeDialogOpen(false)}
              />
            ) : (
              isRecipeDialogOpen && (
                <div className="p-6 text-center">Cargando ingredientes...</div>
              )
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loadingRecipes ? (
          <TableSkeleton rows={3} cols={4} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Receta</TableHead>
                <TableHead>Tipo Producto</TableHead>
                <TableHead>Horas Base</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.length > 0 ? (
                recipes.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>{rec.name}</TableCell>
                    <TableCell>{rec.productType}</TableCell>
                    <TableCell>
                      {Number(rec.baseLaborHours).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openRecipeDialog(rec)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteRecipe(rec.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow key="no-recipes-row">
                  <TableCell colSpan={4} className="text-center h-24">
                    No hay recetas definidas.
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

export default RecipeSettings;
