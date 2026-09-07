import 'server-only';
import { prisma } from '@/lib/db';

type Level = 'INFO' | 'WARN' | 'ERROR';

type LogInput = {
  event: string;
  message: string;
  context?: Record<string, unknown>;
  userId?: string | null;
};

const REDACTED_KEYS = /(password|token|secret|authorization|api[-_]?key|cookie)/i;

/** Strips anything that looks like a credential before a log leaves the process. */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => redact(entry, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        REDACTED_KEYS.test(key) ? '[redacted]' : redact(entry, depth + 1),
      ]),
    );
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

async function write(level: Level, input: LogInput) {
  const context = input.context ? (redact(input.context) as Record<string, unknown>) : undefined;
  const line = JSON.stringify({
    level,
    event: input.event,
    message: input.message,
    userId: input.userId ?? undefined,
    context,
    at: new Date().toISOString(),
  });

  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.info(line);

  // Persisted for the admin panel. Logging must never break a request, so a
  // failed write is swallowed after being reported to stderr.
  try {
    await prisma.systemLog.create({
      data: {
        level,
        event: input.event,
        message: input.message.slice(0, 1000),
        context: context ? (context as object) : undefined,
        userId: input.userId ?? undefined,
      },
    });
  } catch (error) {
    console.error('[logger] failed to persist log entry', error instanceof Error ? error.message : error);
  }
}

export const logger = {
  info: (input: LogInput) => write('INFO', input),
  warn: (input: LogInput) => write('WARN', input),
  error: (input: LogInput) => write('ERROR', input),
};

export function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack?.split('\n').slice(0, 4).join('\n') };
  }
  return { message: String(error) };
}
