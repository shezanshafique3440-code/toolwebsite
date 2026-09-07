import 'server-only';
import { prisma } from '@/lib/db';
import { getEmailProvider } from '@/lib/email';
import { APP_NAME, appUrl } from '@/lib/constants';
import { PLANS } from '@/lib/plans';
import { describeError, logger } from '@/lib/logger';
import type { Plan } from '@prisma/client';

/**
 * Billing email hooks.
 *
 * These call the existing email abstraction. The bundled transport writes to
 * the server log rather than delivering mail, and says so — nothing here
 * pretends an email reached the customer. Wiring a real transport is a change
 * in `getEmailProvider()` alone.
 */
async function sendToUser(userId: string, subject: string, body: string, event: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user) return;
    await getEmailProvider().send({
      to: user.email,
      subject,
      text: `Hi ${user.name},\n\n${body}\n\n${APP_NAME}\n${appUrl()}/dashboard/billing`,
    });
  } catch (error) {
    // A billing email must never fail webhook processing.
    await logger.warn({
      event: `billing.email_failed`,
      message: `Could not queue the ${event} email`,
      userId,
      context: describeError(error),
    });
  }
}

export const billingEmails = {
  async subscriptionStarted({ userId, plan }: { userId: string; plan: Plan }) {
    const definition = PLANS[plan];
    await sendToUser(
      userId,
      `Your ${definition.name} subscription is active`,
      `Your ${definition.name} plan is now active. You have ${definition.analysesPerMonth} product analyses and ${definition.creditsPerMonth} AI credits each billing period.`,
      'subscription started',
    );
  },

  async paymentSucceeded({ eventId }: { eventId: string }) {
    // Receipts are issued by Paddle, which is the record of payment. This hook
    // exists for a future in-product notification.
    await logger.info({
      event: 'billing.payment_succeeded',
      message: 'Paddle confirmed a successful payment',
      context: { eventId },
    });
  },

  async paymentFailed({ userId }: { userId: string }) {
    await sendToUser(
      userId,
      'We could not process your payment',
      'Your latest payment did not go through. Paddle will retry automatically. To avoid interruption you can update your payment method from the billing page.',
      'payment failed',
    );
  },

  async subscriptionCanceled({ userId }: { userId: string }) {
    await sendToUser(
      userId,
      'Your subscription has ended',
      'Your subscription has ended and your account is back on the Free plan. Your products and reports are unchanged.',
      'subscription canceled',
    );
  },

  async subscriptionExpiring({ userId, endsAt }: { userId: string; endsAt: Date }) {
    await sendToUser(
      userId,
      'Your subscription will end soon',
      `Your subscription is scheduled to end on ${endsAt.toLocaleDateString('en-US', { dateStyle: 'medium' })}. You keep full access until then.`,
      'subscription expiring',
    );
  },
};
