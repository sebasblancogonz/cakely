import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, recipeIngredients, ingredientPrices } from '@/lib/db';
import { NewRecipeInputSchema } from '@/lib/validators/recipes';
import { asc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const recipeListWithDetails = await db.query.recipes.findMany({
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
    console.error('API Error fetching recipes with details:', error);
    return NextResponse.json(
      { message: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = NewRecipeInputSchema.safeParse(body);

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
      name: recipeData.name,
      productType: recipeData.productType,
      baseLaborHours: recipeData.baseLaborHours.toString(),
      notes: recipeData.notes
    };

    const newRecipe = await db.transaction(async (tx) => {
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
      return insertedRecipe[0];
    });

    return NextResponse.json(newRecipe, { status: 201 });
  } catch (error: any) {
    console.error('API Error creating recipe:', error);
    if (error.code === '23505' && error.constraint === 'recipes_name_key') {
      return NextResponse.json(
        { message: 'A recipe with this name already exists' },
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
