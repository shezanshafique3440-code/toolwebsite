import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { AppError, isAppError } from '@/lib/errors';
import { describeError, logger } from '@/lib/logger';
import { appUrl } from '@/lib/constants';

export type ApiSuccess<T> = { data: T };
export type ApiFailure = { error: { code: string; message: string; details?: unknown } };

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ data }, init);
}

export function jsonCreated<T>(data: T) {
  return jsonOk(data, { status: 201 });
}

/**
 * Converts any thrown value into a safe API response. Unknown errors are logged
 * server-side and reported to the client as a generic message — stack traces and
 * upstream provider errors never reach the browser.
 */
export async function toErrorResponse(error: unknown, context: { route: string; userId?: string | null }) {
  if (isAppError(error)) {
    if (error.status >= 500) {
      await logger.error({
        event: 'api.error',
        message: `${context.route}: ${error.code}`,
        userId: context.userId,
        context: { code: error.code, details: error.details, cause: describeError(error.cause) },
      });
    }
    return NextResponse.json<ApiFailure>(
      { error: { code: error.code, message: error.userMessage, details: error.details } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json<ApiFailure>(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Some of the information provided is not valid.',
          details: error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  await logger.error({
    event: 'api.unhandled',
    message: `${context.route}: unhandled error`,
    userId: context.userId,
    context: describeError(error),
  });

  return NextResponse.json<ApiFailure>(
    { error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } },
    { status: 500 },
  );
}

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError('BAD_REQUEST', 'The request body must be valid JSON.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Some of the information provided is not valid.', {
      details: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

export function parseQuery<T>(request: Request, schema: ZodSchema<T>): T {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Some of the filters provided are not valid.', {
      details: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

/**
 * CSRF defence for cookie-authenticated mutations. Session cookies are
 * SameSite=Lax, and this additionally rejects any state-changing request whose
 * Origin does not match the application's own.
 */
export function assertSameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const origin = request.headers.get('origin');
  if (!origin) {
    // Same-origin fetches from some browsers omit Origin on non-CORS requests;
    // fall back to the Sec-Fetch-Site hint when present.
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') {
      throw new AppError('FORBIDDEN', 'This request was blocked for security reasons.');
    }
    return;
  }

  const allowed = new Set<string>([appUrl()]);
  const host = request.headers.get('host');
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  const extra = process.env.ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  for (const value of extra) allowed.add(value.replace(/\/$/, ''));

  if (!allowed.has(origin.replace(/\/$/, ''))) {
    throw new AppError('FORBIDDEN', 'This request was blocked for security reasons.');
  }
}

/**
 * Wraps a route handler with origin checking, uniform error mapping and logging.
 *
 * The context type is inferred from the handler so each route can declare
 * exactly the params it expects (and routes without params declare none),
 * matching the per-route context types Next.js generates.
 */
export function route<Context>(
  name: string,
  handler: (request: Request, context: Context) => Promise<Response>,
) {
  return async (request: Request, context: Context) => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error, { route: name });
    }
  };
}

export function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
