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
  uniqueIndex,
  foreignKey,
  primaryKey
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
  ProductType,
  UpdateOrderFormData,
  updateOrderFormSchema
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

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  businessId: integer('business_id'),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image')
});

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  ownerUserId: text('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const usersBusinessFk = foreignKey({
  columns: [users.businessId],
  foreignColumns: [businesses.id]
}).onDelete('cascade');

export const orders = pgTable('orders', {
  id: serial('order_id').primaryKey(),
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, {
      onDelete: 'set null',
      onUpdate: 'cascade'
    }),
  description: text('description').notNull(),
  orderDate: timestamp('order_date', { mode: 'date' }).notNull().defaultNow(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  deliveryDate: timestamp('delivery_date', { mode: 'date' }),
  orderStatus: orderStatusEnum('order_status')
    .notNull()
    .default(OrderStatus.pending),
  productType: productTypeEnum('product_type').notNull(),
  customizationDetails: text('customization_details'),
  quantity: integer('quantity').notNull(),
  sizeOrWeight: text('size_or_weight').notNull(),
  flavor: text('flavor').notNull(),
  allergyInformation: text('allergy_information'),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum('payment_status')
    .notNull()
    .default(PaymentStatus.Pendiente),
  paymentMethod: paymentMethodEnum('payment_method')
    .notNull()
    .default(PaymentMethod.Efectivo),
  depositAmount: numeric('deposit_amount', { precision: 10, scale: 2 }).default(
    '0.00'
  ),
  notes: text('notes'),
  orderHistory: jsonb('order_history').default('[]'),
  images: jsonb('images').default('[]')
});

export const businessSettings = pgTable('business_settings', {
  businessId: integer('business_id')
    .primaryKey()
    .references(() => businesses.id, { onDelete: 'cascade' }),
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
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
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
    businessRecipeNameIdx: uniqueIndex('business_recipe_name_idx').on(
      table.businessId,
      table.name
    )
  })
);

export const ingredientPrices = pgTable(
  'ingredient_prices',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(),
    pricePerUnit: numeric('price_per_unit', {
      precision: 10,
      scale: 4
    }).notNull(),
    supplier: varchar('supplier', { length: 255 }),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    businessIngredientNameIdx: uniqueIndex('business_ingredient_name_idx').on(
      table.businessId,
      table.name
    )
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
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
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

export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state')
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId]
    })
  })
);

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull()
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull()
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] })
  })
);

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.ownerUserId],
    references: [users.id]
  }),
  settings: one(businessSettings, {
    fields: [businesses.id],
    references: [businessSettings.businessId]
  }),
  customers: many(customers),
  orders: many(orders),
  recipes: many(recipes),
  ingredientPrices: many(ingredientPrices)
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  business: one(businesses, {
    fields: [users.businessId],
    references: [businesses.id]
  }),
  accounts: many(accounts),
  sessions: many(sessions)
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [customers.businessId],
    references: [businesses.id]
  }),
  orders: many(orders)
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  business: one(businesses, {
    fields: [orders.businessId],
    references: [businesses.id]
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id]
  })
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  business: one(businesses, {
    fields: [recipes.businessId],
    references: [businesses.id]
  }),
  recipeIngredients: many(recipeIngredients)
}));

export const ingredientPricesRelations = relations(
  ingredientPrices,
  ({ one, many }) => ({
    business: one(businesses, {
      fields: [ingredientPrices.businessId],
      references: [businesses.id]
    }),
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

export const businessSettingsRelations = relations(
  businessSettings,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessSettings.businessId],
      references: [businesses.id]
    })
  })
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

const schema = {
  businesses,
  users,
  accounts,
  sessions,
  verificationTokens,
  customers,
  orders,
  businessSettings,
  recipes,
  ingredientPrices,
  recipeIngredients,
  // Relations
  businessesRelations,
  usersRelations,
  customersRelations,
  ordersRelations,
  recipesRelations,
  ingredientPricesRelations,
  recipeIngredientsRelations,
  businessSettingsRelations,
  accountsRelations,
  sessionsRelations
};

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set.');
}

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export const db = drizzle(pool, { schema });

export type SelectBusiness = typeof businesses.$inferSelect;
export type SelectUser = typeof users.$inferSelect;
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

interface GetOrdersResult {
  orders: Order[];
  newOffset: number | null;
  totalOrders: number;
}

