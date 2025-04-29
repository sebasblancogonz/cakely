'use client';

import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

import OperativeSettings from '@/components/settings/OperativeSettings';
import IngredientsSettings from '@/components/settings/IngredientsSettings';
import RecipeSettings from '@/components/settings/RecipeSettings';
import BusinessProfileSettings from '@/components/settings/BusinessProfileSettings';
import TeamManagementSettings from '@/components/settings/TeamManagementSettings';

import type {
  IngredientPrice,
  Recipe,
  RecipeWithIngredients
} from '@/types/types';
import type { IngredientFormData } from '@/lib/validators/ingredients';
import type { RecipeFormData } from '@/lib/validators/recipes';
import type { TeamRole } from '@/types/next-auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { useBusinessProfile } from '@/hooks/use-business-profile';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import UserProfileSettings from '@/components/settings/UserProfileSettings';

type BusinessNameUpdateData = { name: string };

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { profile, isLoadingProfile, mutateProfile } = useBusinessProfile();

  const currentUserRole = session?.user?.role as TeamRole | undefined | null;
  const currentUserId = session?.user?.id;
  const businessId = session?.user?.businessId;
  const isLoadingSession = sessionStatus === 'loading';
  const currentUserName = session?.user?.name;

  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientPrice[]>([]);
  const [isIngredientDialogOpen, setIsIngredientDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] =
    useState<Partial<IngredientPrice> | null>(null);

  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] =
    useState<Partial<RecipeWithIngredients> | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOperationalData() {
      const canLoadOpData =
        currentUserRole &&
        ['OWNER', 'ADMIN', 'EDITOR'].includes(currentUserRole);

      if (!businessId || !canLoadOpData) {
        console.log(
          'SettingsPage: Skipping operational data load (no businessId or permission). Role:',
          currentUserRole
        );
        setLoadingIngredients(false);
        setLoadingRecipes(false);
        return;
      }

      console.log(
        'SettingsPage: Loading operational data for business:',
        businessId
      );
      setLoadingIngredients(true);
      setLoadingRecipes(true);
      try {
        const [ingredientsRes, recipesRes] = await Promise.allSettled([
          fetch('/api/ingredient-prices'),
          fetch('/api/recipes')
        ]);

        let ingredientsData: IngredientPrice[] = [];
        let recipesData: Recipe[] = [];
        let fetchOk = true;

        if (ingredientsRes.status === 'fulfilled' && ingredientsRes.value.ok) {
          ingredientsData =
            (await ingredientsRes.value.json()).ingredients || [];
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
          recipesData = (await recipesRes.value.json()).recipes || [];
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
              title: 'Error de Carga',
              description:
                'No se pudieron cargar algunos datos operativos (ingredientes/recetas).',
              variant: 'destructive'
            });
          }
          setIngredients(ingredientsData);
          setRecipes(recipesData);
        }
      } catch (error) {
        console.error('Error loading operational data:', error);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Error general al cargar datos operativos.',
            variant: 'destructive'
          });
          setIngredients([]);
          setRecipes([]);
        }
      } finally {
        if (isMounted) {
          setLoadingIngredients(false);
          setLoadingRecipes(false);
        }
      }
    }

    if (sessionStatus === 'authenticated' && businessId) {
      loadOperationalData();
    } else if (sessionStatus !== 'loading') {
      setLoadingIngredients(false);
      setLoadingRecipes(false);
    }
    return () => {
      isMounted = false;
    };
  }, [sessionStatus, businessId, currentUserRole]);

  const handleSaveIngredient = async (data: IngredientFormData) => {};
  const handleDeleteIngredient = async (id: number) => {};
  const openIngredientDialog = (
    ingredient: Partial<IngredientPrice> | null = null
  ) => {};
  const handleSaveRecipe = async (data: RecipeFormData) => {};
  const handleDeleteRecipe = async (id: number) => {};
  const openRecipeDialog = async (recipe: Partial<Recipe> | null = null) => {};

  const handleSaveProfileName = async (data: BusinessNameUpdateData) => {
    console.log('Saving business profile name:', data);
    try {
      const response = await fetch('/api/business-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update profile name');
      }

      mutateProfile();

      toast({
        title: 'Éxito',
        description: 'Nombre del negocio actualizado.'
      });
    } catch (error) {
      console.error('Error saving business name:', error);
      toast({
        title: 'Error',
        description: `No se pudo guardar el nombre: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  if (
    isLoadingSession ||
    (sessionStatus === 'authenticated' && isLoadingProfile)
  ) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-theme(space.14))]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessionStatus !== 'authenticated' || !businessId || !currentUserRole) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-theme(space.14))]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              No estás autorizado para ver esta página o falta información
              esencial de la sesión.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEditProfile =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const canEditOperationalSettings =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const canManageTeam =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const canAccessIngredients =
    currentUserRole === 'OWNER' ||
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'EDITOR';
  const canAccessRecipes =
    currentUserRole === 'OWNER' ||
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'EDITOR';

  return (
    <div className="p-4 md:p-6 space-y-6 lg:space-y-8 pb-16">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ajustes</h1>

      <UserProfileSettings currentUserName={currentUserName} />

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Ajustes del Negocio
      </h1>
      {canEditProfile && (
        <BusinessProfileSettings
          currentName={profile?.name ?? null}
          currentLogoUrl={profile?.logoUrl ?? null}
          loadingProfile={isLoadingProfile}
          onSaveProfile={handleSaveProfileName}
          businessId={businessId}
          mutateProfile={mutateProfile}
        />
      )}
      {canEditOperationalSettings && <OperativeSettings />}
      {canManageTeam && (
        <TeamManagementSettings
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          businessId={businessId}
        />
      )}
      {canAccessIngredients && (
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
      )}
      {canAccessRecipes && (
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
      )}
      {!canEditProfile &&
        !canEditOperationalSettings &&
        !canManageTeam &&
        !canAccessIngredients &&
        !canAccessRecipes && (
          <Card>
            <CardHeader>
              <CardTitle>Ajustes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No tienes permiso para acceder a la configuración.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
