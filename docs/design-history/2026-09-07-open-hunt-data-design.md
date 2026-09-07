# Open Hunt Data (OHD) — Design Spec

**Date:** 2026-09-07
**Status:** Approved design, pre-implementation
**Author:** Zak Nixon (initial maintainer), drafted with Claude
**Deliverable:** A vendor-neutral open standard for exporting and importing a hunter's own data between hunting apps, published as a GitHub repo (`openhuntdata/spec`) with a GitHub Pages landing site and a validator CLI.

**Out of scope for this effort:** Ember's own exporter/importer implementation and the Ember-website page. Both are follow-on tasks captured in Linear once the spec ships (see §10).

---

## 1. Purpose and positioning

Hunters accumulate decades of harvests, sightings, stand locations, and property maps. Today that data is locked inside whichever app captured it. OHD defines a file format any hunting app can write and read, so the data outlives the app.

Positioning decisions (settled):

| Decision | Choice |
|---|---|
| Positioning | Vendor-neutral standard with its own name and org. Ember is the initial author and first adopter, not the owner. |
| Name | **Open Hunt Data**, abbreviated OHD. Bundle extension `.ohd`. Tagline: "Your hunting data, portable for life." |
| GitHub org | `github.com/openhuntdata` (verified free 2026-09-07). Repo `openhuntdata/spec`. |
| Domain | `openhuntdata.org` (verified free 2026-09-07). Optional; `openhuntdata.github.io/spec` works until registered. |
| License | Prose (SPEC.md, appendices, site copy): CC-BY-4.0. Schemas, vocab files, examples, validator: MIT. |
| Not to be confused with | `OpenBounds/OpenHuntingData` (archived repo of US hunting-district boundaries). README carries a one-line disambiguation. |

## 2. Scope of v1.0

**In:**
- Core hunt records: harvests (with measurements and scores), sightings (with per-animal observations), hunts (sessions), weather and moon snapshots, media (photos/video).
- Map data: waypoints, areas, tracks (recorded and drawn), properties.

**Deferred (explicitly listed in SPEC.md §Roadmap so they are not re-argued):**
- Personal profile extras: saved weather locations, game preferences, achievements, target-animal lists, emergency contacts.
- Club/group data: membership, rules, announcements, reservations, tasks, dues. Multi-party ownership needs its own privacy model.
- Bundle signing and encryption.
- Reference exporter/importer libraries beyond the validator.

## 3. Bundle container

A bundle is either a **zip file** with extension `.ohd` (store or deflate only) or an **unzipped directory** with the same layout. Both are equally valid. Readers MUST accept both.

```
<bundle>/
  manifest.json        REQUIRED
  harvests.json        array of Harvest
  sightings.json       array of Sighting
  hunts.json           array of Hunt
  waypoints.geojson    FeatureCollection of Point features
  areas.geojson        FeatureCollection of Polygon / MultiPolygon features
  tracks.geojson       FeatureCollection of LineString / MultiLineString features
  properties.json      array of Property
  media.json           array of MediaEntry (one per file under media/)
  media/               binary files, named <sha256>.<ext>
  x-*                  vendor-specific top-level files (any name starting with "x-")
```

Rules:
- Every file except `manifest.json` is optional. An absent file means "none exported", and `manifest.coverage` explains why if the exporter holds that kind of data.
- All JSON is UTF-8. GeoJSON files follow RFC 7946 (WGS84, longitude first, right-hand rule for polygons).
- Readers MUST ignore unknown top-level files and unknown fields anywhere.
- Writers MUST NOT add top-level files outside this list unless the name starts with `x-`.
- Relative paths inside the bundle use forward slashes and never `..`.

### 3.1 manifest.json

