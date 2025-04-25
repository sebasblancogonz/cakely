import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, recipeIngredients, ingredientPrices } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { updateRecipeSchema } from '@/lib/validators/recipes';

export async function GET(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

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

export async function PUT(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

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

    const { recipeIngredients: ingredientsData, ...recipeData } =
      validation.data;

    const updatedRecipe = await db.transaction(async (tx) => {
      const dataToUpdateRecipe: Record<string, string | Date | undefined> = {};
      if (recipeData.name !== undefined)
        dataToUpdateRecipe.name = recipeData.name;
      if (recipeData.productType !== undefined)
        dataToUpdateRecipe.productType = recipeData.productType;
      if (recipeData.baseLaborHours !== undefined)
        dataToUpdateRecipe.baseLaborHours =
          recipeData.baseLaborHours.toString();
      if (recipeData.notes !== undefined)
        dataToUpdateRecipe.notes = recipeData.notes;

      let recipeExists = false;
      if (Object.keys(dataToUpdateRecipe).length > 0) {
        dataToUpdateRecipe.updatedAt = new Date();
        const updateResult = await tx
          .update(recipes)
          .set(dataToUpdateRecipe)
          .where(and(eq(recipes.id, id), eq(recipes.businessId, businessId)))
          .returning({ id: recipes.id });
        if (updateResult.length === 0) {
          throw new Error('Recipe not found for update or not authorized');
        }
        recipeExists = true;
      } else {
        const existing = await tx
          .select({ id: recipes.id })
          .from(recipes)
          .where(and(eq(recipes.id, id), eq(recipes.businessId, businessId)));
        if (existing.length === 0)
          throw new Error('Recipe not found or not authorized');
        recipeExists = true;
      }

      if (recipeExists && ingredientsData !== undefined) {
        await tx
          .delete(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, id));

        if (ingredientsData.length > 0) {
          const ingredientIdsToCheck = ingredientsData.map(
            (ing) => ing.ingredientId
          );

          const validIngredientIds = await tx
            .select({ id: ingredientPrices.id })
            .from(ingredientPrices)
            .where(
              and(
                eq(ingredientPrices.businessId, businessId),
                inArray(ingredientPrices.id, ingredientIdsToCheck)
              )
            );

          const validIdSet = new Set(validIngredientIds.map((i) => i.id));

          const ingredientsToInsert = ingredientsData
            .filter((ing) => validIdSet.has(ing.ingredientId))
            .map((ing) => ({
              recipeId: id,
              ingredientId: ing.ingredientId,
              quantity: ing.quantity.toString(),
              unit: ing.unit
            }));

          if (ingredientsToInsert.length !== ingredientsData.length) {
            console.warn(
              `Attempted to add ingredients not belonging to business ${businessId} for recipe ${id}`
            );
          }

          if (ingredientsToInsert.length > 0) {
            await tx.insert(recipeIngredients).values(ingredientsToInsert);
          }
        }
      }

      const finalRecipe = await tx.query.recipes.findFirst({
        where: and(eq(recipes.id, id), eq(recipes.businessId, businessId)),
        with: {
          recipeIngredients: { with: { ingredient: true } }
        }
      });

      if (!finalRecipe) {
        throw new Error('Failed to retrieve updated recipe');
      }
      return finalRecipe;
    });

    return NextResponse.json(updatedRecipe);
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

export async function DELETE(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

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

    const deletedRecipe = await db.transaction(async (tx) => {
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
