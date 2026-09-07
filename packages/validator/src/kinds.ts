export type Kind = 'harvests' | 'sightings' | 'hunts' | 'waypoints' | 'areas' | 'tracks' | 'properties' | 'media';

export interface KindSpec {
  kind: Kind;
  file: string;
  schema: string;
  /** Geometry family for GeoJSON kinds; absent for plain JSON arrays. */
  geojson?: 'Point' | 'Polygon' | 'LineString';
}

export const KINDS: KindSpec[] = [
  { kind: 'harvests', file: 'harvests.json', schema: 'harvest.schema.json' },
  { kind: 'sightings', file: 'sightings.json', schema: 'sighting.schema.json' },
  { kind: 'hunts', file: 'hunts.json', schema: 'hunt.schema.json' },
  { kind: 'waypoints', file: 'waypoints.geojson', schema: 'waypoints.schema.json', geojson: 'Point' },
  { kind: 'areas', file: 'areas.geojson', schema: 'areas.schema.json', geojson: 'Polygon' },
  { kind: 'tracks', file: 'tracks.geojson', schema: 'tracks.schema.json', geojson: 'LineString' },
  { kind: 'properties', file: 'properties.json', schema: 'property.schema.json' },
  { kind: 'media', file: 'media.json', schema: 'media.schema.json' },
];

export const KIND_BY_FILE = new Map(KINDS.map((k) => [k.file, k]));
export const KIND_BY_NAME = new Map(KINDS.map((k) => [k.kind, k]));
/** Kinds whose records carry the common envelope (everything except media). */
export const RECORD_KINDS = KINDS.filter((k) => k.kind !== 'media');
