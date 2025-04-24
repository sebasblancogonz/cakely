import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ingredientPrices } from '@/lib/db';
import { NewIngredientPriceSchema } from '@/lib/validators/ingredients';
import { ilike, or, asc, eq, and, SQL } from 'drizzle-orm';
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
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';

    const conditions: SQL[] = [];
    conditions.push(eq(ingredientPrices.businessId, businessId));

    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(ingredientPrices.name, searchTerm),
          ilike(ingredientPrices.supplier, searchTerm)
        )!
      );
    }

    const query = db
      .select()
      .from(ingredientPrices)

      .where(and(...conditions))

      .orderBy(asc(ingredientPrices.name));

    const ingredients = await query;

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error(
      `API Error fetching ingredients for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch ingredients' },
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
    const validation = NewIngredientPriceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const dataToInsert = {
      ...validatedData,
      businessId: businessId,
      pricePerUnit: validatedData.pricePerUnit.toString()
    };

    const newIngredient = await db
      .insert(ingredientPrices)
      .values(dataToInsert)
      .returning();

    if (!newIngredient || newIngredient.length === 0) {
      throw new Error('Failed to return new ingredient after insert.');
    }

    return NextResponse.json(newIngredient[0], { status: 201 });
  } catch (error: any) {
    console.error(
      `API Error creating ingredient for business ${businessId}:`,
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
      { message: 'Failed to create ingredient', error: error.message },
      { status: 500 }
    );
  }
}
