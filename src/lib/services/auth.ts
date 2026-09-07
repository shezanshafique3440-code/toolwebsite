import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { hashPassword, fakeVerify, verifyPassword } from '@/lib/auth/password';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import {
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  generateToken,
  hashToken,
} from '@/lib/auth/tokens';
import { ensureSubscription } from '@/lib/billing/service';
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/email';
import type { LoginInput, SignupInput } from '@/lib/validation/auth';

async function issueSession(user: { id: string; email: string; role: 'USER' | 'ADMIN'; sessionVersion: number }) {
  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    sv: user.sessionVersion,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    // Deliberately specific: the signup form needs to tell the user what to do,
    // and email enumeration is already possible through any signup form.
    throw new AppError('CONFLICT', 'An account with that email already exists. Try signing in instead.');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash },
    select: { id: true, email: true, name: true, role: true, sessionVersion: true },
  });

  await ensureSubscription(user.id);

  const { raw, hash } = generateToken();
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS) },
  });
  const link = await sendVerificationEmail(user.email, user.name, raw);

  await issueSession(user);
  await logger.info({ event: 'auth.signup', message: 'New account created', userId: user.id });

  return { user, verificationLink: link };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, name: true, role: true, status: true, passwordHash: true, sessionVersion: true },
  });

  if (!user) {
    // Burn comparable time so a missing account is not distinguishable by timing.
    await fakeVerify();
    throw new AppError('UNAUTHORIZED', 'That email and password combination is not correct.');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    await logger.warn({ event: 'auth.login_failed', message: 'Invalid password', userId: user.id });
    throw new AppError('UNAUTHORIZED', 'That email and password combination is not correct.');
  }

  if (user.status === 'SUSPENDED') {
    throw new AppError('ACCOUNT_SUSPENDED');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await ensureSubscription(user.id);
  await issueSession(user);

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function logout() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
  // Always report success: the response must not reveal whether an account exists.
  if (!user) return { link: null };

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { raw, hash } = generateToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
  });
  const link = await sendPasswordResetEmail(user.email, user.name, raw);
  await logger.info({ event: 'auth.reset_requested', message: 'Password reset requested', userId: user.id });
  return { link };
}

export async function resetPassword(token: string, password: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new AppError('BAD_REQUEST', 'That reset link is invalid or has expired. Request a new one.');
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      // Bumping sessionVersion signs out every existing session for this user.
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await logger.info({ event: 'auth.reset_completed', message: 'Password reset', userId: record.userId });
}

export async function verifyEmail(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new AppError('BAD_REQUEST', 'That verification link is invalid or has expired.');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}

export async function resendVerification(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerifiedAt: true },
  });
  if (!user) throw new AppError('NOT_FOUND');
  if (user.emailVerifiedAt) throw new AppError('CONFLICT', 'Your email address is already verified.');

  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { raw, hash } = generateToken();
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS) },
  });
  return sendVerificationEmail(user.email, user.name, raw);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new AppError('NOT_FOUND');

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('UNAUTHORIZED', 'Your current password is not correct.');

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
    select: { id: true, email: true, role: true, sessionVersion: true },
  });

  // Keep the current device signed in with a token carrying the new version.
  await issueSession(updated);
  await logger.info({ event: 'auth.password_changed', message: 'Password changed', userId });
}
