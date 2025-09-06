import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/subscription_box';
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export const { users, products, subscriptions, fulfillmentCenters, inventory, orders, subscriptionPlans } = schema;

export type InsertUser = typeof schema.users.$inferInsert;
export type InsertProduct = typeof schema.products.$inferInsert;
export type InsertFulfillmentCenter = typeof schema.fulfillmentCenters.$inferInsert;
export type InsertSubscription = typeof schema.subscriptions.$inferInsert;