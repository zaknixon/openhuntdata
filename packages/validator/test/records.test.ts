import { describe, expect, it } from 'vitest';
import { getValidator } from '../src/schemas.js';
import { KINDS, KIND_BY_FILE } from '../src/kinds.js';

const envelope = {
  id: '00000000-0000-4000-8000-000000000001',
  created_at: '2025-11-15T09:12:00-06:00',
  updated_at: '2025-11-15T09:12:00-06:00',
  source: { app: 'Test', app_version: '1', record_id: 'r1' },
  visibility: 'private',
};

function errs(v: ReturnType<typeof getValidator>) { return JSON.stringify(v.errors); }

describe('kinds table', () => {
  it('lists the eight kinds with their files and schemas', () => {
    expect(KINDS.map((k) => k.file)).toEqual([
      'harvests.json', 'sightings.json', 'hunts.json', 'waypoints.geojson',
      'areas.geojson', 'tracks.geojson', 'properties.json', 'media.json',
    ]);
    expect(KIND_BY_FILE.get('areas.geojson')?.geojson).toBe('Polygon');
  });
});

describe('harvest.schema.json', () => {
  const v = getValidator('harvest.schema.json');
  it('accepts a full harvest', () => {
    const ok = v([{
      ...envelope, occurred_at: '2025-11-15T07:41:00-06:00',
      location: { type: 'Point', coordinates: [-86.78, 36.16] },
      species: 'white_tailed_deer', sex: 'male', weapon: 'rifle',
      measurements: [{ name: 'inside_spread', value: 16.5, unit: '[in_i]' }],
      scores: [{ system: 'boone_crockett', method: 'measured', gross: 152.25, net: 148 }],
      weather: { temperature_c: 4.5, moon: { phase: 'full', illumination_pct: 99 } },
      extensions: { 'com.example': { anything: true } },
      unknown_field: 'readers must ignore me',
    }]);
    expect(ok, errs(v)).toBe(true);
  });
  it('accepts a bare-date occurred_at and a null weapon', () => {
    expect(v([{ ...envelope, occurred_at: '2019-10-02', species: 'other', species_text: 'Nilgai', weapon: null }]), errs(v)).toBe(true);
  });
  it('rejects a harvest without species', () => {
    expect(v([{ ...envelope, occurred_at: '2019-10-02' }])).toBe(false);
  });
  it('rejects a malformed extensions key', () => {
    expect(v([{ ...envelope, occurred_at: '2019-10-02', species: 'elk', extensions: { ember: {} } }])).toBe(false);
  });
});

describe('sighting.schema.json', () => {
  const v = getValidator('sighting.schema.json');
  it('accepts a trail-camera sighting with two observations', () => {
    expect(v([{
      ...envelope, occurred_at: '2025-10-30T18:02:00-05:00', source_kind: 'trail_camera',
      observations: [
        { species: 'white_tailed_deer', count: 2, sex: 'female' },
        { species: 'white_tailed_deer', sex: 'male', attributes: { points: 8, rack: 'wide' } },
      ],
    }]), errs(v)).toBe(true);
  });
  it('rejects a sighting with no observations', () => {
    expect(v([{ ...envelope, occurred_at: '2025-10-30T18:02:00-05:00', source_kind: 'in_person', observations: [] }])).toBe(false);
  });
});

describe('hunt.schema.json', () => {
  const v = getValidator('hunt.schema.json');
  it('accepts a hunt with a null ended_at', () => {
    expect(v([{ ...envelope, started_at: '2025-11-15T06:00:00-06:00', ended_at: null, location_kind: 'waypoint', outcome: 'quiet' }]), errs(v)).toBe(true);
  });
  it('rejects an unknown outcome', () => {
    expect(v([{ ...envelope, started_at: '2025-11-15T06:00:00-06:00', location_kind: 'gps', outcome: 'great' }])).toBe(false);
  });
});

describe('property.schema.json', () => {
  const v = getValidator('property.schema.json');
  it('accepts a property with lease dates', () => {
    expect(v([{ ...envelope, name: 'Back 80', acreage_m2: 323749, lease_from: '2025-09-01', lease_to: '2026-08-31',
      address: { line1: '1 Farm Rd', city: 'Nowhere', region: 'TN', postal_code: '37000', country: 'US' } }]), errs(v)).toBe(true);
  });
  it('rejects a property without a name', () => {
    expect(v([{ ...envelope }])).toBe(false);
  });
});

describe('media.schema.json', () => {
  const v = getValidator('media.schema.json');
  it('accepts a media entry', () => {
    expect(v([{ path: 'media/' + 'a'.repeat(64) + '.jpg', mime: 'image/jpeg', bytes: 10, sha256: 'a'.repeat(64),
      owners: [{ kind: 'harvests', id: envelope.id }], captured_at: '2025-11-15T07:45:00-06:00' }]), errs(v)).toBe(true);
  });
  it('rejects a path outside media/', () => {
    expect(v([{ path: 'photo.jpg', mime: 'image/jpeg', bytes: 10, sha256: 'a'.repeat(64), owners: [] }])).toBe(false);
  });
});

describe('geojson kind schemas', () => {
  const feature = (geometry: unknown, properties: Record<string, unknown>) => ({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', id: envelope.id, geometry, properties: { ...envelope, ...properties } }],
  });
  it('waypoints: accepts a Point with location_history', () => {
    const v = getValidator('waypoints.schema.json');
    expect(v(feature({ type: 'Point', coordinates: [-86.78, 36.16] }, { name: 'Creek stand', category: 'stand',
      location_history: [{ location: { type: 'Point', coordinates: [-86.79, 36.16] }, from: '2023-09-01', to: '2024-08-31', reason: 'Moved for wind' }] })), 'wp').toBe(true);
  });
  it('waypoints: rejects a LineString', () => {
    const v = getValidator('waypoints.schema.json');
    expect(v(feature({ type: 'LineString', coordinates: [[-86.78, 36.16], [-86.79, 36.17]] }, { name: 'x', category: 'stand' }))).toBe(false);
  });
  it('areas: accepts a Polygon and a MultiPolygon', () => {
    const v = getValidator('areas.schema.json');
    const ring = [[-86.8, 36.1], [-86.78, 36.1], [-86.78, 36.12], [-86.8, 36.12], [-86.8, 36.1]];
    expect(v(feature({ type: 'Polygon', coordinates: [ring] }, { name: 'Lease', category: 'boundary', color: '#ff8800' })), 'poly').toBe(true);
    expect(v(feature({ type: 'MultiPolygon', coordinates: [[ring]] }, { name: 'Lease', category: 'boundary' })), 'multi').toBe(true);
  });
  it('tracks: accepts a zero-length annotation LineString', () => {
    const v = getValidator('tracks.schema.json');
    expect(v(feature({ type: 'LineString', coordinates: [[-86.78, 36.16], [-86.78, 36.16]] }, { category: 'annotation', style: { label: 'Big rub here' } })), 'annot').toBe(true);
  });
  it('tracks: rejects a one-position LineString', () => {
    const v = getValidator('tracks.schema.json');
    expect(v(feature({ type: 'LineString', coordinates: [[-86.78, 36.16]] }, { category: 'recorded' }))).toBe(false);
  });
});
