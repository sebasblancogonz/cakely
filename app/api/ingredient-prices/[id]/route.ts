import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ingredientPrices } from '@/lib/db';
import { UpdateIngredientPriceSchema } from '@/lib/validators/ingredients';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid ingredient ID' },
        { status: 400 }
      );
    }
    const ingredient = await db
      .select()
      .from(ingredientPrices)
      .where(eq(ingredientPrices.id, id));
    if (ingredient.length === 0) {
      return NextResponse.json(
        { message: 'Ingredient not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(ingredient[0]);
  } catch (error) {
    console.error(`API Error fetching ingredient ${params.id}:`, error);
    return NextResponse.json(
      { message: 'Failed to fetch ingredient' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid ingredient ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = UpdateIngredientPriceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: validation.error.format() },
        { status: 400 }
      );
    }
    if (Object.keys(validation.data).length === 0) {
      return NextResponse.json(
        { message: 'No fields provided for update' },
        { status: 400 }
      );
    }

    // --- CORRECCIÓN AQUÍ ---
    const dataToSet: Record<string, string | Date | undefined> = {};
    for (const [key, value] of Object.entries(validation.data)) {
      if (value !== undefined) {
        if (key === 'pricePerUnit') {
          dataToSet[key] = (value as number).toString();
        } else {
          dataToSet[key] = value as string;
        }
      }
    }
    dataToSet.updatedAt = new Date();

    const updatedIngredient = await db
      .update(ingredientPrices)
      .set(dataToSet)
      .where(eq(ingredientPrices.id, id))
      .returning();

    if (updatedIngredient.length === 0) {
      return NextResponse.json(
        { message: 'Ingredient not found for update' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedIngredient[0]);
  } catch (error: any) {
    console.error(`API Error updating ingredient ${params.id}:`, error);
    if (
      error.code === '23505' &&
      error.constraint === 'ingredient_prices_name_key'
    ) {
      return NextResponse.json(
        { message: 'An ingredient with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Failed to update ingredient' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid ingredient ID' },
        { status: 400 }
      );
    }
    const deletedIngredient = await db
      .delete(ingredientPrices)
      .where(eq(ingredientPrices.id, id))
      .returning({ deletedId: ingredientPrices.id });
    if (deletedIngredient.length === 0) {
      return NextResponse.json(
        { message: 'Ingredient not found for deletion' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      message: 'Ingredient deleted successfully',
      id: deletedIngredient[0].deletedId
    });
  } catch (error) {
    console.error(`API Error deleting ingredient ${params.id}:`, error);
    return NextResponse.json(
      { message: 'Failed to delete ingredient' },
      { status: 500 }
    );
  }
}
