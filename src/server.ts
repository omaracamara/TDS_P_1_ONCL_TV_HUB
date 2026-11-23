import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function start(): Promise<void> {
  // PI2 cloud requirement: establish MongoDB Atlas connectivity before accepting HTTP traffic.
  await connectDatabase();
  // PI2 Render requirement: listen on the platform-provided PORT instead of a hard-coded port.
  app.listen(env.port, () => console.log(`TV Hub listening on http://localhost:${env.port}`));
}

start().catch((error: unknown) => {
  console.error('Could not start TV Hub:', error);
  process.exit(1);
});
