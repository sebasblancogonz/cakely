import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, recipeIngredients, ingredientPrices } from '@/lib/db';
import { recipeFormSchema } from '@/lib/validators/recipes';
import { asc, eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  try {
    const recipeListWithDetails = await db.query.recipes.findMany({
      where: eq(recipes.businessId, businessId),
      orderBy: [asc(recipes.name)],
      with: {
        recipeIngredients: {
          with: {
            ingredient: true
          }
        }
      }
    });
    return NextResponse.json(recipeListWithDetails);
  } catch (error) {
    console.error(
      `API Error fetching recipes for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validation = recipeFormSchema.safeParse(body);

    if (!validation.success) {
      console.error(
        'API Recipe POST Validation Error:',
        validation.error.format()
      );
      return NextResponse.json(
        { message: 'Invalid input data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { recipeIngredients: ingredientsData, ...recipeData } =
      validation.data;

    const dataToInsert = {
      ...recipeData,
      businessId: businessId,
      baseLaborHours: recipeData.baseLaborHours.toString()
    };

    const newRecipe = await db.transaction(async (tx: any) => {
      const insertedRecipe = await tx
        .insert(recipes)
        .values(dataToInsert)
        .returning({
          insertedId: recipes.id,
          name: recipes.name,
          productType: recipes.productType,
          baseLaborHours: recipes.baseLaborHours
        });

      if (!insertedRecipe || insertedRecipe.length === 0) {
        throw new Error('Failed to insert recipe and get ID');
      }
      const newRecipeId = insertedRecipe[0].insertedId;

      const ingredientsToInsert = ingredientsData.map((ing) => ({
        recipeId: newRecipeId,
        ingredientId: ing.ingredientId,
        quantity: ing.quantity.toString(),
        unit: ing.unit
      }));

      if (ingredientsToInsert.length > 0) {
        await tx.insert(recipeIngredients).values(ingredientsToInsert);
      }

      const finalNewRecipe = await tx.query.recipes.findFirst({
        where: eq(recipes.id, newRecipeId),
        with: {
          recipeIngredients: {
            with: { ingredient: true }
          }
        }
      });

      if (!finalNewRecipe) {
        throw new Error('Failed to fetch newly created recipe with details.');
      }

      return finalNewRecipe;
    });

    return NextResponse.json(newRecipe, { status: 201 });
  } catch (error: any) {
    console.error(
      `API Error creating recipe for business ${businessId}:`,
      error
    );

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
        { message: 'Invalid ingredient ID provided' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Failed to create recipe', error: error.message },
      { status: 500 }
    );
  }
}
