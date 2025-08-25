import 'dotenv/config';
import { db } from '../db';
import { subscriptionPlans } from '../db/schema';

async function seed() {
  console.log('Seeding database...');

  const plans = [
    {
      name: 'Basic Monthly',
      description: 'Our basic plan billed monthly',
      billingCycle: 'monthly',
      price: 1999,
    },
    {
      name: 'Premium Monthly',
      description: 'Our premium plan billed monthly',
      billingCycle: 'monthly',
      price: 2999,
    },
    {
      name: 'Basic Quarterly',
      description: 'Our basic plan billed quarterly',
      billingCycle: 'quarterly',
      price: 5499,
    },
    {
      name: 'Premium Quarterly',
      description: 'Our premium plan billed quarterly',
      billingCycle: 'quarterly',
      price: 8499,
    },
    {
      name: 'Basic Annual',
      description: 'Our basic plan billed annually',
      billingCycle: 'annually',
      price: 19999,
    },
    {
      name: 'Premium Annual',
      description: 'Our premium plan billed annually',
      billingCycle: 'annually',
      price: 29999,
    },
  ];

  for (const plan of plans) {
    await db.insert(subscriptionPlans).values(plan).onConflictDoNothing();
  }

  console.log('Database seeded successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
