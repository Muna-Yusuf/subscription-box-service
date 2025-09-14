import { db, users } from '../db/connection';
import { generateToken } from '../middleware/auth';
import { eq } from 'drizzle-orm';

async function main() {
  const [admin] = await db.select().from(users).where(eq(users.email, 'admin@example.com'));

  if (!admin) throw new Error('Admin not found');

  const token = generateToken({ userId: admin.id, role: 'admin' });

  console.log('Admin JWT Token:', token);
}

main();
