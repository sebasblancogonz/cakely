import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, customers, ingredientPrices } from '@/lib/db';
import { ilike, or, eq } from 'drizzle-orm';

interface SearchResult {
  id: number;
  type: 'order' | 'customer' | 'ingredient';
  title: string;
  description?: string;
  url: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const searchTerm = `%${query}%`;
  const results: SearchResult[] = [];
  const limitPerType = 10;

  try {
    const orderCondition = or(
      ilike(orders.description, searchTerm),
      ilike(orders.notes, searchTerm),
      ilike(orders.flavor, searchTerm),
      ilike(orders.customizationDetails, searchTerm),
      ilike(orders.sizeOrWeight, searchTerm)
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
      ...foundOrders.map((o) => ({
        id: o.id,
        type: 'order' as const,
        title: o.title || `Pedido #${o.id}`,
        description: o.customerName || undefined,
        url: `/pedidos#order-${o.id}`
      }))
    );

    const customerCondition = or(
      ilike(customers.name, searchTerm),
      ilike(customers.email, searchTerm),
      ilike(customers.phone, searchTerm),
      ilike(customers.instagramHandle, searchTerm),
      ilike(customers.notes, searchTerm)
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
      ...foundCustomers.map((c) => ({
        id: c.id,
        type: 'customer' as const,
        title: c.title,
        description: c.description || undefined,
        url: `/clientes#customer-${c.id}`
      }))
    );

    const ingredientCondition = or(
      ilike(ingredientPrices.name, searchTerm),
      ilike(ingredientPrices.supplier, searchTerm)
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
      ...foundIngredients.map((i) => ({
        id: i.id,
        type: 'ingredient' as const,
        title: i.title,
        description: i.description ? `Unidad: ${i.description}` : undefined,
        url: `/ajustes#ingredient-${i.id}`
      }))
    );

    results.sort((a, b) => a.type.localeCompare(b.type));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('API Error during global search:', error);
    return NextResponse.json(
      { message: 'Search failed', error: (error as Error).message },
      { status: 500 }
    );
  }
}
