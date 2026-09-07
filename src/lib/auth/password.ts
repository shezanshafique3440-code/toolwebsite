import 'server-only';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Constant-ish-time dummy comparison used when an email does not exist, so login
 * timing does not reveal whether an account is registered.
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7RgeRRcvBZ9WuKLLg8fS3iP8ScWnfLW';

export async function fakeVerify() {
  await bcrypt.compare('not-a-real-password', DUMMY_HASH).catch(() => false);
}
