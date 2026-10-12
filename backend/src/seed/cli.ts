/**
 * npm run seed - wipe and re-seed the demo data. With the embedded database,
 * stop the API first (or use "Reset demo" on the dashboard while it runs).
 */
import { connectDb, disconnectDb } from '../db/connect';
import { seed } from '.';

await connectDb();
const counts = await seed();
console.log('Seeded:', counts);
await disconnectDb();
