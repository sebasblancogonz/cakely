'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useBusinessProfile } from '@/hooks/use-business-profile';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import UserProfileSettings from '@/components/settings/UserProfileSettings';

import { useIngredients } from '@/hooks/use-ingredients';
import { useRecipes } from '@/hooks/use-recipes';

import { motion } from 'framer-motion';
import FinancialSummary from '@/components/statistics/FinancialSummary';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { SubscriptionPageContentInternal } from './suscripcion/page';
import { PLANS_CONFIG } from '@/config/plans';

type BusinessNameUpdateData = { name: string };

const VALID_TABS = [
  'user-profile',
  'business',
  'team',
  'finances',
  'ingredients',
  'recipes',
  'no-access'
];

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { profile, isLoadingProfile, mutateProfile } = useBusinessProfile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUserRole = session?.user?.role as TeamRole | undefined | null;
  const currentUserId = session?.user?.id;
  const businessId = session?.user?.businessId;
  const plan = session?.user?.planId;
  const hasPlan = !!session?.user?.planId;
  const planConfig = hasPlan ? PLANS_CONFIG[plan!] : null;
  const isLoadingSession = sessionStatus === 'loading';
  const currentUserName = session?.user?.name;
  const currentUserImage = session?.user?.image;

  const canEditUserProfile = true;
  const canEditBusinessProfile =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const canEditOperationalSettings =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const canManageTeam =
    planConfig?.multiplesUsuarios &&
    (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN');
  const canAccessIngredients =
    planConfig?.calculadoraPresupuesto &&
    (currentUserRole === 'OWNER' ||
      currentUserRole === 'ADMIN' ||
      currentUserRole === 'EDITOR');
  const canAccessRecipes =
    planConfig?.calculadoraPresupuesto &&
    (currentUserRole === 'OWNER' ||
      currentUserRole === 'ADMIN' ||
      currentUserRole === 'EDITOR');
  const canViewFinances =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const canAccessSubscription =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const hasAnyBusinessAccess =
    canEditBusinessProfile ||
    canEditOperationalSettings ||
    canManageTeam ||
    canAccessIngredients ||
    canAccessRecipes ||
    canViewFinances ||
    canAccessSubscription;

  const {
    ingredients,
    isLoadingIngredients,
    isErrorIngredients,
    mutateIngredients
  } = useIngredients(canAccessIngredients);
  const { recipes, isLoadingRecipes, isErrorRecipes, mutateRecipes } =
    useRecipes(canAccessRecipes);

  const [isIngredientDialogOpen, setIsIngredientDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] =
    useState<Partial<IngredientPrice> | null>(null);
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] =
    useState<Partial<RecipeWithIngredients> | null>(null);

  const determineDefaultTab = useCallback(() => {
    if (canEditUserProfile) return 'user-profile';
    if (canViewFinances) return 'finances';
    if (canEditBusinessProfile || canEditOperationalSettings) return 'business';
    if (canManageTeam) return 'team';
    if (canAccessIngredients) return 'ingredients';
    if (canAccessRecipes) return 'recipes';
    if (canAccessSubscription) return 'subscription';
    return 'no-access';
  }, [
    canEditUserProfile,
    canViewFinances,
    canEditBusinessProfile,
    canEditOperationalSettings,
    canManageTeam,
    canAccessIngredients,
    canAccessRecipes,
    canAccessSubscription
  ]);

  const [activeTab, setActiveTab] = useState<string>(() => {
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl && VALID_TABS.includes(tabFromUrl)
      ? tabFromUrl
      : determineDefaultTab();
  });

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
      if (tabFromUrl !== activeTab) {
        setActiveTab(tabFromUrl);
      }
    } else {
      const defaultTab = determineDefaultTab();
      if (activeTab !== defaultTab) {
        setActiveTab(defaultTab);
      }
    }
  }, [searchParams, determineDefaultTab, activeTab]);

  const handleTabChange = useCallback(
    (newTabValue: string) => {
      setActiveTab(newTabValue);
      const currentParams = new URLSearchParams(searchParams.toString());
      currentParams.set('tab', newTabValue);
      router.push(`${pathname}?${currentParams.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const handleSaveIngredient = async (data: IngredientFormData) => {
    const isEditing = !!data.id;
    const url = isEditing
      ? `/api/ingredient-prices/${data.id}`
      : '/api/ingredient-prices';
    const method = isEditing ? 'PUT' : 'POST';
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

      await mutateIngredients();
      setIsIngredientDialogOpen(false);
      toast({
        title: 'Éxito',
        description: `Ingrediente ${isEditing ? 'actualizado' : 'añadido'}.`
      });
    } catch (error) {
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
    try {
      const response = await fetch(`/api/ingredient-prices/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }

      mutateIngredients(
        (currentData) => currentData?.filter((ing) => ing.id !== id) ?? [],
        { revalidate: false }
      );

      toast({ title: 'Éxito', description: 'Ingrediente eliminado.' });
    } catch (error) {
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

      await mutateRecipes();
      setIsRecipeDialogOpen(false);
      toast({
        title: 'Éxito',
        description: `Receta ${isEditing ? 'actualizada' : 'creada'}.`
      });
    } catch (error) {
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
    try {
      const response = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API error');
      }

      mutateRecipes(
        (currentData) => currentData?.filter((r) => r.id !== id) ?? [],
        { revalidate: false }
      );

      toast({ title: 'Éxito', description: 'Receta eliminada.' });
    } catch (error) {
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
    if (recipe?.id) {
      try {
        const res = await fetch(`/api/recipes/${recipe.id}`);
        if (!res.ok) throw new Error('Failed to fetch recipe details');
        const fullRecipeData = await res.json();
        setEditingRecipe(fullRecipeData);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo cargar detalles de la receta.',
          variant: 'destructive'
        });
        setIsRecipeDialogOpen(false);
      }
    }
  };

  const handleSaveProfileName = async (data: BusinessNameUpdateData) => {
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
      <div className="flex justify-center items-center min-h-[calc(100dvh-theme(space.14))]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessionStatus !== 'authenticated' || !businessId || !currentUserRole) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100dvh-theme(space.14))]">
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

  let defaultTabValue = 'user-profile';
  if (!canEditUserProfile) {
    if (canViewFinances) defaultTabValue = 'finances';
    else if (canEditBusinessProfile || canEditOperationalSettings)
      defaultTabValue = 'business';
    else if (canManageTeam) defaultTabValue = 'team';
    else if (canAccessIngredients) defaultTabValue = 'ingredients';
    else if (canAccessRecipes) defaultTabValue = 'recipes';
    else if (canAccessSubscription) defaultTabValue = 'subscription';
    else defaultTabValue = 'no-access';
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-16 overflow-hidden">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ajustes</h1>

      {!canEditUserProfile && !hasAnyBusinessAccess ? (
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
      ) : (
        <Tabs
          onValueChange={handleTabChange}
          defaultValue={activeTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6">
            {canEditUserProfile && (
              <TabsTrigger value="user-profile">Tu Perfil</TabsTrigger>
            )}
            {(canEditBusinessProfile || canEditOperationalSettings) && (
              <TabsTrigger value="business">Negocio</TabsTrigger>
            )}
            {canManageTeam && <TabsTrigger value="team">Equipo</TabsTrigger>}
            {canViewFinances && (
              <TabsTrigger value="finances">Finanzas</TabsTrigger>
            )}
            {canAccessIngredients && (
              <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
            )}
            {canAccessRecipes && (
              <TabsTrigger value="recipes">Recetas</TabsTrigger>
            )}
            {canAccessSubscription && (
              <TabsTrigger value="subscription">Suscripción</TabsTrigger>
            )}
          </TabsList>

          {canEditUserProfile && (
            <TabsContent value="user-profile">
              <motion.div
                key="user-profile"
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <UserProfileSettings
                  currentUserImage={currentUserImage}
                  currentUserName={currentUserName}
                />
              </motion.div>
            </TabsContent>
          )}

          {(canEditBusinessProfile || canEditOperationalSettings) && (
            <TabsContent value="business">
              <motion.div
                key="business"
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-6"
              >
                {canEditBusinessProfile && (
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
              </motion.div>
            </TabsContent>
          )}

          {canManageTeam && (
            <TabsContent value="team">
              <motion.div
                key="team"
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <TeamManagementSettings
                  currentUserRole={currentUserRole}
                  currentUserId={currentUserId}
                  businessId={businessId}
                />
              </motion.div>
            </TabsContent>
          )}
          {canViewFinances && (
            <TabsContent value="finances">
              <motion.div
                key="finances"
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <FinancialSummary />
              </motion.div>
            </TabsContent>
          )}

          {canAccessIngredients && (
            <TabsContent value="ingredients">
              <motion.div
                key="ingredients"
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <IngredientsSettings
                  ingredients={ingredients}
                  loadingIngredients={isLoadingIngredients}
                  isIngredientDialogOpen={isIngredientDialogOpen}
                  editingIngredient={editingIngredient}
                  setIsIngredientDialogOpen={setIsIngredientDialogOpen}
                  handleDeleteIngredient={handleDeleteIngredient}
                  openIngredientDialog={openIngredientDialog}
                  handleSaveIngredient={handleSaveIngredient}
                />
              </motion.div>
            </TabsContent>
          )}

          {canAccessRecipes && (
            <TabsContent value="recipes">
              <motion.div
                key="recipes"
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <RecipeSettings
                  recipes={recipes}
                  loadingRecipes={isLoadingRecipes}
                  isRecipeDialogOpen={isRecipeDialogOpen}
                  editingRecipe={editingRecipe}
                  setIsRecipeDialogOpen={setIsRecipeDialogOpen}
                  handleDeleteRecipe={handleDeleteRecipe}
                  ingredients={ingredients}
                  loadingIngredients={isLoadingIngredients}
                  openRecipeDialog={openRecipeDialog}
                  handleSaveRecipe={handleSaveRecipe}
                />
              </motion.div>
            </TabsContent>
          )}

          {canAccessSubscription && (
            <TabsContent value="subscription">
              <motion.div
                key="subscription"
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <SubscriptionPageContentInternal />
              </motion.div>
            </TabsContent>
          )}

          <TabsContent value="no-access">
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
