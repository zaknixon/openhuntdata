import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCHEMA_DIR } from './assets.js';

export const SCHEMA_BASE = 'https://openhuntdata.org/schemas/1.0/';

let cached: Ajv2020 | undefined;

function schemaFiles(): string[] {
  return readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.schema.json')).sort();
}

export function loadSchemas(): Ajv2020 {
  if (cached) return cached;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const file of schemaFiles()) {
    ajv.addSchema(JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8')));
  }
  cached = ajv;
  return ajv;
}

export function schemaIds(): string[] {
  return schemaFiles().map((f) => SCHEMA_BASE + f);
}

export function getValidator(name: string): ValidateFunction {
  const v = loadSchemas().getSchema(SCHEMA_BASE + name);
  if (!v) throw new Error(`Unknown schema ${name}`);
  return v;
}
