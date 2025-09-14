import { Hono } from 'hono';
import subscriptions from './subscriptions.ts';
import products from './products.ts';
import inventory from './inventory.ts';
import users from './users.ts';
import orders from './orders.ts';
import fulfillmentCenters from './fulfillmentCenters.ts';

const router = new Hono();

router.route('/subscriptions', subscriptions);
router.route('/products', products);
router.route('/inventory', inventory);
router.route('/users', users);
router.route('/orders', orders);
router.route('/fulfillment-centers', fulfillmentCenters);

export default router;
