// Generates examples/typical: one season on one property. Deterministic output.
// Run: node scripts/generate-typical.mjs && node packages/validator/dist/bin.js manifest examples/typical
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'typical');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'media'), { recursive: true });

const APP = { app: 'OHD Examples', app_version: '1.0.0' };
const uuid = (n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const ts = (date, time) => `${date}T${time}-06:00`;
const env = (n, created, extra = {}) => ({
  id: uuid(n), created_at: ts(created, '20:00:00'), updated_at: ts(created, '20:00:00'),
  source: { ...APP, record_id: `rec-${n}` }, visibility: 'private', ...extra,
});
const write = (name, value) => writeFileSync(join(OUT, name), JSON.stringify(value, null, 2) + '\n');

// --- property and map ---------------------------------------------------------
const PROPERTY = 1;
const properties = [env(PROPERTY, '2025-08-15', {
  name: 'Back 80', description: 'Family farm lease, mostly hardwood ridge with a creek bottom.',
  acreage_m2: 323749, county: 'Davidson', centroid: { type: 'Point', coordinates: [-86.79, 36.11] },
  address: { city: 'Nashville', region: 'TN', country: 'US' }, lease_from: '2025-09-01', lease_to: '2026-08-31',
  directions: 'Gravel drive off the county road; park at the barn.',
})];

const ring = [[-86.80, 36.10], [-86.78, 36.10], [-86.78, 36.12], [-86.80, 36.12], [-86.80, 36.10]];
const plot = [[-86.792, 36.108], [-86.788, 36.108], [-86.788, 36.111], [-86.792, 36.111], [-86.792, 36.108]];
const feature = (n, created, geometry, props) => ({ type: 'Feature', id: uuid(n), geometry, properties: env(n, created, props) });

const areas = { type: 'FeatureCollection', features: [
  feature(10, '2025-08-15', { type: 'Polygon', coordinates: [ring] }, { name: 'Back 80 boundary', category: 'boundary', color: '#f97316', area_m2: 323749, property_id: uuid(PROPERTY) }),
  feature(11, '2025-08-20', { type: 'Polygon', coordinates: [plot] }, { name: 'Clover plot', category: 'food_plot', color: '#22c55e', area_m2: 12000, property_id: uuid(PROPERTY) }),
] };

const WP = { creek: 20, ridge: 21, cam: 22, feeder: 23, scrape: 24, gate: 25 };
const waypoints = { type: 'FeatureCollection', features: [
  feature(WP.creek, '2025-08-20', { type: 'Point', coordinates: [-86.7905, 36.1035] }, { name: 'Creek stand', category: 'stand', category_text: 'Ladder stand', property_id: uuid(PROPERTY),
    location_history: [{ location: { type: 'Point', coordinates: [-86.7912, 36.1040] }, from: '2023-09-01', to: '2025-08-20', reason: 'Moved 80 m for a north wind.' }] }),
  feature(WP.ridge, '2025-08-20', { type: 'Point', coordinates: [-86.7860, 36.1150] }, { name: 'Ridge blind', category: 'blind', property_id: uuid(PROPERTY) }),
  feature(WP.cam, '2025-09-02', { type: 'Point', coordinates: [-86.7890, 36.1095] }, { name: 'Plot camera', category: 'camera', property_id: uuid(PROPERTY) }),
  feature(WP.feeder, '2025-09-02', { type: 'Point', coordinates: [-86.7895, 36.1100] }, { name: 'Corn feeder', category: 'feeder', property_id: uuid(PROPERTY) }),
  feature(WP.scrape, '2025-10-25', { type: 'Point', coordinates: [-86.7875, 36.1120] }, { name: 'Big scrape', category: 'sign', category_text: 'Scrape', property_id: uuid(PROPERTY), notes: 'Fresh 10/25, licking branch worked.' }),
  feature(WP.gate, '2025-08-15', { type: 'Point', coordinates: [-86.8000, 36.1050] }, { name: 'Main gate', category: 'access', category_text: 'Gate', property_id: uuid(PROPERTY) }),
] };

const tracks = { type: 'FeatureCollection', features: [
  feature(30, '2025-09-06', { type: 'LineString', coordinates: [[-86.8000, 36.1050], [-86.7950, 36.1045], [-86.7905, 36.1035]] },
    { name: 'Walk-in to creek stand', category: 'recorded', started_at: ts('2025-09-06', '07:10:00'), ended_at: ts('2025-09-06', '07:28:00'), distance_m: 870 }),
  feature(31, '2025-10-25', { type: 'LineString', coordinates: [[-86.7875, 36.1120], [-86.7875, 36.1120]] },
    { category: 'annotation', style: { label: 'Rut sign starts here' } }),
] };

// --- season: 12 hunts, 2 harvests, 5 sightings ------------------------------------------
const moonPhases = ['waxing_gibbous', 'full', 'waning_gibbous', 'last_quarter', 'waning_crescent', 'new', 'waxing_crescent', 'first_quarter'];
const weather = (i, t) => ({ temperature_c: t, humidity_pct: 60 + i, pressure_hpa: 1015 + (i % 5), pressure_trend: ['rising', 'steady', 'falling'][i % 3],
  wind_speed_mps: 1 + (i % 4), wind_direction_deg: (i * 45) % 360, cloud_cover_pct: (i * 13) % 100,
  moon: { phase: moonPhases[i % 8], illumination_pct: (i * 12) % 100 }, provider: 'example' });

const dates = ['2025-10-04', '2025-10-11', '2025-10-18', '2025-10-25', '2025-11-01', '2025-11-08', '2025-11-15', '2025-11-22', '2025-11-29', '2025-12-06', '2025-12-13', '2025-12-20'];
const HUNT = (i) => 100 + i;
const HARV = { first: 200, second: 201 };
const SIGHT = (i) => 300 + i;

const hunts = dates.map((d, i) => {
  const stand = i % 2 === 0 ? WP.creek : WP.ridge;
  const outcome = i === 6 || i === 11 ? 'harvest' : [1, 3, 8].includes(i) ? 'sighting' : 'quiet';
  return env(HUNT(i), d, {
    started_at: ts(d, '05:45:00'), ended_at: ts(d, '10:15:00'), location_kind: 'waypoint', waypoint_id: uuid(stand), property_id: uuid(PROPERTY),
    outcome,
    harvest_ids: i === 6 ? [uuid(HARV.first)] : i === 11 ? [uuid(HARV.second)] : [],
    sighting_ids: i === 1 ? [uuid(SIGHT(0))] : i === 3 ? [uuid(SIGHT(1))] : i === 8 ? [uuid(SIGHT(2))] : [],
    weather_forecast: weather(i, 8 - i), weather_actual: weather(i, 7 - i), moon: { phase: moonPhases[i % 8], illumination_pct: (i * 12) % 100 },
    notes: outcome === 'quiet' ? 'Nothing moving.' : undefined,
  });
});

// --- media (three tiny JPEGs; the validator checks bytes and hashes, not decodability) ----
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z', 'base64');
const photoBytes = (label) => Buffer.concat([JPEG, Buffer.from(`\n# ${label}\n`)]);
const photos = [
  { label: 'harvest-1', owners: [{ kind: 'harvests', id: uuid(HARV.first) }], captured_at: ts('2025-11-15', '08:05:00'), location: { type: 'Point', coordinates: [-86.7905, 36.1035] } },
  { label: 'harvest-2', owners: [{ kind: 'harvests', id: uuid(HARV.second) }], captured_at: ts('2025-12-20', '09:20:00'), location: { type: 'Point', coordinates: [-86.7860, 36.1150] } },
  { label: 'trailcam-1', owners: [{ kind: 'sightings', id: uuid(SIGHT(3)) }, { kind: 'waypoints', id: uuid(WP.cam) }], captured_at: ts('2025-10-30', '18:02:00'), location: null, camera: { make: 'Example', model: 'Cam 2' } },
].map((p) => {
  const bytes = photoBytes(p.label);
  const path = `media/${sha(bytes)}.jpg`;
  writeFileSync(join(OUT, path), bytes);
  const { label, ...rest } = p;
  return { path, mime: 'image/jpeg', bytes: bytes.length, sha256: sha(bytes), ...rest, original_filename: `${label}.jpg` };
});

const harvests = [
  env(HARV.first, '2025-11-15', {
    occurred_at: ts('2025-11-15', '07:41:00'), location: { type: 'Point', coordinates: [-86.7905, 36.1035] },
    species: 'white_tailed_deer', sex: 'male', age_class: 'mature', weapon: 'rifle', hunt_id: uuid(HUNT(6)), waypoint_id: uuid(WP.creek), property_id: uuid(PROPERTY),
    weather: weather(6, 1), media: [photos[0].path], notes: 'Eight-point, came in from the creek bottom at first light.',
    measurements: [{ name: 'antler_points', value: 8, unit: '1' }, { name: 'inside_spread', value: 16.5, unit: '[in_i]' }, { name: 'field_dressed_weight', value: 165, unit: 'lb_av' }],
    scores: [{ system: 'boone_crockett', method: 'measured', gross: 138.25, net: 133.5, scored_at: ts('2025-11-16', '12:00:00') }, { system: 'boone_crockett', method: 'ai', gross: 141, confidence: 0.71 }],
  }),
  env(HARV.second, '2025-12-20', {
    occurred_at: ts('2025-12-20', '09:02:00'), location: { type: 'Point', coordinates: [-86.7860, 36.1150] },
    species: 'white_tailed_deer', sex: 'female', age_class: 'mature', weapon: 'muzzleloader', hunt_id: uuid(HUNT(11)), waypoint_id: uuid(WP.ridge), property_id: uuid(PROPERTY),
    weather: weather(11, -4), media: [photos[1].path], measurements: [{ name: 'field_dressed_weight', value: 110, unit: 'lb_av' }],
  }),
];

const sightings = [
  env(SIGHT(0), '2025-10-11', { occurred_at: ts('2025-10-11', '07:20:00'), location: { type: 'Point', coordinates: [-86.7905, 36.1035] }, source_kind: 'in_person', hunt_id: uuid(HUNT(1)), waypoint_id: uuid(WP.creek), property_id: uuid(PROPERTY), weather: weather(1, 12),
    observations: [{ species: 'white_tailed_deer', count: 3, sex: 'female' }, { species: 'white_tailed_deer', count: 1, sex: 'male', age_class: 'young', attributes: { points: 4 } }] }),
  env(SIGHT(1), '2025-10-25', { occurred_at: ts('2025-10-25', '08:05:00'), location: { type: 'Point', coordinates: [-86.7860, 36.1150] }, source_kind: 'in_person', hunt_id: uuid(HUNT(3)), waypoint_id: uuid(WP.ridge), property_id: uuid(PROPERTY), weather: weather(3, 9),
    observations: [{ species: 'wild_turkey', count: 7 }] }),
  env(SIGHT(2), '2025-11-29', { occurred_at: ts('2025-11-29', '06:50:00'), location: { type: 'Point', coordinates: [-86.7905, 36.1035] }, source_kind: 'in_person', hunt_id: uuid(HUNT(8)), waypoint_id: uuid(WP.creek), property_id: uuid(PROPERTY), weather: weather(8, 2),
    observations: [{ species: 'coyote', count: 1 }] }),
  env(SIGHT(3), '2025-10-30', { occurred_at: ts('2025-10-30', '18:02:00'), location: { type: 'Point', coordinates: [-86.7890, 36.1095] }, source_kind: 'trail_camera', waypoint_id: uuid(WP.cam), property_id: uuid(PROPERTY), media: [photos[2].path],
    observations: [{ species: 'white_tailed_deer', count: 1, sex: 'male', age_class: 'mature', attributes: { points: 10, nickname: 'Split G2' } }] }),
  env(SIGHT(4), '2025-11-03', { occurred_at: ts('2025-11-03', '05:31:00'), location: { type: 'Point', coordinates: [-86.7890, 36.1095] }, source_kind: 'trail_camera', waypoint_id: uuid(WP.cam), property_id: uuid(PROPERTY),
    observations: [{ species: 'wild_hog', count: 4 }] }),
];

// --- write ---------------------------------------------------------------------------------
write('properties.json', properties);
write('areas.geojson', areas);
write('waypoints.geojson', waypoints);
write('tracks.geojson', tracks);
write('hunts.json', hunts.map((h) => Object.fromEntries(Object.entries(h).filter(([, v]) => v !== undefined))));
write('harvests.json', harvests);
write('sightings.json', sightings);
write('media.json', photos);
write('manifest.json', {
  ohd_version: '1.0.0', exported_at: '2026-09-07T10:00:00-05:00',
  exporter: { name: 'OHD Examples', version: '1.0.0', url: 'https://github.com/openhuntdata/spec' },
  subject: { display_name: 'Example Hunter', user_id_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000002' },
  files: [],
  coverage: {
    included: ['harvests', 'sightings', 'hunts', 'waypoints', 'areas', 'tracks', 'properties', 'media'],
    omitted: [{ kind: 'waypoints', reason: 'Two waypoints created by other club members on the shared map were omitted.', count: 2 }],
    flags: { strip_location: false },
  },
});
console.log(`wrote ${OUT}; now run: node packages/validator/dist/bin.js manifest examples/typical`);
