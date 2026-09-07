/**
 * Application error taxonomy.
 *
 * Every error surfaced to a client goes through `AppError`, which carries a
 * stable machine code plus a message that is safe to show a user. Raw provider
 * or database errors are never forwarded.
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'PRO_PLAN_REQUIRED'
  | 'BUSINESS_PLAN_REQUIRED'
  | 'BILLING_UNAVAILABLE'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE'
  | 'ACCOUNT_SUSPENDED'
  | 'INTERNAL';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  QUOTA_EXCEEDED: 402,
  PRO_PLAN_REQUIRED: 403,
  BUSINESS_PLAN_REQUIRED: 403,
  BILLING_UNAVAILABLE: 503,
  AI_UNAVAILABLE: 503,
  AI_INVALID_RESPONSE: 502,
  ACCOUNT_SUSPENDED: 403,
  INTERNAL: 500,
};

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: 'We could not process that request. Please check your input and try again.',
  VALIDATION_ERROR: 'Some of the information provided is not valid.',
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: 'You do not have access to this resource.',
  NOT_FOUND: 'We could not find what you were looking for.',
  CONFLICT: 'That action conflicts with the current state of your account.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  QUOTA_EXCEEDED: "You've reached your monthly analysis limit. Upgrade your plan to continue.",
  PRO_PLAN_REQUIRED: 'This feature is available on the Pro and Business plans.',
  BUSINESS_PLAN_REQUIRED: 'This feature is available on the Business plan.',
  BILLING_UNAVAILABLE: 'Payments are not available right now. Please try again later.',
  AI_UNAVAILABLE: 'AI analysis is temporarily unavailable. Please try again shortly.',
  AI_INVALID_RESPONSE:
    'The AI returned an unexpected result. We retried automatically — please try once more.',
  ACCOUNT_SUSPENDED: 'This account has been suspended. Contact support for help.',
  INTERNAL: 'Something went wrong. Please try again.',
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  /** Safe to render directly in the UI. */
  readonly userMessage: string;

  constructor(code: ErrorCode, userMessage?: string, options?: { details?: unknown; cause?: unknown }) {
    super(userMessage ?? DEFAULT_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.userMessage = userMessage ?? DEFAULT_MESSAGES[code];
    this.details = options?.details;
    if (options?.cause) this.cause = options.cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function errorMessageFor(code: ErrorCode) {
  return DEFAULT_MESSAGES[code];
}