export async function getCustomers(
  businessId: number,
  search = '',
  offset = 0,
  limit = 5
): Promise<GetCustomersResult> {
  if (!businessId) throw new Error('Business ID is required');

  const baseCondition = eq(customers.businessId, businessId);
  let searchCondition: SQL | undefined;
  const trimmedSearch = search?.trim();

  if (trimmedSearch) {
    const searchTerm = `%${trimmedSearch}%`;
    searchCondition = or(
      ilike(customers.name, searchTerm),
      ilike(customers.email, searchTerm),
      ilike(customers.phone, searchTerm),
      ilike(customers.instagramHandle, searchTerm),
      ilike(customers.notes, searchTerm)
    );
  }

  const whereClause = searchCondition
    ? and(baseCondition, searchCondition)
    : baseCondition;

  let countQueryBuilder = db
    .select({ count: count() })
    .from(customers)
    .where(whereClause)
    .$dynamic();

  let totalCustomers = 0;
  try {
    const totalResult = await countQueryBuilder;
    totalCustomers = totalResult[0]?.count ?? 0;
  } catch (e) {
    console.error('Error counting customers:', e);
  }

  let dataQueryBuilder = db
    .select()
    .from(customers)
    .where(whereClause)
    .orderBy(asc(customers.name))
    .limit(limit)
    .offset(offset)
    .$dynamic();

  let results: SelectCustomer[] = [];
  try {
    results = await dataQueryBuilder;
  } catch (e) {
    console.error('Error fetching customers:', e);
    throw new Error('Failed to fetch customer data');
  }

  const newOffset = offset + limit < totalCustomers ? offset + limit : null;

  return {
    customers: results as Customer[],
    newOffset,
    totalCustomers
  };
}

export async function saveCustomer(
  businessId: number,
  customerInput: Omit<Customer, 'id' | 'registrationDate' | 'orders'>
): Promise<Customer> {
  if (!businessId) throw new Error('Business ID is required');

  const customerToSave = {
    ...customerInput,
    businessId: businessId,
    registrationDate: new Date()
  };
  try {
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

export async function updateCustomer(
  businessId: number,
  customerInput: Partial<
    Omit<Customer, 'id' | 'registrationDate' | 'orders' | 'businessId'>
  >,
  customerId: number
): Promise<void> {
  if (!businessId) throw new Error('Business ID is required');
  if (!customerId) throw new Error('Customer ID is required');

  const dataToSet = { ...customerInput };
  if (Object.keys(dataToSet).length === 0)
    throw new Error('No fields provided for update');

  try {
    const result = await db
      .update(customers)
      .set(dataToSet)
      .where(
        and(eq(customers.id, customerId), eq(customers.businessId, businessId))
      );
    if (result.rowCount === 0)
      throw new Error(`Customer not found or access denied.`);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw new Error('Failed to update customer');
  }
}

export async function deleteCustomerById(
  businessId: number,
  id: number
): Promise<void> {
  if (!businessId) throw new Error('Business ID is required');
  if (!id) throw new Error('Customer ID is required');
  try {
    const result = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.businessId, businessId)));
    if (result.rowCount === 0) {
      console.warn(
        `Attempted to delete non-existent or unauthorized customer: ID ${id}, Business ${businessId}`
      );
    }
  } catch (error) {
    console.error(
      `Error deleting customer ${id} for business ${businessId}:`,
      error
    );
    throw new Error('Failed to delete customer');
  }
}

