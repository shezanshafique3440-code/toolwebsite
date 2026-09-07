import 'server-only';
import OpenAI from 'openai';
import { AppError } from '@/lib/errors';
import { toStrictJsonSchema } from '@/lib/ai/json-schema';
import { extractJson, type AIProvider, type CompletionRequest, type CompletionResponse, type CompletionUsage } from '@/lib/ai/provider';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_INPUT_COST = 0.15;
const DEFAULT_OUTPUT_COST = 0.6;

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly model: string;
  readonly isDemo = false;
  private client: OpenAI;

  constructor(apiKey: string, model = process.env.OPENAI_MODEL || DEFAULT_MODEL) {
    this.client = new OpenAI({ apiKey, maxRetries: 2 });
    this.model = model;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: request.maxTokens,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: toStrictJsonSchema(request.schema),
          },
        },
      });

      const choice = response.choices[0];
      if (choice?.finish_reason === 'content_filter') {
        throw new AppError(
          'AI_UNAVAILABLE',
          'The AI declined to analyse this input. Try rephrasing the product details.',
        );
      }

      const raw = choice?.message?.content?.trim() ?? '';

      return {
        output: extractJson(raw),
        raw,
        model: response.model ?? this.model,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      throw toAppError(error);
    }
  }

  estimateCost(usage: CompletionUsage) {
    const inputCost = Number(process.env.OPENAI_INPUT_COST_PER_MTOK ?? DEFAULT_INPUT_COST);
    const outputCost = Number(process.env.OPENAI_OUTPUT_COST_PER_MTOK ?? DEFAULT_OUTPUT_COST);
    return (usage.inputTokens / 1_000_000) * inputCost + (usage.outputTokens / 1_000_000) * outputCost;
  }
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof OpenAI.RateLimitError) {
    return new AppError('AI_UNAVAILABLE', 'The AI service is busy right now. Please try again in a moment.', {
      cause: error,
    });
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return new AppError('AI_UNAVAILABLE', 'We could not reach the AI service. Please try again.', {
      cause: error,
    });
  }
  if (error instanceof OpenAI.APIError) {
    return new AppError('AI_UNAVAILABLE', 'AI analysis is temporarily unavailable. Please try again shortly.', {
      cause: error,
    });
  }
  return new AppError('AI_UNAVAILABLE', 'AI analysis is temporarily unavailable. Please try again shortly.', {
    cause: error,
  });
}
