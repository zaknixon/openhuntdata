import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VOCAB_DIR } from '../src/assets.js';
import { getValidator } from '../src/schemas.js';
import { VOCAB_NAMES, loadVocab, vocabNames } from '../src/vocab.js';

describe('vocab', () => {
  it('ships exactly the eight v1 vocabularies', () => {
    expect(vocabNames().sort()).toEqual([...VOCAB_NAMES].sort());
    expect(VOCAB_NAMES).toHaveLength(8);
  });

  it('every vocab file validates against vocab.schema.json and names itself correctly', () => {
    const validate = getValidator('vocab.schema.json');
    for (const name of vocabNames()) {
      const doc = JSON.parse(readFileSync(join(VOCAB_DIR, `${name}.json`), 'utf8'));
      expect(validate(doc), `${name}: ${JSON.stringify(validate.errors)}`).toBe(true);
      expect(doc.name).toBe(name);
    }
  });

  it('every vocab includes "other" and has unique codes', () => {
    for (const name of vocabNames()) {
      const codes = loadVocab(name);
      expect(codes.has('other'), name).toBe(true);
      const doc = JSON.parse(readFileSync(join(VOCAB_DIR, `${name}.json`), 'utf8'));
      expect(codes.size, `${name} has duplicate codes`).toBe(doc.values.length);
    }
  });

  it('species includes the family-level codes', () => {
    const s = loadVocab('species');
    for (const c of ['waterfowl', 'upland_bird', 'small_game', 'predator', 'white_tailed_deer']) expect(s.has(c), c).toBe(true);
  });
});
