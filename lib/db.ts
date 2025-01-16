import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  serial,
  jsonb
} from 'drizzle-orm/pg-core';
import { count, eq, ilike } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { Order, ProductType } from '@types';

export const db = drizzle(neon(process.env.POSTGRES_URL!));

export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);
export const orderStatusEnum = pgEnum('order_status', [
  'Pendiente',
  'En Preparación',
  'Listo',
  'Entregado'
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'Pendiente',
  'Pagado',
  'Cancelado'
]);
export const paymentMethodEnum = pgEnum('payment_method', [
  'Efectivo',
  'Tarjeta',
  'Transferencia Bancaria',
  'Bizum'
]);
export const productTypeEnum = pgEnum(
  'product_type',
  Object.values(ProductType) as [string]
);

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  name: text('name').notNull(),
  status: statusEnum('status').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull(),
  availableAt: timestamp('available_at').notNull()
});

export const orders = pgTable('orders', {
  id: serial('order_id').primaryKey(),
  description: text('description').notNull(),
  customerName: text('customer_name').notNull(),
  customerContact: text('customer_contact').notNull(),
  orderDate: timestamp('order_date').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  deliveryDate: timestamp('delivery_date'),
  orderStatus: orderStatusEnum('order_status').notNull(),
  productType: productTypeEnum('product_type').notNull(),
  customizationDetails: text('customization_details'),
  quantity: integer('quantity').notNull(),
  sizeOrWeight: text('size_or_weight').notNull(),
  flavor: text('flavor').notNull(),
  allergyInformation: text('allergy_information'),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  notes: text('notes'),
  orderHistory: jsonb('order_history')
});

export type SelectProduct = typeof products.$inferSelect;
export type SelectOrder = typeof orders.$inferSelect;

export const insertProductSchema = createInsertSchema(products);

export async function getProducts(
  search: string,
  offset: number
): Promise<{
  products: SelectProduct[];
  newOffset: number | null;
  totalProducts: number;
}> {
  // Always search the full table, not per page
  if (search) {
    return {
      products: await db
        .select()
        .from(products)
        .where(ilike(products.name, `%${search}%`))
        .limit(1000),
      newOffset: null,
      totalProducts: 0
    };
  }

  if (offset === null) {
    return { products: [], newOffset: null, totalProducts: 0 };
  }

  let totalProducts = await db.select({ count: count() }).from(products);
  let moreProducts = await db.select().from(products).limit(5).offset(offset);
  let newOffset = moreProducts.length >= 5 ? offset + 5 : null;

  return {
    products: moreProducts,
    newOffset,
    totalProducts: totalProducts[0].count
  };
}

function mapOrders(orderData: any[]): Order[] {
  return orderData.map((order) => ({
    ...order,
    orderDate: new Date(order.orderDate),
    amount: Number(order.amount)
  }));
}

export async function getOrders(
  search: string,
  offset: number
): Promise<{
  orders: Order[];
  newOffset: number | null;
  totalOrders: number;
}> {
  if (search) {
    const result = await db.select().from(orders).limit(1000);

    return { orders: mapOrders(result), newOffset: null, totalOrders: 0 };
  }

  if (offset === null) {
    return { orders: [], newOffset: null, totalOrders: 0 };
  }

  const totalOrders = (await db.select({ count: count() }).from(orders))[0]
    .count;
  const newOrdersFromOffset = await db
    .select()
    .from(orders)
    .limit(5)
    .offset(offset);
  const mappedOrders = mapOrders(newOrdersFromOffset);
  const newOffset = mappedOrders.length >= 5 ? offset + 5 : null;

  return { orders: mappedOrders, newOffset, totalOrders };
}

export async function deleteProductById(id: number) {
  await db.delete(products).where(eq(products.id, id));
}

export async function deleteOrderById(id: number) {
  await db.delete(orders).where(eq(orders.id, id));
}

export async function saveOrder(order: Order): Promise<number> {

  const deliveryDate = order.deliveryDate instanceof Date 
    ? order.deliveryDate 
    : new Date(order.deliveryDate);

  const orderDate = order.orderDate instanceof Date 
    ? order.orderDate 
    : new Date(order.orderDate);

  const orderToSave: typeof orders.$inferInsert = {
    description: order.description,
    customerName: order.customerName,
    customerContact: order.customerContact,
    orderDate: orderDate,
    amount:  order.amount.toString(),
    deliveryDate: deliveryDate,
    orderStatus: order.orderStatus,
    productType: order.productType,
    customizationDetails: order.customizationDetails,
    quantity: order.quantity,
    sizeOrWeight: order.sizeOrWeight,
    flavor: order.flavor,
    allergyInformation: order.allergyInformation,
    totalPrice: order.totalPrice.toString(),
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    notes: order.notes,
    orderHistory: order.orderHistory
  };

  try {
    // Inserta el pedido y devuelve el ID
    console.log('Inserting order:', orderToSave);
    const result = await db
      .insert(orders)
      .values(orderToSave)
      .returning({ id: orders.id });
    return result[0]?.id ?? 0; 
  } catch (error) {
    console.error('Error saving order:', error);
    throw new Error('Failed to save order');
  }
}
