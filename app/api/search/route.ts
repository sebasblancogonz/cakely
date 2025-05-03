import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, customers, ingredientPrices, recipes } from '@/lib/db';
import { ilike, or, eq, and, SQL, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

interface SearchResult {
  id: number;
  type: 'order' | 'customer' | 'ingredient' | 'recipe';
  title: string;
  description?: string;
  url: string;
}

interface Select {
  id: number;
  title: string;
  customerName: string;
  description: string;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const searchTerm = `%${query}%`;
  const results: SearchResult[] = [];
  const limitPerType = 10;

  try {
    const baseBusinessCondition = (table: any) =>
      eq(table.businessId, businessId);

    const orderSearchFields = or(
      ilike(orders.description, searchTerm),
      ilike(orders.notes, searchTerm),
      ilike(orders.flavor, searchTerm),
      ilike(orders.customizationDetails, searchTerm),
      ilike(orders.sizeOrWeight, searchTerm),
      ilike(customers.name, searchTerm),
      ilike(sql`${orders.productType}::text`, searchTerm)
    );
    const orderCondition = and(
      baseBusinessCondition(orders),
      orderSearchFields
    );

    const foundOrders = await db
      .select({
        id: orders.id,
        title: orders.description,
        customerName: customers.name
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(orderCondition)
      .limit(limitPerType);

    results.push(
      ...foundOrders.map((o: Select) => ({
        id: o.id,
        type: 'order' as const,
        title: o.title || `Pedido #${o.id}`,
        description: o.customerName || undefined,
        url: `/app/pedidos#order-${o.id}`
      }))
    );

    const customerSearchFields = or(
      ilike(customers.name, searchTerm),
      ilike(customers.email, searchTerm),
      ilike(customers.phone, searchTerm),
      ilike(customers.instagramHandle, searchTerm),
      ilike(customers.notes, searchTerm)
    );
    const customerCondition = and(
      baseBusinessCondition(customers),
      customerSearchFields
    );

    const foundCustomers = await db
      .select({
        id: customers.id,
        title: customers.name,
        description: customers.email
      })
      .from(customers)
      .where(customerCondition)
      .limit(limitPerType);

    results.push(
      ...foundCustomers.map((c: Select) => ({
        id: c.id,
        type: 'customer' as const,
        title: c.title,
        description: c.description || undefined,
        url: `/clientes#customer-${c.id}`
      }))
    );

    const ingredientSearchFields = or(
      ilike(ingredientPrices.name, searchTerm),
      ilike(ingredientPrices.supplier, searchTerm)
    );
    const ingredientCondition = and(
      baseBusinessCondition(ingredientPrices),
      ingredientSearchFields
    );

    const foundIngredients = await db
      .select({
        id: ingredientPrices.id,
        title: ingredientPrices.name,
        description: ingredientPrices.unit
      })
      .from(ingredientPrices)
      .where(ingredientCondition)
      .limit(limitPerType);

    results.push(
      ...foundIngredients.map((i: Select) => ({
        id: i.id,
        type: 'ingredient' as const,
        title: i.title,
        description: i.description ? `Unidad: ${i.description}` : undefined,
        url: `/ajustes#ingredient-${i.id}`
      }))
    );

    const recipeSearchFields = or(
      ilike(recipes.name, searchTerm),
      ilike(recipes.notes, searchTerm)
    );
    const recipeCondition = and(
      baseBusinessCondition(recipes),
      recipeSearchFields
    );

    const foundRecipes = await db
      .select({
        id: recipes.id,
        title: recipes.name,
        description: recipes.productType
      })
      .from(recipes)
      .where(recipeCondition)
      .limit(limitPerType);

    results.push(
      ...foundRecipes.map((r: Select) => ({
        id: r.id,
        type: 'recipe' as const,
        title: r.title,
        description: r.description ? `Tipo: ${r.description}` : undefined,
        url: `/ajustes#recipe-${r.id}`
      }))
    );

    results.sort((a, b) => a.type.localeCompare(b.type));

    return NextResponse.json({ results });
  } catch (error) {
    console.error(
      `API Error during global search for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Search failed', error: (error as Error).message },
      { status: 500 }
    );
  }
}
