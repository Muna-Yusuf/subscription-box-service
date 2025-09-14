import { Hono } from 'hono';
import router from './routes/router.ts';

const app = new Hono();

// Register all routes
app.route('/api', router);

// Export the app for testing
export { app };
export default app;
