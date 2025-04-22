import 'server-only';

import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
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
import { and, count, desc, eq, ilike, or, sql, SQL } from 'drizzle-orm';
import {
  Customer,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductType
} from '@types';

export const db = drizzle(neon(process.env.POSTGRES_URL!));

export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);

export const orderStatusEnum = pgEnum(
  'order_status',
  Object.values(OrderStatus) as [string]
);

export const paymentStatusEnum = pgEnum(
  'payment_status',
  Object.values(PaymentStatus) as [string]
);

export const paymentMethodEnum = pgEnum(
  'payment_method',
  Object.values(PaymentMethod) as [string]
);

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
  orderHistory: jsonb('order_history'),
  images: jsonb('images')
});

const UpdateOrderSchema = z
  .object({
    description: z.string().optional(),
    customerName: z.string().min(1).optional(),
    customerContact: z.string().optional(),
    orderDate: z.coerce.date().optional(),
    amount: z.number().positive().optional(),
    deliveryDate: z.coerce.date().optional(),
    orderStatus: z.nativeEnum(OrderStatus).optional(),
    productType: z.nativeEnum(ProductType).optional(),
    customizationDetails: z.string().optional(),
    quantity: z.coerce.number().int().positive().optional(),
    sizeOrWeight: z.string().optional(),
    flavor: z.string().optional(),
    allergyInformation: z.string().optional(),
    totalPrice: z.coerce.number().positive().optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    notes: z.string().optional()
  })
  .partial();

const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  registrationDate: timestamp('registration_date').notNull(),
  notes: text('notes')
});

export type SelectProduct = typeof products.$inferSelect;
export type SelectOrder = typeof orders.$inferSelect;
export type SelectCustomer = typeof customers.$inferSelect;

export async function getProducts(
  search: string,
  offset: number
): Promise<{
  products: SelectProduct[];
  newOffset: number | null;
  totalProducts: number;
}> {
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
    amount: Number(order.amount).toFixed(2)
  }));
}

export async function getCustomers(
  search: string,
  offset: number
): Promise<{
  customers: SelectCustomer[];
  newOffset: number | null;
  totalCustomers: number;
}> {
  if (search) {
    return {
      customers: await db
        .select()
        .from(customers)
        .where(ilike(customers.name, `%${search}%`))
        .limit(1000),
      newOffset: null,
      totalCustomers: 0
    };
  }

  if (offset === null) {
    return { customers: [], newOffset: null, totalCustomers: 0 };
  }

  let totalCustomers = await db.select({ count: count() }).from(customers);
  let moreCustomers = await db.select().from(customers).limit(5).offset(offset);
  let newOffset = moreCustomers.length >= 5 ? offset + 5 : null;

  return {
    customers: moreCustomers,
    newOffset,
    totalCustomers: totalCustomers[0].count
  };
}

interface GetOrdersParams {
  search?: string | null;
  offset?: number;
  limit?: number;
  status?: string | null;
}

interface GetOrdersResult {
  orders: Order[];
  newOffset: number | null;
  totalOrders: number;
}

export async function getOrders(
  search: string = '',
  offset: number = 0,
  limit: number = 5,
  status: string | null = null
): Promise<GetOrdersResult> {
  let statusCondition: SQL | undefined;
  const statusKey = status?.trim().toLowerCase();

  if (statusKey && statusKey !== 'all') {
    if (statusKey in OrderStatus) {
      const statusValue = OrderStatus[statusKey as keyof typeof OrderStatus];
      statusCondition = eq(orders.orderStatus, statusValue);
    } else {
      console.warn(
        `Invalid status key received: ${statusKey}. No status filter applied.`
      );
    }
  }

  let searchCondition: SQL | undefined;
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    const searchTerm = `%${trimmedSearch}%`;
    searchCondition = or(
      ilike(orders.customerName, searchTerm),
      ilike(orders.customerContact, searchTerm),
      ilike(orders.description, searchTerm),
      sql`${orders.productType}::text ilike ${searchTerm}`,
      ilike(orders.flavor, searchTerm),
      ilike(orders.notes, searchTerm),
      ilike(orders.allergyInformation, searchTerm)
    );
  }

  let whereCondition: SQL | undefined;
  if (statusCondition && searchCondition) {
    whereCondition = and(statusCondition, searchCondition);
  } else {
    whereCondition = statusCondition ?? searchCondition;
  }

  let countQueryBuilder = db.select({ count: count() }).from(orders).$dynamic();
  if (whereCondition) {
    countQueryBuilder = countQueryBuilder.where(whereCondition);
  }

  const totalResult = await countQueryBuilder;
  const totalOrders = totalResult[0]?.count ?? 0;

  let dataQueryBuilder = db.select().from(orders).$dynamic();
  if (whereCondition) {
    dataQueryBuilder = dataQueryBuilder.where(whereCondition);
  }

  dataQueryBuilder = dataQueryBuilder.orderBy(desc(orders.orderDate));
  dataQueryBuilder = dataQueryBuilder.limit(limit).offset(offset);

  const results = await dataQueryBuilder;
  const mappedOrders = mapOrders(results);
  const newOffset = offset + limit < totalOrders ? offset + limit : null;

  return {
    orders: mappedOrders,
    newOffset,
    totalOrders
  };
}