export async function getOrders(
  businessId: number,
  search: string = '',
  offset: number = 0,
  limit: number = 5,
  status: string | null = null
): Promise<GetOrdersResult> {
  if (!businessId) throw new Error('Business ID is required');

  const baseBusinessCondition = eq(orders.businessId, businessId);

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

  const conditions: (SQL | undefined)[] = [baseBusinessCondition];
  if (statusCondition) conditions.push(statusCondition);
  if (searchCondition) conditions.push(searchCondition);

  const whereClause = and(
    ...(conditions.filter((c) => c !== undefined) as SQL[])
  );

  let countQueryBuilder = db
    .select({ count: count(orders.id) })
    .from(orders)
    .where(
      and(
        ...([baseBusinessCondition, statusCondition].filter(
          (c) => c !== undefined
        ) as SQL[])
      )
    )
    .$dynamic();

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

type SaveOrderInput = OrderFormData & {
  businessId: number;
  orderStatus: OrderStatus;
  orderHistory?: any[];
  images?: any[];
};

export async function saveOrder(orderInput: SaveOrderInput): Promise<Order> {
  if (!orderInput.businessId)
    throw new Error('Business ID is required to save an order');

  const orderToSave = {
    businessId: orderInput.businessId,
    customerId: orderInput.customerId,
    description: orderInput.description,
    orderDate: new Date(),
    amount: orderInput.amount.toString(),
    deliveryDate: orderInput.deliveryDate ? orderInput.deliveryDate : null,
    orderStatus: orderInput.orderStatus,
    productType: orderInput.productType,
    customizationDetails: orderInput.customizationDetails,
    quantity: orderInput.quantity,
    sizeOrWeight: orderInput.sizeOrWeight,
    flavor: orderInput.flavor,
    allergyInformation: orderInput.allergyInformation,
    totalPrice: orderInput.totalPrice.toString(),
    paymentStatus: orderInput.paymentStatus,
    paymentMethod: orderInput.paymentMethod,
    depositAmount: (orderInput.depositAmount ?? 0).toString(),
    notes: orderInput.notes,
    orderHistory: orderInput.orderHistory ?? [],
    images: orderInput.images ?? []
  };

  try {
    const result = await db
      .insert(orders)
      .values(orderToSave)
      .returning({ insertedId: orders.id });
    if (!result || result.length === 0)
      throw new Error('Insert failed, no order ID returned.');
    const newOrderId = result[0].insertedId;

    const newOrderWithCustomer = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, newOrderId),
        eq(orders.businessId, orderInput.businessId)
      ),
      with: { customer: true }
    });
    if (!newOrderWithCustomer)
      throw new Error(
        'Failed to fetch newly created order with customer details.'
      );

    return newOrderWithCustomer as Order;
  } catch (error) {
    console.error('Error saving order:', error);
    throw new Error('Failed to save order');
  }
}

export async function updateOrder(
  businessId: number,
  orderInput: UpdateOrderFormData,
  orderId: number
): Promise<Order> {
  if (!businessId) throw new Error('Business ID is required');
  if (!orderId) throw new Error('Order ID is required');

  const validationResult = updateOrderFormSchema.safeParse(orderInput);
  if (!validationResult.success) {
    console.error('Validation failed:', validationResult.error.format());
    throw new Error(
      `Invalid input data for updating order: ${JSON.stringify(validationResult.error.format())}`
    );
  }
  const validatedData = validationResult.data;
  if (Object.keys(validatedData).length === 0)
    throw new Error('No valid fields provided for update');

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
      .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId)))
      .returning({ updatedId: orders.id });

    if (!updatedResult || updatedResult.length === 0) {
      throw new Error(`Order with ID ${orderId} not found or not authorized.`);
    }

    const updatedOrderWithCustomer = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.businessId, businessId)),
      with: { customer: true }
    });
    if (!updatedOrderWithCustomer)
      throw new Error('Failed to fetch updated order with customer details.');

    return updatedOrderWithCustomer as Order;
  } catch (error) {
    console.error('Error updating order in DB:', error);
    throw new Error('Failed to update order in database');
  }
}

export async function deleteOrderById(
  businessId: number,
  id: number
): Promise<void> {
  if (!businessId) throw new Error('Business ID is required');
  if (!id) throw new Error('Order ID is required');
  try {
    const result = await db
      .delete(orders)
      .where(and(eq(orders.id, id), eq(orders.businessId, businessId)));
    if (result.rowCount === 0) {
      console.warn(
        `Attempted to delete non-existent or unauthorized order: ID ${id}, Business ${businessId}`
      );
    }
  } catch (error) {
    console.error(
      `Error deleting order ${id} for business ${businessId}:`,
      error
    );
    throw new Error('Failed to delete order');
  }
}

export async function saveImageUrlsForOrder(
  businessId: number,
  orderId: number,
  imageUrls: string[]
): Promise<void> {
  if (!businessId) throw new Error('Business ID is required');
  if (!orderId) throw new Error('Order ID is required');
  try {
    const result = await db
      .update(orders)
      .set({ images: imageUrls })
      .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId)));

    if (result.rowCount === 0) {
      throw new Error('Order not found or not authorized.');
    }
    console.log(`Successfully saved image URLs for order with ID ${orderId}`);
  } catch (error) {
    console.error('Error saving image URLs for order:', error);
    throw new Error('Failed to save image URLs for order');
  }
}