```jsonc
{
  "ohd_version": "1.0.0",                     // semver of the spec this bundle conforms to
  "exported_at": "2026-09-07T14:02:11-05:00",
  "exporter": { "name": "Ember", "version": "2.4.1", "url": "https://emberhunt.app" },
  "subject": {
    "display_name": "Zak N.",                  // optional, user-chosen
    "user_id_hash": "sha256:…"                 // stable opaque id; never an email or phone
  },
  "files": [
    { "path": "harvests.json", "kind": "harvests", "count": 14, "sha256": "…" },
    { "path": "waypoints.geojson", "kind": "waypoints", "count": 41, "sha256": "…" },
    { "path": "media/3fa9….jpg", "kind": "media", "sha256": "…", "bytes": 1834921 }
  ],
  "coverage": {
    "included": ["harvests", "sightings", "hunts", "waypoints", "areas", "tracks", "properties", "media"],
    "omitted": [
      { "kind": "waypoints", "reason": "Shared club waypoints not authored by subject were omitted.", "count": 37 }
    ],
    "flags": { "strip_location": false }
  }
}
```

`coverage` is REQUIRED and is the honesty mechanism: it tells the importer and the human what is missing and why. `files[].sha256` is REQUIRED for every file present; validators treat a mismatch as an error.

## 4. Entity model

### 4.1 Common envelope

Every record (elements of the JSON arrays, and the `properties` object of every GeoJSON feature) carries:

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | UUID string | yes | Stable across exports from the same app. GeoJSON features also set the feature-level `id` to the same value. |
| `created_at` | ISO 8601 with offset | yes | |
| `updated_at` | ISO 8601 with offset | yes | |
| `source` | `{ app, app_version, record_id }` | yes | Provenance. `record_id` is the app's native key, as a string. |
| `visibility` | `"private"` \| `"shared"` | yes | As it stood in the source app. |
| `notes` | string | no | Free text, CommonMark allowed. |
| `media` | array of relative paths | no | Each must exist in `media.json`. |
| `extensions` | object keyed by reverse-domain (`"com.emberhq"`) | no | Opaque to other apps. Round-trip conformance requires preserving it byte-for-byte. |

Cross-references (`hunt_id`, `waypoint_id`, `area_id`, `property_id`, `harvest_ids[]`, `sighting_ids[]`) are OHD `id`s. Importers MUST tolerate dangling references by keeping the record and dropping the link, and reporting the count.

### 4.2 Harvest (`harvests.json`)

| Field | Type | Req | Notes |
|---|---|---|---|
| `occurred_at` | ISO 8601 with offset | yes | Bare date (`YYYY-MM-DD`) allowed only if the source stored a date without time. |
| `location` | GeoJSON Point or null | no | |
| `species` | vocab `species` | yes | `"other"` allowed. |
| `species_text` | string | no | Original app label. Required when `species` is `"other"`. |
| `sex` | vocab `sex` | no | |
| `age_class` | vocab `age_class` | no | |
| `weapon` | vocab `weapon` | no | |
| `weapon_text` | string | no | |
| `hunt_id`, `waypoint_id`, `area_id`, `property_id` | UUID | no | |
| `weather` | WeatherSnapshot | no | Conditions at `occurred_at`. |
| `measurements` | array of `{ name, value, unit }` | no | `value` number or string. `unit` is a UCUM code (`[in_i]`, `lb_av`, `cm`, `kg`) or `"1"` for dimensionless. |
| `scores` | array of Score | no | See 4.2.1. |

#### 4.2.1 Score

```jsonc
{ "system": "boone_crockett" | "pope_young" | "sci" | "buckmasters" | "other",
  "system_text": "…",            // required when system is "other"
  "gross": 152.25, "net": 148.0,  // numbers, unit implied by system
  "method": "measured" | "estimated" | "ai",
  "confidence": 0.82,             // 0..1, optional, meaningful for "ai"
  "scored_at": "…" }
```

### 4.3 Sighting (`sightings.json`)

Same `occurred_at`, `location`, `weather`, `hunt_id`, `waypoint_id`, `area_id`, `property_id` fields as Harvest, plus:

| Field | Type | Req | Notes |
|---|---|---|---|
| `source_kind` | `"in_person"` \| `"trail_camera"` \| `"other"` | yes | |
| `observations` | array of Observation | yes | At least one. |

