import { pgTable, uuid, serial, text, timestamp, integer, boolean, date, json, varchar, unique, jsonb} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  passwordHash: text('password_hash'),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull(),
  price: integer('price').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  planId: integer('plan_id').notNull().references(() => subscriptionPlans.id),
  startDate: date('start_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  nextBillingDate: date('next_billing_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const fulfillmentCenters = pgTable('fulfillment_centers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  latitude: varchar('latitude', { length: 20 }),
  longitude: varchar('longitude', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  fulfillmentCenterId: integer('fulfillment_center_id').notNull().references(() => fulfillmentCenters.id),
  quantity: integer('quantity').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Ensure we don't have duplicate product+center combinations
    unqProductCenter: unique('unq_product_center').on(table.productId, table.fulfillmentCenterId),
  };
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').notNull().references(() => subscriptions.id),
  productId: integer('product_id').notNull().references(() => products.id),
  fulfillmentCenterId: integer('fulfillment_center_id').references(() => fulfillmentCenters.id),
  status: varchar('status', { length: 20 }).notNull().default('processed'),
  orderDate: date('order_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Optional: Define relations if you're using Drizzle's relational queries
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  orders: many(orders),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  fulfillmentCenter: one(fulfillmentCenters, {
    fields: [inventory.fulfillmentCenterId],
    references: [fulfillmentCenters.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [orders.subscriptionId],
    references: [subscriptions.id],
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
  fulfillmentCenter: one(fulfillmentCenters, {
    fields: [orders.fulfillmentCenterId],
    references: [fulfillmentCenters.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  passwordHash: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).pick({
  name: true,
  description: true,
  billingCycle: true,
  price: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  planId: true,
  startDate: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  price: true,
  sku: true,
});

export const insertFulfillmentCenterSchema = createInsertSchema(fulfillmentCenters).pick({
  name: true,
  address: true,
  latitude: true,
  longitude: true,
});

export const insertInventorySchema = createInsertSchema(inventory).pick({
  productId: true,
  fulfillmentCenterId: true,
  quantity: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  subscriptionId: true,
  productId: true,
  fulfillmentCenterId: true,
  status: true,
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: varchar('action', { length: 255 }).notNull(),
  entity: varchar('entity', { length: 255 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type FulfillmentCenter = typeof fulfillmentCenters.$inferSelect;
export type InsertFulfillmentCenter = z.infer<typeof insertFulfillmentCenterSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;