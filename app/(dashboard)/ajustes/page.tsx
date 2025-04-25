'use client';

import React, { useState, useEffect } from 'react';
import OperativeSettings from '@/components/settings/OperativeSettings';
import IngredientsSettings from '@/components/settings/IngredientsSettings';
import RecipeSettings from '@/components/settings/RecipeSettings';
import { IngredientPrice, Recipe, RecipeWithIngredients } from '@/types/types';
import { IngredientFormData } from '@/lib/validators/ingredients';
import { RecipeFormData } from '@/lib/validators/recipes';
import { toast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientPrice[]>([]);
  const [isIngredientDialogOpen, setIsIngredientDialogOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] =
    useState<Partial<RecipeWithIngredients> | null>(null);
  const [editingIngredient, setEditingIngredient] =
    useState<Partial<IngredientPrice> | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingIngredients(true);
      try {
        const [ingredientsRes, recipesRes] = await Promise.allSettled([
          fetch('/api/ingredient-prices'),
          fetch('/api/recipes')
        ]);
        let ingredientsData: IngredientPrice[] = [];
        let recipesData: Recipe[] = [];
        let fetchOk = true;

        if (ingredientsRes.status === 'fulfilled' && ingredientsRes.value.ok) {
          ingredientsData = await ingredientsRes.value.json();
        } else {
          fetchOk = false;
          console.error(
            'Failed to fetch ingredients:',
            ingredientsRes.status === 'fulfilled'
              ? await ingredientsRes.value.text()
              : ingredientsRes.reason
          );
        }
        if (recipesRes.status === 'fulfilled' && recipesRes.value.ok) {
          recipesData = await recipesRes.value.json();
        } else {
          fetchOk = false;
          console.error(
            'Failed to fetch recipes:',
            recipesRes.status === 'fulfilled'
              ? await recipesRes.value.text()
              : recipesRes.reason
          );
        }

        if (isMounted) {
          if (!fetchOk) {
            toast({
              title: 'Error',
              description: 'No se pudieron cargar todos los datos.',
              variant: 'destructive'
            });
            setLoadingIngredients(false);
          }
        }
        setIngredients(ingredientsData || []);
        setRecipes(recipesData || []);
      } catch (error) {
        console.error('Error loading page data:', error);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Error general al cargar datos.',
            variant: 'destructive'
          });
        }
      } finally {
        if (isMounted) {
          setLoadingIngredients(false);
          setLoadingRecipes(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveIngredient = async (data: IngredientFormData) => {
    const isEditing = !!data.id;
    const url = isEditing
      ? `/api/ingredient-prices/${data.id}`
      : '/api/ingredient-prices';
    const method = isEditing ? 'PUT' : 'POST';
    console.log('Saving ingredient:', data);
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }
      const savedIngredient = await response.json();
      setIngredients((prev) =>
        isEditing
          ? prev.map((ing) =>
              ing.id === savedIngredient.id ? savedIngredient : ing
            )
          : [...prev, savedIngredient]
      );
      toast({
        title: 'Éxito',
        description: `Ingrediente ${isEditing ? 'actualizado' : 'añadido'}.`
      });
    } catch (error) {
      console.error('Error saving ingredient:', error);
      toast({
        title: 'Error',
        description: `No se pudo guardar el ingrediente: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteIngredient = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este ingrediente?'))
      return;
    console.log('Deleting ingredient:', id);
    try {
      const response = await fetch(`/api/ingredient-prices/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }
      setIngredients((prev) => prev.filter((ing) => ing.id !== id));
      toast({ title: 'Éxito', description: 'Ingrediente eliminado.' });
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      toast({
        title: 'Error',
        description: `No se pudo eliminar el ingrediente: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const handleSaveRecipe = async (data: RecipeFormData) => {
    const isEditing = !!data.id;
    const url = isEditing ? `/api/recipes/${data.id}` : '/api/recipes';
    const method = isEditing ? 'PUT' : 'POST';
    console.log('Saving recipe:', data);
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }
      const savedRecipe = await response.json();
      setRecipes((prev) =>
        isEditing
          ? prev.map((r) => (r.id === savedRecipe.id ? savedRecipe : r))
          : [...prev, savedRecipe]
      );
      toast({
        title: 'Éxito',
        description: `Receta ${isEditing ? 'actualizada' : 'creada'}.`
      });
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: 'Error',
        description: `No se pudo guardar la receta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRecipe = async (id: number) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar esta receta? Se borrarán también sus ingredientes asociados.'
      )
    )
      return;
    console.log('Deleting recipe:', id);
    try {
      const response = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      toast({ title: 'Éxito', description: 'Receta eliminada.' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        title: 'Error',
        description: `No se pudo eliminar la receta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const openIngredientDialog = (
    ingredient: Partial<IngredientPrice> | null = null
  ) => {
    setEditingIngredient(ingredient);
    setIsIngredientDialogOpen(true);
  };

  const openRecipeDialog = async (recipe: Partial<Recipe> | null = null) => {
    setIsRecipeDialogOpen(true);
    setEditingRecipe(null);
    if (recipe && recipe.id) {
      try {
        const res = await fetch(`/api/recipes/${recipe.id}`);
        if (!res.ok) throw new Error('Failed to fetch recipe details');
        const fullRecipeData = await res.json();
        setEditingRecipe(fullRecipeData);
      } catch (error) {
        console.error('Error fetching recipe details:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar detalles de la receta.',
          variant: 'destructive'
        });
        setIsRecipeDialogOpen(false);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-hidden">
      <h1 className="text-2xl font-bold">Ajustes del Negocio</h1>
      <OperativeSettings />

      <IngredientsSettings
        ingredients={ingredients}
        loadingIngredients={loadingIngredients}
        isIngredientDialogOpen={isIngredientDialogOpen}
        editingIngredient={editingIngredient}
        setIsIngredientDialogOpen={setIsIngredientDialogOpen}
        handleDeleteIngredient={handleDeleteIngredient}
        openIngredientDialog={openIngredientDialog}
        handleSaveIngredient={handleSaveIngredient}
      />

      <RecipeSettings
        recipes={recipes}
        loadingRecipes={loadingRecipes}
        isRecipeDialogOpen={isRecipeDialogOpen}
        editingRecipe={editingRecipe}
        setIsRecipeDialogOpen={setIsRecipeDialogOpen}
        handleDeleteRecipe={handleDeleteRecipe}
        ingredients={ingredients}
        loadingIngredients={loadingIngredients}
        openRecipeDialog={openRecipeDialog}
        handleSaveRecipe={handleSaveRecipe}
      />
    </div>
  );
}
