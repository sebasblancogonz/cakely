import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, recipeIngredients } from '@/lib/db';
import { UpdateRecipeInputSchema } from '@/lib/validators/recipes';
import { eq } from 'drizzle-orm';

interface RouteContext {
  params: { id: string };
}

export async function GET(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const id = Number(pathname.split('/').pop());

  try {
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid recipe ID' },
        { status: 400 }
      );
    }

    const recipeDetails = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
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
    console.error(`API Error fetching recipe ${id}:`, error);
    return NextResponse.json(
      { message: 'Failed to fetch recipe details' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const id = Number(pathname.split('/').pop());

  try {
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid recipe ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = UpdateRecipeInputSchema.safeParse(body);

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

      let updatedRecipeBase;
      if (Object.keys(dataToUpdateRecipe).length > 0) {
        dataToUpdateRecipe.updatedAt = new Date();
        const updateResult = await tx
          .update(recipes)
          .set(dataToUpdateRecipe)
          .where(eq(recipes.id, id))
          .returning({ id: recipes.id });
        if (updateResult.length === 0) {
          throw new Error('Recipe not found for update');
        }
        updatedRecipeBase = updateResult[0];
      } else {
        const existing = await tx
          .select({ id: recipes.id })
          .from(recipes)
          .where(eq(recipes.id, id));
        if (existing.length === 0) throw new Error('Recipe not found');
        updatedRecipeBase = existing[0];
      }

      if (ingredientsData !== undefined) {
        await tx
          .delete(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, id));

        if (ingredientsData.length > 0) {
          const ingredientsToInsert = ingredientsData.map((ing) => ({
            recipeId: id,
            ingredientId: ing.ingredientId,
            quantity: ing.quantity.toString(),
            unit: ing.unit
          }));
          await tx.insert(recipeIngredients).values(ingredientsToInsert);
        }
      }

      const finalRecipe = await tx.query.recipes.findFirst({
        where: eq(recipes.id, id),
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
    console.error(`API Error updating recipe ${id}:`, error);
    if (error.message?.includes('Recipe not found')) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error.code === '23505' && error.constraint === 'recipes_name_key') {
      return NextResponse.json(
        { message: 'A recipe with this name already exists' },
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

export async function DELETE(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
        .where(eq(recipes.id, id))
        .returning({ deletedId: recipes.id });

      if (result.length === 0) {
        throw new Error('Recipe not found for deletion');
      }
      return result[0];
    });

    return NextResponse.json({
      message: 'Recipe deleted successfully',
      id: deletedRecipe.deletedId
    });
  } catch (error: any) {
    console.error(`API Error deleting recipe ${id}:`, error);
    if (error.message?.includes('Recipe not found')) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { message: 'Failed to delete recipe', error: error.message },
      { status: 500 }
    );
  }
}