Observation: `{ species, species_text?, count (integer ≥1, default 1), sex?, age_class?, attributes?: { [key: string]: string | number | boolean } }`. `attributes` holds app-specific survey answers with the app's own question keys; the spec does not standardize them.

### 4.4 Hunt (`hunts.json`)

| Field | Type | Req | Notes |
|---|---|---|---|
| `started_at`, `ended_at` | ISO 8601 with offset | yes / no | `ended_at` null if still open or unknown. |
| `location_kind` | `"waypoint"` \| `"gps"` \| `"general"` | yes | |
| `location` | GeoJSON Point or null | no | |
| `waypoint_id`, `area_id`, `property_id` | UUID | no | |
| `outcome` | `"harvest"` \| `"sighting"` \| `"quiet"` \| `"unknown"` | yes | |
| `harvest_ids`, `sighting_ids` | UUID[] | no | |
| `weather_forecast`, `weather_actual` | WeatherSnapshot | no | |
| `moon` | MoonSnapshot | no | |

### 4.5 WeatherSnapshot and MoonSnapshot

All fields optional, SI units in the name:

```
WeatherSnapshot: temperature_c, humidity_pct, pressure_hpa,
  pressure_trend ("rising"|"steady"|"falling"), wind_speed_mps, wind_direction_deg,
  precipitation_mm, cloud_cover_pct, visibility_m, condition_code (WMO 4677 integer),
  moon (MoonSnapshot), captured_at, provider (string)
MoonSnapshot: phase (vocab moon_phase), illumination_pct, age_days,
  is_major_period, is_minor_period (booleans)
```

### 4.6 Waypoint (`waypoints.geojson`, Point features)

| Property | Type | Req | Notes |
|---|---|---|---|
| `name` | string | yes | |
| `category` | vocab `waypoint_category` | yes | |
| `category_text` | string | no | Original app label. Required when `"other"`. |
| `icon` | string | no | App-specific icon key; informational. |
| `property_id` | UUID | no | |
| `location_history` | array of `{ location: Point, from, to (nullable), reason? }` | no | Ordered oldest first. Feature geometry is the current location. |

### 4.7 Area (`areas.geojson`, Polygon / MultiPolygon features)

`name` (req), `category` (vocab `area_category`, req), `category_text`, `color` (CSS hex), `area_m2` (number; writers SHOULD compute, readers MUST NOT trust over geometry), `property_id`.

### 4.8 Track (`tracks.geojson`, LineString / MultiLineString features)

`name`, `category` (vocab `track_category`: `recorded`, `drawn`, `annotation`; req), `started_at`, `ended_at`, `distance_m`, `style` (object: `stroke`, `stroke_width`, `dash`, `label`, `arrow_end` booleans/strings). Text-only annotations from drawing tools are represented as a Track with a zero-length LineString and `style.label`.

### 4.9 Property (`properties.json`)

`name` (req), `description`, `acreage_m2`, `address` (`{ line1, line2, city, region, postal_code, country }`), `county`, `centroid` (GeoJSON Point), `lease_from`, `lease_to` (dates), `directions`. Secrets such as gate codes are excluded from the core and may only appear under `extensions`.

### 4.10 MediaEntry (`media.json`)

```jsonc
{ "path": "media/3fa9….jpg", "mime": "image/jpeg", "bytes": 1834921, "sha256": "…",
  "owners": [ { "kind": "harvest", "id": "…" } ],
  "captured_at": "…", "location": Point | null,
  "camera": { "make": "…", "model": "…" }, "original_filename": "IMG_0421.jpg" }
```

Files are named by content hash so duplicates collapse. `owners` is the reverse index from file to records.

## 5. Vocabularies

Each controlled field has a canonical list in `vocab/<name>.json` (`{ "values": [ { "code", "label", "aliases": [] } ] }`). Every list includes `"other"`.

- **Exporter rule:** map to the closest canonical code; always write the original label in the paired `_text` field when it differs.
- **Importer rule:** trust the code for logic; show the `_text` value to the user.
- **Validator rule:** unknown code is an error; `"other"` without `_text` is a warning.

v1 lists:

