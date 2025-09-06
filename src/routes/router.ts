import { Hono } from 'hono';
import usersApi from './users.ts';
import productsApi from './products.ts';
import subscriptionsApi from './subscriptions.ts';
import fulfillmentCentersApi from './fulfillmentCenters.ts';

const api = new Hono();

api.route('/users', usersApi);
api.route('/products', productsApi);
api.route('/subscriptions', subscriptionsApi);
api.route('/fulfillment-centers', fulfillmentCentersApi);

export default api;
