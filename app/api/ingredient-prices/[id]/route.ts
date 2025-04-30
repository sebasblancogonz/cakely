import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ingredientPrices } from '@/lib/db';
import { updateIngredientSchema } from '@/lib/validators/ingredients';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { pathname } = req.nextUrl;
  const id = Number(pathname.split('/').pop());

  try {
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid ingredient ID' },
        { status: 400 }
      );
    }

    const ingredient = await db
      .select()
      .from(ingredientPrices)
      .where(
        and(
          eq(ingredientPrices.id, id),
          eq(ingredientPrices.businessId, businessId)
        )
      );

    if (ingredient.length === 0) {
      return NextResponse.json(
        { message: 'Ingredient not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(ingredient[0]);
  } catch (error) {
    console.error(
      `API Error fetching ingredient ${id} for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch ingredient' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { pathname } = req.nextUrl;
  const id = Number(pathname.split('/').pop());

  try {
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid ingredient ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = updateIngredientSchema.safeParse(body);

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

    const dataToSet: Record<string, string | number | Date | undefined> = {};
    for (const [key, value] of Object.entries(validation.data)) {
      if (value !== undefined && key !== 'id' && key !== 'businessId') {
        if (key === 'pricePerUnit' && typeof value === 'number') {
          dataToSet[key] = value.toString();
        } else {
          dataToSet[key] = value as string;
        }
      }
    }

    if ('updatedAt' in ingredientPrices) {
      dataToSet.updatedAt = new Date();
    }

    const updatedIngredient = await db
      .update(ingredientPrices)
      .set(dataToSet)
      .where(
        and(
          eq(ingredientPrices.id, id),
          eq(ingredientPrices.businessId, businessId)
        )
      )
      .returning();

    if (updatedIngredient.length === 0) {
      return NextResponse.json(
        { message: 'Ingredient not found for update' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedIngredient[0]);
  } catch (error: any) {
    console.error(
      `API Error updating ingredient ${id} for business ${businessId}:`,
      error
    );

    if (
      error.code === '23505' &&
      error.constraint === 'business_ingredient_name_idx'
    ) {
      return NextResponse.json(
        {
          message:
            'An ingredient with this name already exists for your business'
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Failed to update ingredient' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { pathname } = req.nextUrl;
  const id = Number(pathname.split('/').pop());

  try {
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid ingredient ID' },
        { status: 400 }
      );
    }

    const deletedIngredient = await db
      .delete(ingredientPrices)
      .where(
        and(
          eq(ingredientPrices.id, id),
          eq(ingredientPrices.businessId, businessId)
        )
      )
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
    console.error(
      `API Error deleting ingredient ${id} for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to delete ingredient' },
      { status: 500 }
    );
  }
}
