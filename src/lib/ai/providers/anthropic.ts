import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { AppError } from '@/lib/errors';
import { toStrictJsonSchema } from '@/lib/ai/json-schema';
import { extractJson, type AIProvider, type CompletionRequest, type CompletionResponse, type CompletionUsage } from '@/lib/ai/provider';

/** Overridable so an operator can trade cost against depth without a code change. */
const DEFAULT_MODEL = 'claude-opus-5';

/** USD per million tokens for the default model; overridable via env. */
const DEFAULT_INPUT_COST = 5;
const DEFAULT_OUTPUT_COST = 25;

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  readonly model: string;
  readonly isDemo = false;
  private client: Anthropic;

  constructor(apiKey: string, model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey, maxRetries: 2 });
    this.model = model;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
        output_config: {
          // Keep depth proportional to the task: these are bounded, well-specified
          // extractions rather than open-ended reasoning problems.
          effort: 'medium',
          format: { type: 'json_schema', schema: toStrictJsonSchema(request.schema) },
        },
      });

      if (response.stop_reason === 'refusal') {
        throw new AppError(
          'AI_UNAVAILABLE',
          'The AI declined to analyse this input. Try rephrasing the product details.',
        );
      }

      const raw = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return {
        output: extractJson(raw),
        raw,
        model: response.model ?? this.model,
        usage: {
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
        },
      };
    } catch (error) {
      throw toAppError(error);
    }
  }

  estimateCost(usage: CompletionUsage) {
    const inputCost = Number(process.env.ANTHROPIC_INPUT_COST_PER_MTOK ?? DEFAULT_INPUT_COST);
    const outputCost = Number(process.env.ANTHROPIC_OUTPUT_COST_PER_MTOK ?? DEFAULT_OUTPUT_COST);
    return (usage.inputTokens / 1_000_000) * inputCost + (usage.outputTokens / 1_000_000) * outputCost;
  }
}

/**
 * Maps SDK errors onto the application taxonomy. Upstream messages are never
 * forwarded to the browser — only the mapped, user-safe text is.
 */
function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Anthropic.RateLimitError) {
    return new AppError('AI_UNAVAILABLE', 'The AI service is busy right now. Please try again in a moment.', {
      cause: error,
    });
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AppError('AI_UNAVAILABLE', 'AI analysis is temporarily unavailable.', { cause: error });
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AppError('AI_UNAVAILABLE', 'We could not reach the AI service. Please try again.', {
      cause: error,
    });
  }
  if (error instanceof Anthropic.APIError) {
    return new AppError('AI_UNAVAILABLE', 'AI analysis is temporarily unavailable. Please try again shortly.', {
      cause: error,
    });
  }
  return new AppError('AI_UNAVAILABLE', 'AI analysis is temporarily unavailable. Please try again shortly.', {
    cause: error,
  });
}
