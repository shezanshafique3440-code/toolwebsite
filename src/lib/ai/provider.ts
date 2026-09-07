import type { ZodType } from 'zod';
import type { AIOperation } from '@/lib/ai/schemas';

export type CompletionRequest = {
  operation: AIOperation;
  system: string;
  prompt: string;
  /** Response contract; converted to JSON Schema for the provider. */
  schema: ZodType<unknown>;
  schemaName: string;
  maxTokens: number;
  /**
   * Structured echo of the user's input. Real providers ignore it (everything
   * they need is already in the prompt); the offline demo provider uses it to
   * build sample output that matches what the user actually typed.
   */
  context?: Record<string, unknown>;
};

export type CompletionUsage = { inputTokens: number; outputTokens: number };

export type CompletionResponse = {
  /** Best-effort parsed JSON. Validation happens in the orchestrator. */
  output: unknown;
  raw: string;
  model: string;
  usage: CompletionUsage;
};

/**
 * Provider abstraction.
 *
 * Application code never talks to a vendor SDK directly — it calls
 * `generateStructured` in `src/lib/ai/index.ts`, which selects a provider,
 * validates the response against a Zod schema and handles repair/retry.
 */
export interface AIProvider {
  readonly id: string;
  readonly model: string;
  /** True for the offline demo provider, so output can be labelled as sample data. */
  readonly isDemo: boolean;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  /** Approximate USD cost, used by the admin usage dashboard. */
  estimateCost(usage: CompletionUsage): number;
}

/**
 * Extracts a JSON object from a model response that may be wrapped in prose or
 * fenced code. Returns `undefined` when nothing parseable is present.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const parsed = tryParse(fenced[1].trim());
    if (parsed !== undefined) return parsed;
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const parsed = tryParse(trimmed.slice(start, end + 1));
    if (parsed !== undefined) return parsed;
  }

  return undefined;
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
