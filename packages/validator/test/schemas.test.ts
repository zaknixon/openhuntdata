import { describe, expect, it } from 'vitest';
import { getValidator, loadSchemas, schemaIds } from '../src/schemas.js';

const HASH = 'a'.repeat(64);

const manifest = {
  ohd_version: '1.0.0',
  exported_at: '2026-09-07T10:00:00-05:00',
  exporter: { name: 'Test', version: '0.0.1' },
  files: [{ path: 'harvests.json', kind: 'harvests', count: 1, sha256: HASH }],
  coverage: { included: ['harvests'], omitted: [] },
};

describe('schemas', () => {
  it('compiles every schema in schemas/', () => {
    const ajv = loadSchemas();
    for (const id of schemaIds()) expect(ajv.getSchema(id), id).toBeTruthy();
  });

  it('accepts a minimal valid manifest', () => {
    expect(getValidator('manifest.schema.json')(manifest)).toBe(true);
  });

  it('rejects a manifest without coverage', () => {
    const { coverage: _omit, ...bad } = manifest;
    const validate = getValidator('manifest.schema.json');
    expect(validate(bad)).toBe(false);
    expect(validate.errors?.some((e) => e.message?.includes('coverage'))).toBe(true);
  });

  it('rejects a bad sha256 in files[]', () => {
    const bad = { ...manifest, files: [{ ...manifest.files[0], sha256: 'nothex' }] };
    expect(getValidator('manifest.schema.json')(bad)).toBe(false);
  });

  it('score with system "other" requires system_text', () => {
    const ajv = loadSchemas();
    const v = ajv.compile({ $ref: 'https://openhuntdata.org/schemas/1.0/common.schema.json#/$defs/score' });
    expect(v({ system: 'other', method: 'measured' })).toBe(false);
    expect(v({ system: 'other', system_text: 'Club system', method: 'measured' })).toBe(true);
    expect(v({ system: 'boone_crockett', method: 'ai', confidence: 0.8 })).toBe(true);
  });
});
