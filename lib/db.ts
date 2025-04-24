import { Pool } from '@neondatabase/serverless';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/neon-serverless';
import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  serial,
  jsonb,
  varchar,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  relations,
  SQL
} from 'drizzle-orm';
import {
  OrderFormData,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductType
} from '@types';

export const orderStatusEnum = pgEnum(
  'order_status',
  Object.values(OrderStatus) as [string, ...string[]]
);

export const paymentStatusEnum = pgEnum(
  'payment_status',
  Object.values(PaymentStatus) as [string, ...string[]]
);

export const paymentMethodEnum = pgEnum(
  'payment_method',
  Object.values(PaymentMethod) as [string, ...string[]]
);

export const productTypeEnum = pgEnum(
  'product_type',
  Object.values(ProductType) as [string, ...string[]]
);

export const orders = pgTable('orders', {
  id: serial('order_id').primaryKey(),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, {
      onDelete: 'set null',
      onUpdate: 'cascade'
    }),
  description: text('description').notNull(),
  orderDate: timestamp('order_date', {
    withTimezone: false,
    mode: 'date'
  }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  deliveryDate: timestamp('delivery_date', {
    withTimezone: false,
    mode: 'date'
  }),
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
  depositAmount: numeric('deposit_amount', { precision: 10, scale: 2 }).default(
    '0.00'
  ),
  notes: text('notes'),
  orderHistory: jsonb('order_history').default('[]'),
  images: jsonb('images').default('[]')
});

export const businessSettings = pgTable('business_settings', {
  id: serial('id').primaryKey(),
  laborRateHourly: numeric('labor_rate_hourly', { precision: 10, scale: 2 })
    .notNull()
    .default('15.00'),
  profitMarginPercent: numeric('profit_margin_percent', {
    precision: 5,
    scale: 2
  })
    .notNull()
    .default('30.00'),
  ivaPercent: numeric('iva_percent', { precision: 5, scale: 2 })
    .notNull()
    .default('10.00'),
  rentMonthly: numeric('rent_monthly', { precision: 10, scale: 2 }).default(
    '0.00'
  ),
  electricityPriceKwh: numeric('electricity_price_kwh', {
    precision: 10,
    scale: 4
  }).default('0.1500'),
  gasPriceUnit: numeric('gas_price_unit', { precision: 10, scale: 4 }).default(
    '0.0600'
  ),
  waterPriceUnit: numeric('water_price_unit', {
    precision: 10,
    scale: 4
  }).default('2.0000'),
  otherMonthlyOverhead: numeric('other_monthly_overhead', {
    precision: 10,
    scale: 2
  }).default('50.00'),
  overheadMarkupPercent: numeric('overhead_markup_percent', {
    precision: 5,
    scale: 2
  }).default('20.00'),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const recipes = pgTable(
  'recipes',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    productType: varchar('product_type', { length: 100 }).notNull(),
    baseLaborHours: numeric('base_labor_hours', {
      precision: 10,
      scale: 3
    }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    recipeNameIdx: uniqueIndex('recipe_name_idx').on(table.name)
  })
);

export const ingredientPrices = pgTable(
  'ingredient_prices',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    unit: varchar('unit', { length: 50 }).notNull(),
    pricePerUnit: numeric('price_per_unit', {
      precision: 10,
      scale: 4
    }).notNull(),
    supplier: varchar('supplier', { length: 255 }),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    nameIdx: uniqueIndex('ingredient_name_idx').on(table.name)
  })
);

export const recipeIngredients = pgTable('recipe_ingredients', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  ingredientId: integer('ingredient_id')
    .notNull()
    .references(() => ingredientPrices.id, { onDelete: 'restrict' }),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull()
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  registrationDate: timestamp('registration_date', {
    withTimezone: false,
    mode: 'date'
  })
    .notNull()
    .defaultNow(),
  instagramHandle: varchar('instagram_handle', { length: 100 }),
  notes: text('notes')
});

export const recipesRelations = relations(recipes, ({ many }) => ({
  recipeIngredients: many(recipeIngredients)
}));

export const ingredientPricesRelations = relations(
  ingredientPrices,
  ({ many }) => ({
    recipeIngredients: many(recipeIngredients)
  })
);

export const recipeIngredientsRelations = relations(
  recipeIngredients,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeIngredients.recipeId],
      references: [recipes.id]
    }),
    ingredient: one(ingredientPrices, {
      fields: [recipeIngredients.ingredientId],
      references: [ingredientPrices.id]
    })
  })
);

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders)
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id]
  })
}));

const schema = {
  orders,
  businessSettings,
  recipes,
  ingredientPrices,
  recipeIngredients,
  customers,
  customersRelations,
  ordersRelations,
  recipesRelations,
  ingredientPricesRelations,
  recipeIngredientsRelations
};

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set.');
}

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export const db = drizzle(pool, { schema });

