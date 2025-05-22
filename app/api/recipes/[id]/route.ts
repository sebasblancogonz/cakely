import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, recipeIngredients, ingredientPrices } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { updateRecipeSchema } from '@/lib/validators/recipes';
import { RecipeIngredient, RecipeWithIngredients } from '@/types/types';
import { AuthenticatedRequestContext } from '@/lib/api/authTypes';
import { withApiProtection } from '@/lib/api/withApiProtection';

async function getRecipeHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { businessId } = authContext;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { pathname } = request.nextUrl;
  const id = Number(pathname.split('/').pop());
  try {
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid recipe ID' },
        { status: 400 }
      );
    }

    const recipeDetails = await db.query.recipes.findFirst({
      where: and(eq(recipes.id, id), eq(recipes.businessId, businessId)),
      with: {
        recipeIngredients: {
          with: {
            ingredient: true
          }
        }
      }
    });

    if (!recipeDetails) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(recipeDetails);
  } catch (error) {
    console.error(
      `API Error fetching recipe ${id} for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch recipe details' },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(getRecipeHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});

async function updateRecipeHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { businessId } = authContext;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { pathname } = request.nextUrl;
  const id = Number(pathname.split('/').pop());
  try {
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid recipe ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updateRecipeSchema.safeParse(body);

    if (!validation.success) {
      console.error(
        'API Recipe PUT Validation Error:',
        validation.error.format()
      );
      return NextResponse.json(
        { message: 'Invalid input data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { recipeIngredients: newIngredientsData, ...recipeOnlyData } =
      validation.data;

    const updatedRecipeWithDetails = await db.transaction(async (tx: any) => {
      let recipeUpdated = false;

      const recipeTableUpdates: Partial<typeof recipes.$inferInsert> = {};

      if (recipeOnlyData.name !== undefined) {
        recipeTableUpdates.name = recipeOnlyData.name as string;
      }
      if (recipeOnlyData.productType !== undefined) {
        recipeTableUpdates.productType = recipeOnlyData.productType as string;
      }
      if (recipeOnlyData.baseLaborHours !== undefined) {
        recipeTableUpdates.baseLaborHours =
          recipeOnlyData.baseLaborHours!.toString();
      }
      if (recipeOnlyData.notes !== undefined) {
        recipeTableUpdates.notes = recipeOnlyData.notes as string | null;
      }

      if (Object.keys(recipeTableUpdates).length > 0) {
        recipeTableUpdates.updatedAt = new Date();
        console.log(
          `[Recipe Tx ${id}] Updating recipe table with:`,
          recipeTableUpdates
        );
        const updateResult = await tx
          .update(recipes)
          .set(recipeTableUpdates)
          .where(and(eq(recipes.id, id), eq(recipes.businessId, businessId)))
          .returning({ id: recipes.id });

        if (updateResult.length === 0) {
          throw new Error(
            'Receta no encontrada para actualizar o no autorizada.'
          );
        }
        recipeUpdated = true;
        console.log(`[Recipe Tx ${id}] Recipe table updated.`);
      } else {
        const [existingRecipe] = await tx
          .select({ id: recipes.id })
          .from(recipes)
          .where(and(eq(recipes.id, id), eq(recipes.businessId, businessId)));
        if (!existingRecipe) {
          throw new Error('Receta no encontrada o no autorizada.');
        }
      }

      let ingredientsChanged = false;
      if (newIngredientsData) {
        ingredientsChanged = true;
        console.log(`[Recipe Tx ${id}] Deleting existing ingredients...`);
        await tx
          .delete(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, id));

        // Ahora que sabemos que newIngredientsData es un array (puede estar vacío),
        // podemos usar .length y .map sin problemas.
        if (
          Array.isArray(newIngredientsData) &&
          newIngredientsData.length > 0
        ) {
          const ingredientIdsToCheck = newIngredientsData.map(
            (ing) => ing.ingredientId
          );

          const validIngredientRows = await tx
            .select({ id: ingredientPrices.id })
            .from(ingredientPrices)
            .where(
              and(
                eq(ingredientPrices.businessId, businessId),
                inArray(ingredientPrices.id, ingredientIdsToCheck)
              )
            );
          const validIdSet = new Set(
            validIngredientRows.map((i: RecipeIngredient) => i.id)
          );

          const ingredientsToInsert = newIngredientsData
            .filter((ing) => validIdSet.has(ing.ingredientId))
            .map((ing) => ({
              recipeId: id,
              ingredientId: ing.ingredientId,
              quantity: ing.quantity.toString(),
              unit: ing.unit
            }));

          if (ingredientsToInsert.length !== newIngredientsData.length) {
            console.warn(
              `[Recipe Tx ${id}] Se intentaron añadir ingredientes no válidos o no pertenecientes al negocio.`
            );
          }

          if (ingredientsToInsert.length > 0) {
            console.log(
              `[Recipe Tx ${id}] Inserting ${ingredientsToInsert.length} new ingredients...`
            );
            await tx.insert(recipeIngredients).values(ingredientsToInsert);
          }
        } else {
          console.log(
            `[Recipe Tx ${id}] newIngredientsData estaba presente pero vacío. Todos los ingredientes fueron eliminados.`
          );
        }
      }

      if (
        ingredientsChanged &&
        !recipeUpdated &&
        Object.keys(recipeTableUpdates).length === 0
      ) {
        console.log(
          `[Recipe Tx ${id}] Touching recipe updatedAt due to ingredient changes.`
        );
        await tx
          .update(recipes)
          .set({ updatedAt: new Date() })
          .where(and(eq(recipes.id, id), eq(recipes.businessId, businessId)));
      }

      const finalRecipe = await tx.query.recipes.findFirst({
        where: and(eq(recipes.id, id), eq(recipes.businessId, businessId)),
        with: {
          recipeIngredients: {
            with: {
              ingredient: {
                columns: {
                  name: true,
                  unit: true,
                  pricePerUnit: true,
                  id: true
                }
              }
            },
            columns: {
              quantity: true,
              unit: true,
              ingredientId: true,
              id: true
            }
          }
        }
      });

      if (!finalRecipe) {
        throw new Error(
          'No se pudo obtener la receta actualizada después de la transacción.'
        );
      }
      console.log(`[Recipe Tx ${id}] Transacción completada.`);
      return finalRecipe as RecipeWithIngredients;
    });

    return NextResponse.json(updatedRecipeWithDetails);
  } catch (error: any) {
    console.error(
      `API Error updating recipe ${id} for business ${businessId}:`,
      error
    );
    if (error.message?.includes('Recipe not found')) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (
      error.code === '23505' &&
      error.constraint === 'business_recipe_name_idx'
    ) {
      return NextResponse.json(
        { message: 'A recipe with this name already exists for your business' },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { message: 'Invalid related data (e.g., ingredient ID)' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Failed to update recipe', error: error.message },
      { status: 500 }
    );
  }
}

export const PUT = withApiProtection(updateRecipeHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});

async function deleteRecipeHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { businessId } = authContext;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { pathname } = request.nextUrl;
  const id = Number(pathname.split('/').pop());
  try {
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid recipe ID' },
        { status: 400 }
      );
    }

    const deletedRecipe = await db.transaction(async (tx: any) => {
      const result = await tx
        .delete(recipes)
        .where(and(eq(recipes.id, id), eq(recipes.businessId, businessId)))
        .returning({ deletedId: recipes.id });

      if (result.length === 0) {
        throw new Error('Recipe not found for deletion or not authorized');
      }
      return result[0];
    });

    return NextResponse.json({
      message: 'Recipe deleted successfully',
      id: deletedRecipe.deletedId
    });
  } catch (error: any) {
    console.error(
      `API Error deleting recipe ${id} for business ${businessId}:`,
      error
    );
    if (error.message?.includes('Recipe not found')) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { message: 'Failed to delete recipe', error: error.message },
      { status: 500 }
    );
  }
}

export const DELETE = withApiProtection(deleteRecipeHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});