| Vocab | Values (initial) |
|---|---|
| `species` | Seeded North American game: `white_tailed_deer`, `mule_deer`, `black_tailed_deer`, `elk`, `moose`, `caribou`, `pronghorn`, `black_bear`, `brown_bear`, `mountain_lion`, `bobcat`, `coyote`, `wild_hog`, `wild_turkey`, `mallard`, `wood_duck`, `canada_goose`, `snow_goose`, `pheasant`, `ruffed_grouse`, `bobwhite_quail`, `mourning_dove`, `cottontail_rabbit`, `gray_squirrel`, `fox_squirrel`, `other`. Family-level codes (`waterfowl`, `upland_bird`, `small_game`, `predator`) are also valid for apps that only track families. |
| `sex` | `male`, `female`, `unknown` |
| `age_class` | `young`, `mature`, `old`, `unknown` (age in years, if known, goes in `measurements` as `{name:"age", unit:"a"}`) |
| `weapon` | `bow`, `crossbow`, `muzzleloader`, `rifle`, `shotgun`, `handgun`, `air_rifle`, `other` |
| `waypoint_category` | `stand`, `blind`, `camera`, `feeder`, `food_plot`, `water`, `mineral`, `sign`, `bedding`, `travel`, `access`, `structure`, `hazard`, `animal`, `other` |
| `area_category` | `boundary`, `food_plot`, `bedding`, `sanctuary`, `zone`, `other` |
| `track_category` | `recorded`, `drawn`, `annotation` |
| `moon_phase` | `new`, `waxing_crescent`, `first_quarter`, `waxing_gibbous`, `full`, `waning_gibbous`, `last_quarter`, `waning_crescent` |

Adding a value is a minor version. Renaming or removing a value is major and v1.x commits never to do it.

## 6. Identity, units, time, privacy

- **Identity.** `id` is a UUID the exporting app keeps stable across exports. An importer that has already imported a record with the same `source.app` + `source.record_id` treats the incoming record as an update. An importer that finds its own app name in `source` treats the bundle as a restore.
- **Units.** Core numeric fields are SI with the unit in the field name. `measurements[].unit` uses UCUM.
- **Coordinates.** WGS84, GeoJSON, longitude first. Altitude optional as the third position element, meters.
- **Time.** ISO 8601 with explicit UTC offset. Bare dates only where the source stored a date.
- **Privacy stance (normative, quoted on the site):** A bundle contains the subject's own authored records only. It never contains other people's names, contact details, reservation calendars, or records other users authored on shared maps; such omissions are listed in `coverage.omitted`. Exporters MUST offer a `strip_location` option that nulls every `location`, empties `location_history`, and removes GPS EXIF from media, and MUST record its use in `coverage.flags`.

## 7. Conformance

| Level | Requirements |
|---|---|
| **Exporter** | Produces a bundle passing the validator with zero errors. `coverage` is truthful. The user can trigger the export from inside the app without contacting support. |
| **Importer** | Accepts any valid 1.x bundle. Never rejects for unknown fields, unknown `x-` files, unknown extension keys, or dangling references. Reports imported and skipped counts per entity type to the user. |
| **Round-trip** | Exporter + Importer, and importing then exporting the `examples/edge-cases` fixture preserves every core field and every `extensions` block byte-for-byte, verified by the validator's `--roundtrip` check. |

Badges: three SVGs in `site/badges/`, plus a table in README listing adopters, level, and date verified.

## 8. Validator (`packages/validator`)

npm package `@openhuntdata/validator`. CLI: `npx ohd validate <bundle.ohd | dir> [--json] [--strict]`. Library: `validateBundle(pathOrBuffer): Report`.

Checks, in order:
1. Container: zip readable or directory present; `manifest.json` parses.
2. Manifest schema; `ohd_version` major == 1.
3. Every listed file exists and `sha256` matches (error). Unlisted files that are not `x-` prefixed (error).
4. Each file against its JSON Schema 2020-12 (error).
5. GeoJSON validity: geometry types match the file, polygons closed, right-hand rule (warning under default, error under `--strict`).
6. Vocab membership (error for unknown code; warning for `other` without `_text`).
7. Cross-reference resolution (warning, with counts).
8. `media.json` entries match files on disk by size and hash (error); every `media[]` ref in records resolves (warning).
9. `coverage` present with `included` and `omitted` arrays (error).

