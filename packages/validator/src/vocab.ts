import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VOCAB_DIR } from './assets.js';

export const VOCAB_NAMES = [
  'species', 'sex', 'age_class', 'weapon',
  'waypoint_category', 'area_category', 'track_category', 'moon_phase',
] as const;
export type VocabName = (typeof VOCAB_NAMES)[number];

interface VocabFile { name: string; values: { code: string; label: string; aliases?: string[] }[] }

const cache = new Map<string, Set<string>>();

export function vocabNames(): string[] {
  return readdirSync(VOCAB_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
}

export function loadVocab(name: string): Set<string> {
  const hit = cache.get(name);
  if (hit) return hit;
  const doc = JSON.parse(readFileSync(join(VOCAB_DIR, `${name}.json`), 'utf8')) as VocabFile;
  const set = new Set(doc.values.map((v) => v.code));
  cache.set(name, set);
  return set;
}