export async function deleteProductById(id: number) {
  await db.delete(products).where(eq(products.id, id));
}

export async function deleteCustomerById(id: number) {
  await db.delete(customers).where(eq(customers.id, id));
}

export async function deleteOrderById(id: number) {
  await db.delete(orders).where(eq(orders.id, id));
}

export async function saveCustomer(
  customer: Customer
): Promise<typeof customers.$inferInsert> {
  const customerToSave: typeof customers.$inferInsert = {
    ...customer
  };

  try {
    console.log('Inserting customer:', customerToSave);
    const result = await db
      .insert(customers)
      .values(customerToSave)
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error saving customer:', error);
    throw new Error('Failed to save customer');
  }
}

export async function saveOrder(
  order: Order
): Promise<typeof orders.$inferInsert> {
  const deliveryDate =
    order.deliveryDate instanceof Date
      ? order.deliveryDate
      : new Date(order.deliveryDate);

  const orderDate =
    order.orderDate instanceof Date
      ? order.orderDate
      : new Date(order.orderDate);

  const orderToSave: typeof orders.$inferInsert = {
    description: order.description,
    customerName: order.customerName,
    customerContact: order.customerContact,
    orderDate: orderDate,
    amount: order.amount.toString(),
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
    orderHistory: order.orderHistory,
    images: order.images
  };

  try {
    console.log('Inserting order:', orderToSave);
    const result = await db.insert(orders).values(orderToSave).returning();
    return result[0];
  } catch (error) {
    console.error('Error saving order:', error);
    throw new Error('Failed to save order');
  }
}

export async function updateOrder(orderInput: Partial<Order>, orderId: number) {
  const validationResult = UpdateOrderSchema.safeParse(orderInput);
  if (!validationResult.success) {
    console.error('Validation failed:', validationResult.error.errors);
    throw new Error('Invalid input data for updating order');
  }
  const validatedData = validationResult.data;

  const dataToSet: Record<string, any> = { ...validatedData };
  if (dataToSet.amount !== undefined) {
    dataToSet.amount = dataToSet.amount;
  }
  if (dataToSet.totalPrice !== undefined) {
    dataToSet.totalPrice = dataToSet.totalPrice;
  }

  delete dataToSet.id;
  delete dataToSet.orderHistory;
  delete dataToSet.images;

  if (Object.keys(dataToSet).length === 0) {
    console.warn(
      'Update attempt with no valid fields to update for order:',
      orderId
    );
    throw new Error('No valid fields provided for update');
  }

  try {
    const updatedResult = await db
      .update(orders)
      .set(dataToSet)
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedResult || updatedResult.length === 0) {
      throw new Error(`Order with ID ${orderId} not found.`);
    }
    return updatedResult[0];
  } catch (error) {
    console.error('Error updating order in DB:', error);
    throw new Error('Failed to update order in database');
  }
}

export async function saveImageUrlsForOrder(
  orderId: number,
  imageUrls: string[]
) {
  try {
    const result = await db
      .update(orders)
      .set({ images: imageUrls })
      .where(eq(orders.id, orderId));

    if (result.rowCount === 0) {
      console.error(`Order with ID ${orderId} not found.`);
      throw new Error('Order not found');
    }

    console.log(`Successfully saved image URLs for order with ID ${orderId}`);
  } catch (error) {
    console.error('Error saving image URLs for order:', error);
    throw new Error('Failed to save image URLs for order');
  }
}

export async function updateCustomer(customer: Customer, customerId: number) {
  const registrationDate =
    customer.registrationDate instanceof Date
      ? customer.registrationDate
      : new Date(customer.registrationDate);

  const customerToUpdate = {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    registrationDate: registrationDate,
    notes: customer.notes
  };

  try {
    await db
      .update(customers)
      .set(customerToUpdate)
      .where(eq(customers.id, customerId));
  } catch (error) {
    console.error('Error updating customer:', error);
    throw new Error('Failed to update customer');
  }
}