export type SelectOrder = typeof orders.$inferSelect;
export type SelectCustomer = typeof customers.$inferSelect;
export type Setting = typeof businessSettings.$inferSelect;
export type NewSetting = typeof businessSettings.$inferInsert;
export type IngredientPrice = typeof ingredientPrices.$inferSelect;
export type NewIngredientPrice = typeof ingredientPrices.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredients.$inferInsert;

export type Order = SelectOrder & {
  customer?: SelectCustomer;
};
export type Customer = SelectCustomer & {
  orders?: SelectOrder[];
};

const UpdateOrderSchema = z
  .object({
    customerId: z.coerce.number().int().positive().optional(),
    description: z.string().optional(),
    orderDate: z.coerce.date().optional(),
    amount: z.coerce.number().positive().optional(),
    deliveryDate: z.coerce.date().optional().nullable(),
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
    depositAmount: z.coerce.number().positive().optional(),
    notes: z.string().optional()
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo para actualizar'
  });

interface GetCustomersResult {
  customers: Customer[];
  newOffset: number | null;
  totalCustomers: number;
}

export async function getCustomers(
  search = '',
  offset = 0,
  limit = 5
): Promise<GetCustomersResult> {
  let searchCondition: SQL | undefined;
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    const searchTerm = `%${trimmedSearch}%`;
    searchCondition = or(
      ilike(customers.name, searchTerm),
      ilike(customers.email, searchTerm),
      ilike(customers.phone, searchTerm),
      ilike(customers.notes, searchTerm)
    );
  }

  let countQueryBuilder = db
    .select({ count: count() })
    .from(customers)
    .$dynamic();
  if (searchCondition) {
    countQueryBuilder = countQueryBuilder.where(searchCondition);
  }
  const totalResult = await countQueryBuilder;
  const totalCustomers = totalResult[0]?.count ?? 0;

  let dataQueryBuilder = db.select().from(customers).$dynamic();
  if (searchCondition) {
    dataQueryBuilder = dataQueryBuilder.where(searchCondition);
  }
  dataQueryBuilder = dataQueryBuilder.orderBy(asc(customers.name));
  dataQueryBuilder = dataQueryBuilder.limit(limit).offset(offset);
  const results = await dataQueryBuilder;

  const fetchedCustomers: Customer[] = results as Customer[];
  const newOffset = offset + limit < totalCustomers ? offset + limit : null;

  return {
    customers: fetchedCustomers,
    newOffset,
    totalCustomers
  };
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
      ilike(orders.description, searchTerm),
      ilike(orders.flavor, searchTerm),
      ilike(orders.notes, searchTerm),
      ilike(orders.customizationDetails, searchTerm),
      ilike(customers.name, searchTerm),
      ilike(customers.email, searchTerm),
      ilike(customers.phone, searchTerm),
      ilike(customers.instagramHandle, searchTerm)
    );
  }

  const conditions: (SQL | undefined)[] = [];
  if (statusCondition) conditions.push(statusCondition);
  if (searchCondition) conditions.push(searchCondition);

  const whereClause =
    conditions.length > 0
      ? and(...(conditions.filter((c) => c !== undefined) as SQL[]))
      : undefined;

  let countQueryBuilder = db
    .select({ count: count(orders.id) })
    .from(orders)
    .$dynamic();
  const orderOnlyConditions = [statusCondition].filter(
    (c) => c !== undefined
  ) as SQL[];
  if (orderOnlyConditions.length > 0) {
    countQueryBuilder = countQueryBuilder.where(and(...orderOnlyConditions));
  }

  let totalOrders = 0;
  try {
    const totalResult = await countQueryBuilder;
    totalOrders = totalResult[0]?.count ?? 0;
  } catch (e) {
    console.error('Error executing count query:', e);
  }

  let results: SelectOrder[] = [];
  try {
    results = await db.query.orders.findMany({
      orderBy: [desc(orders.orderDate)],
      limit: limit,
      offset: offset,
      where: whereClause,
      with: {
        customer: true
      }
    });
  } catch (e) {
    console.error('Error executing data query:', e);
    throw new Error('Failed to fetch order data');
  }

  const mappedOrders: Order[] = results.map((order) => ({
    ...order,
    amount: order.amount,
    totalPrice: order.totalPrice
  }));

  const newOffset = offset + limit < totalOrders ? offset + limit : null;

  return {
    orders: mappedOrders,
    newOffset,
    totalOrders
  };
}

export async function deleteCustomerById(id: number): Promise<void> {
  await db.delete(customers).where(eq(customers.id, id));
}

export async function deleteOrderById(id: number): Promise<void> {
  await db.delete(orders).where(eq(orders.id, id));
}

