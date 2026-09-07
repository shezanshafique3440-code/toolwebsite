import { z, type ZodType } from 'zod';

type JsonSchemaNode = Record<string, unknown>;

/**
 * Converts a Zod schema to a JSON Schema accepted by strict structured-output
 * modes: every object property is required and `additionalProperties` is false.
 * Our schemas have no optional fields, so this is a tightening pass rather than
 * a lossy transformation.
 */
export function toStrictJsonSchema(schema: ZodType<unknown>): JsonSchemaNode {
  const generated = z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'output' }) as JsonSchemaNode;
  delete generated.$schema;
  return tighten(generated);
}

function tighten(node: JsonSchemaNode): JsonSchemaNode {
  if (!node || typeof node !== 'object') return node;

  if (node.type === 'object' && node.properties && typeof node.properties === 'object') {
    const properties = node.properties as Record<string, JsonSchemaNode>;
    for (const key of Object.keys(properties)) {
      properties[key] = tighten(properties[key] as JsonSchemaNode);
    }
    node.required = Object.keys(properties);
    node.additionalProperties = false;
  }

  if (node.items && typeof node.items === 'object') {
    node.items = tighten(node.items as JsonSchemaNode);
  }

  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    const branch = node[key];
    if (Array.isArray(branch)) {
      node[key] = branch.map((entry) => tighten(entry as JsonSchemaNode));
    }
  }

  return node;
}
