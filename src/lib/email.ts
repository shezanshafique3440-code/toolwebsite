import 'server-only';
import { APP_NAME, appUrl } from '@/lib/constants';
import { logger } from '@/lib/logger';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Transactional email abstraction. The default transport writes to the server
 * log so verification and reset flows are fully functional in development
 * without an SMTP account; swap in a real transport by implementing this
 * interface and returning it from `getEmailProvider`.
 */
export interface EmailProvider {
  readonly id: string;
  readonly deliversExternally: boolean;
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  readonly id = 'console';
  readonly deliversExternally = false;

  async send(message: EmailMessage) {
    await logger.info({
      event: 'email.send',
      message: `Email queued for ${message.to}: ${message.subject}`,
      context: { body: message.text },
    });
  }
}

export function getEmailProvider(): EmailProvider {
  return new ConsoleEmailProvider();
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  await getEmailProvider().send({
    to,
    subject: `Confirm your ${APP_NAME} email address`,
    text: `Hi ${name},\n\nConfirm your email address to finish setting up your ${APP_NAME} account:\n\n${link}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this message.`,
  });
  return link;
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await getEmailProvider().send({
    to,
    subject: `Reset your ${APP_NAME} password`,
    text: `Hi ${name},\n\nUse the link below to choose a new password:\n\n${link}\n\nThis link expires in one hour and can be used once. If you did not request a reset, no action is needed.`,
  });
  return link;
}

/**
 * Outside production the generated link is returned to the caller so the flow
 * can be completed locally without an inbox. It is never exposed in production.
 */
export function devLink(link: string) {
  return process.env.NODE_ENV === 'production' ? undefined : link;
}
