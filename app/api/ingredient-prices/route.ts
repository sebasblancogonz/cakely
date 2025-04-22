import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ingredientPrices } from '@/lib/db';
import { NewIngredientPriceSchema } from '@/lib/validators/ingredients';
import { ilike, or, asc, sql, eq, count } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    let query = db
      .select()
      .from(ingredientPrices)
      .orderBy(asc(ingredientPrices.name))
      .$dynamic();
    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        or(
          ilike(ingredientPrices.name, searchTerm),
          ilike(ingredientPrices.supplier, searchTerm)
        )
      );
    }
    const ingredients = await query;
    return NextResponse.json(ingredients);
  } catch (error) {
    console.error('API Error fetching ingredients:', error);
    return NextResponse.json(
      { message: 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
      name: validatedData.name,
      unit: validatedData.unit,
      pricePerUnit: validatedData.pricePerUnit.toString(),
      supplier: validatedData.supplier
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
    console.error('API Error creating ingredient:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { message: 'An ingredient with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Failed to create ingredient', error: error.message },
      { status: 500 }
    );
  }
}