Exit code 0 on no errors, 1 on errors. Implementation: TypeScript, Node 20+, `ajv` for schemas, `yauzl`/`adm-zip` for reading, no other runtime deps. Tests run the three fixtures in `examples/` and a set of deliberately broken bundles under `packages/validator/test/broken/`.

## 9. Repository, site, governance

### 9.1 Repo layout (`openhuntdata/spec`)

```
README.md              promise, badge table, quick start, disambiguation, links
SPEC.md                normative text: §3–§7 of this document, expanded
schemas/               manifest.schema.json, common.schema.json, harvest.schema.json, …
vocab/                 species.json, weapon.json, …
examples/minimal/      one harvest, no media
examples/typical/      a season: ~12 hunts, harvests, sightings, one property with waypoints,
                       one boundary, three photos
examples/edge-cases/   dangling refs, "other" values, unknown fields, an x- file,
                       a bare-date timestamp, a zero-length annotation track
appendix/gpx-kml.md    non-normative mapping table OHD ⇄ GPX 1.1 / KML 2.2
packages/validator/    the npm package
site/                  landing page (plain HTML/CSS, no framework), badges/
GOVERNANCE.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE (MIT), LICENSE-docs (CC-BY-4.0)
.github/workflows/ci.yml       validator tests + validate examples on every push
.github/workflows/pages.yml    publish site/ to GitHub Pages
docs/design-history/           this document
```

### 9.2 Landing page (`site/index.html`)

Single page, restrained standards-site tone, light and dark. Sections in order: promise line and a rendered picture of an unzipped bundle; why (data outlives apps); what a bundle contains; the three conformance levels with badges; adopters table (Ember, "Exporter: in progress", date); links to SPEC, validator, and "propose a change"; footer with license and governance links. No tracking scripts. Domain `openhuntdata.org` via CNAME once registered.

### 9.3 Governance (`GOVERNANCE.md`)

- Maintainer: Zak Nixon. Additional maintainers added by existing maintainer consensus.
- Changes arrive as pull requests. Vocab additions: maintainer approval. Field additions: written rationale plus an example bundle exercising the field. Breaking changes: a major-version RFC issue with a two-week comment window before merge.
- Every release tags the repo (`v1.0.0`) and publishes the validator at the same version.

### 9.4 Versioning policy

Semver on `ohd_version`. Minor: new optional fields, new files, new vocab values. Major: any change to the meaning or type of an existing field, or removal of anything. Readers accept any bundle with matching major.

## 10. Rollout and follow-ons

1. Create GitHub org `openhuntdata` and repo `spec`.
2. Write SPEC.md, schemas, vocab, examples, appendix, governance, README.
3. Build the validator; CI green against examples.
4. Publish site to `openhuntdata.github.io/spec`.
5. Optional: register `openhuntdata.org`, add CNAME.
6. Create Linear issues (team Graylight, project Ember Mobile, label `fast-follow`):
   - Ember OHD Exporter (settings screen entry, produces a conforming bundle, uses `coverage` for shared-map omissions, `strip_location` option). Note Ember currently has no `weapon` field on harvests; exporter writes null until that ships.
   - Ember website `/open-data` page linking to the spec site.
   - Ember OHD Importer (wire the existing KML/GPX parsers under `Ember/src/app/features/maps/import/` into an import flow that also accepts `.ohd`).

## 11. Testing strategy for this effort

- Validator unit tests cover every check in §8 with a passing and a failing fixture.
- CI validates all three example bundles on every push, so the spec, schemas, and examples cannot drift.
- Site build is a static copy; CI checks that every internal link in `site/` and `README.md` resolves.
- Manual: open `examples/typical/*.geojson` in QGIS or geojson.io to confirm map data renders without conversion.
