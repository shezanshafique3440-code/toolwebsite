import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson } from '@/lib/ai/provider';
import { toStrictJsonSchema } from '@/lib/ai/json-schema';
import { AI_SCHEMAS, productAnalysisSchema } from '@/lib/ai/schemas';
import { DemoProvider } from '@/lib/ai/providers/demo';

test('extractJson handles bare, fenced and prose-wrapped JSON', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(extractJson('Here you go:\n{"a":3}\nHope that helps.'), { a: 3 });
  assert.equal(extractJson('not json at all'), undefined);
  assert.equal(extractJson(''), undefined);
});

test('every schema converts to a strict JSON Schema', () => {
  for (const [name, schema] of Object.entries(AI_SCHEMAS)) {
    const jsonSchema = toStrictJsonSchema(schema) as Record<string, unknown>;
    assert.equal(jsonSchema.type, 'object', `${name} must be an object schema`);
    assert.equal(jsonSchema.additionalProperties, false, `${name} must disallow extra properties`);
    const properties = Object.keys(jsonSchema.properties as object);
    assert.deepEqual(
      (jsonSchema.required as string[]).slice().sort(),
      properties.slice().sort(),
      `${name} must mark every property required`,
    );
  }
});

test('demo provider output satisfies every schema it claims to support', async () => {
  const provider = new DemoProvider();
  const operations = Object.keys(AI_SCHEMAS) as Array<keyof typeof AI_SCHEMAS>;

  for (const operation of operations) {
    const schema = AI_SCHEMAS[operation];
    const response = await provider.complete({
      operation,
      system: 'test',
      prompt: 'test',
      schema,
      schemaName: operation,
      maxTokens: 1000,
      context: {
        productName: 'Portable Blender',
        competitorUrls: ['https://example.com/blender'],
        platforms: ['FACEBOOK', 'TIKTOK'],
      },
    });

    const parsed = schema.safeParse(response.output);
    assert.ok(
      parsed.success,
      `${operation} demo output failed validation: ${parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 3))}`,
    );
  }
});

test('product analysis rejects out-of-range scores', () => {
  const result = productAnalysisSchema.safeParse({ scores: { demand: 150 } });
  assert.equal(result.success, false);
});
