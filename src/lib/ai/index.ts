import 'server-only';
import type { ZodType } from 'zod';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { describeError, logger } from '@/lib/logger';
import type { AIProvider, CompletionRequest } from '@/lib/ai/provider';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { OpenAIProvider } from '@/lib/ai/providers/openai';
import { DemoProvider } from '@/lib/ai/providers/demo';
import { ANALYST_SYSTEM_PROMPT, repairPrompt } from '@/lib/ai/prompts';
import type { AIOperation } from '@/lib/ai/schemas';

let cached: { key: string; provider: AIProvider } | null = null;

/**
 * Selects the active provider.
 *
 * `AI_PROVIDER` pins a specific vendor; the default (`auto`) prefers Anthropic,
 * then OpenAI, and falls back to the offline demo provider when no key is set so
 * the application still runs — with every result labelled as sample data.
 */
export function getAIProvider(): AIProvider {
  const preference = (process.env.AI_PROVIDER ?? 'auto').toLowerCase();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const key = `${preference}:${anthropicKey ? 'a' : ''}${openaiKey ? 'o' : ''}:${process.env.ANTHROPIC_MODEL ?? ''}:${process.env.OPENAI_MODEL ?? ''}`;

  if (cached?.key === key) return cached.provider;

  let provider: AIProvider;
  if (preference === 'anthropic') {
    if (!anthropicKey) throw new AppError('AI_UNAVAILABLE', 'AI analysis is not configured. Please contact support.');
    provider = new AnthropicProvider(anthropicKey);
  } else if (preference === 'openai') {
    if (!openaiKey) throw new AppError('AI_UNAVAILABLE', 'AI analysis is not configured. Please contact support.');
    provider = new OpenAIProvider(openaiKey);
  } else if (preference === 'demo') {
    provider = new DemoProvider();
  } else if (anthropicKey) {
    provider = new AnthropicProvider(anthropicKey);
  } else if (openaiKey) {
    provider = new OpenAIProvider(openaiKey);
  } else {
    provider = new DemoProvider();
  }

  cached = { key, provider };
  return provider;
}

/** True when no real provider is configured — surfaced as a banner in the UI. */
export function isDemoMode() {
  try {
    return getAIProvider().isDemo;
  } catch {
    return false;
  }
}

export type GenerateInput<T> = {
  operation: AIOperation;
  schema: ZodType<T>;
  prompt: string;
  system?: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
  userId?: string | null;
};

export type GenerateResult<T> = {
  data: T;
  provider: string;
  model: string;
  latencyMs: number;
  isDemo: boolean;
};

/**
 * Runs a structured generation end to end:
 * request → schema-constrained response → Zod validation → one structured
 * repair attempt → typed result. Every attempt is recorded in `AiRequestLog`.
 */
export async function generateStructured<T>(input: GenerateInput<T>): Promise<GenerateResult<T>> {
  const provider = getAIProvider();
  const started = Date.now();

  const request: CompletionRequest = {
    operation: input.operation,
    system: input.system ?? ANALYST_SYSTEM_PROMPT,
    prompt: input.prompt,
    schema: input.schema as ZodType<unknown>,
    schemaName: input.operation,
    maxTokens: input.maxTokens ?? 8000,
    context: input.context,
  };

  let usage = { inputTokens: 0, outputTokens: 0 };
  let lastIssues = '';

  try {
    const first = await provider.complete(request);
    usage = first.usage;

    const parsed = input.schema.safeParse(first.output);
    if (parsed.success) {
      const latencyMs = Date.now() - started;
      await recordUsage(provider, input, usage, true, latencyMs);
      return { data: parsed.data, provider: provider.id, model: first.model, latencyMs, isDemo: provider.isDemo };
    }

    lastIssues = formatIssues(parsed.error.issues);
    await logger.warn({
      event: 'ai.schema_mismatch',
      message: `${input.operation}: first response failed validation, attempting repair`,
      userId: input.userId,
      context: { provider: provider.id, issues: lastIssues.slice(0, 800) },
    });

    // Structured repair: hand the model its own output plus the exact violations.
    const repaired = await provider.complete({
      ...request,
      prompt: `${input.prompt}\n\n---\n\n${repairPrompt(first.raw, lastIssues)}`,
    });
    usage = {
      inputTokens: usage.inputTokens + repaired.usage.inputTokens,
      outputTokens: usage.outputTokens + repaired.usage.outputTokens,
    };

    const second = input.schema.safeParse(repaired.output);
    const latencyMs = Date.now() - started;

    if (second.success) {
      await recordUsage(provider, input, usage, true, latencyMs);
      return { data: second.data, provider: provider.id, model: repaired.model, latencyMs, isDemo: provider.isDemo };
    }

    await recordUsage(provider, input, usage, false, latencyMs, 'AI_INVALID_RESPONSE');
    await logger.error({
      event: 'ai.repair_failed',
      message: `${input.operation}: response failed validation after repair`,
      userId: input.userId,
      context: { provider: provider.id, issues: formatIssues(second.error.issues).slice(0, 800) },
    });
    throw new AppError('AI_INVALID_RESPONSE');
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code !== 'AI_INVALID_RESPONSE') {
        await recordUsage(provider, input, usage, false, Date.now() - started, error.code);
      }
      throw error;
    }
    await recordUsage(provider, input, usage, false, Date.now() - started, 'INTERNAL');
    await logger.error({
      event: 'ai.unhandled',
      message: `${input.operation}: unexpected AI failure`,
      userId: input.userId,
      context: describeError(error),
    });
    throw new AppError('AI_UNAVAILABLE');
  }
}

function formatIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues
    .slice(0, 25)
    .map((issue) => `- ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

async function recordUsage(
  provider: AIProvider,
  input: GenerateInput<unknown>,
  usage: { inputTokens: number; outputTokens: number },
  success: boolean,
  latencyMs: number,
  errorCode?: string,
) {
  try {
    await prisma.aiRequestLog.create({
      data: {
        userId: input.userId ?? undefined,
        operation: input.operation,
        provider: provider.id,
        model: provider.model,
        success,
        errorCode,
        latencyMs,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: provider.estimateCost(usage),
      },
    });
  } catch (error) {
    console.error('[ai] failed to record request log', error instanceof Error ? error.message : error);
  }
}
