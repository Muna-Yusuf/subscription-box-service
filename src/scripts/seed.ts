import { db } from '../db/connection';
import { db, users, subscriptionPlans, products, fulfillmentCenters, inventory, subscriptions } from '../db/connection.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // 1. Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await db
      .insert(users)
      .values({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: hashedPassword,
        role: 'admin',
      })
      .onConflictDoNothing()
      .returning();

    console.log('Admin user created:', adminUser?.email);

    // 2. Create subscription plans
    const plans = await db
      .insert(subscriptionPlans)
      .values([
        {
          name: 'Monthly Box',
          description: 'Our standard monthly subscription',
          billingCycle: 'monthly',
          price: 2999, // $29.99
        },
        {
          name: 'Quarterly Box',
          description: 'Save with our quarterly plan',
          billingCycle: 'quarterly',
          price: 7999, // $79.99
        },
        {
          name: 'Annual Box',
          description: 'Best value - annual subscription',
          billingCycle: 'annually',
          price: 29999, // $299.99
        },
      ])
      .onConflictDoNothing()
      .returning();

    console.log('Subscription plans created:', plans.length);

    // 3. Create products
    const productData = await db
      .insert(products)
      .values([
        {
          name: 'Premium Coffee Blend',
          description: 'Artisanal coffee from Ethiopia',
          price: 2499, // $24.99
          sku: 'COFFEE-001',
        },
        {
          name: 'Gourmet Tea Selection',
          description: 'Premium loose-leaf teas',
          price: 1999, // $19.99
          sku: 'TEA-001',
        },
        {
          name: 'Chocolate Sampler',
          description: 'Handcrafted chocolates from Belgium',
          price: 3499, // $34.99
          sku: 'CHOCO-001',
        },
      ])
      .onConflictDoNothing()
      .returning();

    console.log('Products created:', productData.length);

    // 4. Create fulfillment centers
    const centers = await db
      .insert(fulfillmentCenters)
      .values([
        {
          name: 'New York Warehouse',
          address: '123 Main St, New York, NY 10001',
          latitude: '40.7128',
          longitude: '-74.0060',
        },
        {
          name: 'Los Angeles Distribution',
          address: '456 Sunset Blvd, Los Angeles, CA 90001',
          latitude: '34.0522',
          longitude: '-118.2437',
        },
        {
          name: 'Chicago Fulfillment',
          address: '789 Lake Shore Dr, Chicago, IL 60601',
          latitude: '41.8781',
          longitude: '-87.6298',
        },
      ])
      .onConflictDoNothing()
      .returning();

    console.log('Fulfillment centers created:', centers.length);

    // 5. Create inventory
    for (const product of productData) {
      for (const center of centers) {
        await db
          .insert(inventory)
          .values({
            productId: product.id,
            fulfillmentCenterId: center.id,
            quantity: Math.floor(Math.random() * 50) + 10, // Random stock 10-60
          })
          .onConflictDoUpdate({
            target: [inventory.productId, inventory.fulfillmentCenterId],
            set: { quantity: Math.floor(Math.random() * 50) + 10 },
          });
      }
    }
    console.log('Inventory created for all products and centers');

    // 6. Create a test subscription for admin
    if (adminUser && plans[0]) {
      const startDate = new Date();
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId: adminUser.id,
        planId: plans[0].id,
        startDate: startDate, // Use Date object directly
        status: 'active',
        nextBillingDate: nextBillingDate, // Use Date object directly
      })
      .onConflictDoNothing()
      .returning();

  if (subscription) {
    console.log('Test subscription created for admin user');
  } else {
    console.log('Subscription already exists or failed to create');
  }
}

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Test Data Created:');
    console.log('   - Admin user: admin@example.com / admin123');
    console.log('   - 3 Subscription plans');
    console.log('   - 3 Products with inventory');
    console.log('   - 3 Fulfillment centers');
    console.log('   - Test subscription for admin user');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();