export async function saveCustomer(
  customer: Omit<Customer, 'id' | 'registrationDate' | 'orders'>
): Promise<Customer> {
  const customerToSave = {
    ...customer,
    registrationDate: new Date()
  };
  try {
    console.log('Inserting customer:', customerToSave);
    const result = await db
      .insert(customers)
      .values(customerToSave)
      .returning();
    return result[0] as Customer;
  } catch (error) {
    console.error('Error saving customer:', error);
    throw new Error('Failed to save customer');
  }
}

type SaveOrderInput = Omit<
  Order,
  'id' | 'customer' | 'orderHistory' | 'images' | 'createdAt' | 'updatedAt'
> & {
  customerId: number;
  orderHistory?: any[];
  images?: any[];
};

export async function saveOrder(orderInput: SaveOrderInput): Promise<Order> {
  const orderToSave = {
    customerId: orderInput.customerId,
    description: orderInput.description,
    orderDate: new Date(),
    amount: orderInput.amount,
    deliveryDate: orderInput.deliveryDate
      ? orderInput.deliveryDate instanceof Date
        ? orderInput.deliveryDate
        : new Date(orderInput.deliveryDate)
      : null,
    orderStatus: orderInput.orderStatus,
    productType: orderInput.productType,
    customizationDetails: orderInput.customizationDetails,
    quantity: orderInput.quantity,
    sizeOrWeight: orderInput.sizeOrWeight,
    flavor: orderInput.flavor,
    allergyInformation: orderInput.allergyInformation,
    totalPrice: orderInput.totalPrice,
    paymentStatus: orderInput.paymentStatus,
    paymentMethod: orderInput.paymentMethod,
    depositAmount: (orderInput.depositAmount ?? 0).toString(),
    notes: orderInput.notes,
    orderHistory: orderInput.orderHistory ?? [],
    images: orderInput.images ?? []
  };

  try {
    console.log('Inserting order:', orderToSave);
    const result = await db
      .insert(orders)
      .values(orderToSave)
      .returning({ insertedId: orders.id });

    if (!result || result.length === 0) {
      throw new Error('Insert failed, no order ID returned.');
    }
    const newOrderId = result[0].insertedId;

    const newOrderWithCustomer = await db.query.orders.findFirst({
      where: eq(orders.id, newOrderId),
      with: {
        customer: true
      }
    });

    if (!newOrderWithCustomer) {
      throw new Error(
        'Failed to fetch newly created order with customer details.'
      );
    }

    return newOrderWithCustomer as Order;
  } catch (error) {
    console.error('Error saving order:', error);
    throw new Error('Failed to save order');
  }
}

export async function updateOrder(
  orderInput: Partial<OrderFormData>,
  orderId: number
): Promise<Order> {
  const validationResult = UpdateOrderSchema.safeParse(orderInput);
  if (!validationResult.success) {
    console.error('Validation failed:', validationResult.error.format());
    throw new Error(
      `Invalid input data for updating order: ${JSON.stringify(validationResult.error.format())}`
    );
  }
  const validatedData = validationResult.data;

  if (Object.keys(validatedData).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  const dataToSet: Record<string, any> = {};
  for (const [key, value] of Object.entries(validatedData)) {
    if (value !== undefined) {
      if (key === 'amount' || key === 'totalPrice' || key === 'depositAmount') {
        dataToSet[key] = (value as number).toString();
      } else if (key === 'deliveryDate') {
        dataToSet[key] =
          value === null
            ? null
            : value instanceof Date
              ? value
              : new Date(value as string | number | Date);
      } else {
        dataToSet[key] = value;
      }
    }
  }
  dataToSet.updatedAt = new Date();

  try {
    const updatedResult = await db
      .update(orders)
      .set(dataToSet)
      .where(eq(orders.id, orderId))
      .returning({ updatedId: orders.id });

    if (!updatedResult || updatedResult.length === 0) {
      throw new Error(`Order with ID ${orderId} not found.`);
    }

    const updatedOrderWithCustomer = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        customer: true
      }
    });

    if (!updatedOrderWithCustomer) {
      throw new Error('Failed to fetch updated order with customer details.');
    }

    return updatedOrderWithCustomer as Order;
  } catch (error) {
    console.error('Error updating order in DB:', error);
    throw new Error('Failed to update order in database');
  }
}

export async function saveImageUrlsForOrder(
  orderId: number,
  imageUrls: string[]
): Promise<void> {
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

export async function updateCustomer(
  customerInput: Partial<Omit<Customer, 'id' | 'registrationDate' | 'orders'>>,
  customerId: number
): Promise<void> {
  const dataToSet = { ...customerInput };
  if (Object.keys(dataToSet).length === 0)
    throw new Error('No fields provided');
  const result = await db
    .update(customers)
    .set(dataToSet)
    .where(eq(customers.id, customerId));
  if (result.rowCount === 0) throw new Error(`Customer not found.`);
}
