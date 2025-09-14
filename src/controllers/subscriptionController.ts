import { Hono } from 'hono';
import { subscriptionService } from '../services/subscriptionService.ts';
import { schedulerService } from '../services/schedulerService.ts';
import { auditService } from '../services/auditService.ts';

export const subscriptionController = new Hono();

// GET /subscriptions - list subscriptions
subscriptionController.get('/subscriptions', async (c) => {
  try {
    const userIdHeader = c.req.header('x-user-id');
    const isAdmin = c.req.header('x-admin') === 'true'; // simple admin check

    let subscriptions;
    if (isAdmin) {
      // Admin can see all subscriptions
      subscriptions = await subscriptionService.getAll();
    } else if (userIdHeader) {
      // User can only see their own
      subscriptions = await subscriptionService.getAll(Number(userIdHeader));
    } else {
      return c.json({ error: 'User ID or admin access required' }, 401);
    }

    return c.json({ success: true, data: subscriptions });
  } catch (error: any) {
    console.error('GET /subscriptions error:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
});

// POST /subscriptions - create subscription
subscriptionController.post('/subscriptions', async (c) => {
  try {
    const { userId, planId } = await c.req.json();

    if (!userId || !planId) {
      return c.json({ success: false, message: 'userId and planId are required' }, 400);
    }

    const subscription = await subscriptionService.createForUser(Number(userId), Number(planId));

    // Schedule next billing automatically
    await schedulerService.scheduleNextBilling(subscription.id, subscription.nextBillingDate);

    // Log creation in audit
    await auditService.logEvent({
      userId: Number(userId),
      action: 'create_subscription',
      resourceType: 'subscription',
      resourceId: subscription.id,
      status: 'success',
    });

    return c.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error('POST /subscriptions error:', error);

    return c.json({ success: false, message: error.message }, 500);
  }
});

// PATCH /subscriptions/:id - update subscription status
subscriptionController.patch('/subscriptions/:id', async (c) => {
  try {
    const subscriptionId = Number(c.req.param('id'));
    const { status } = await c.req.json();

    if (!['paused', 'active', 'payment_failed'].includes(status)) {
      return c.json({ success: false, message: 'Invalid status value' }, 400);
    }

    const updated = await subscriptionService.updateStatus(subscriptionId, status);

    // Log status change
    await auditService.logEvent({
      userId: updated.userId,
      action: 'update_subscription_status',
      resourceType: 'subscription',
      resourceId: subscriptionId,
      details: { status },
      status: 'success',
    });

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('PATCH /subscriptions/:id error:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
});
