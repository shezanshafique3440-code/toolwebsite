/**
 * Browser-side API client.
 *
 * Normalises the `{ data }` / `{ error }` envelope into a thrown `ApiError` with
 * a message that is always safe to render — the server never sends anything
 * else.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? (options.body ? 'POST' : 'GET');

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      credentials: 'same-origin',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('We could not reach the server. Check your connection and try again.', 'NETWORK', 0);
  }

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(
      error?.message ?? 'Something went wrong. Please try again.',
      error?.code ?? 'INTERNAL',
      response.status,
      error?.details,
    );
  }

  return (payload as { data: T })?.data as T;
}

/** Extracts per-field messages from a validation error for inline form display. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') return {};
  const entries = Object.entries(error.details as Record<string, unknown>);
  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (Array.isArray(value) && typeof value[0] === 'string') result[key] = value[0];
  }
  return result;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
