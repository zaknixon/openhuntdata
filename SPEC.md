# Open Hunt Data Specification

**Version:** 1.0.0 · **Status:** Final · **Date:** 2026-09-07
**License:** CC-BY-4.0 (this text) · MIT (schemas, vocabularies, examples, validator)

## 1. Introduction

Open Hunt Data (OHD) is a file format for a hunter's own data — harvests, sightings, hunts, waypoints, property boundaries, tracks, and the media that goes with them — so that a lifetime of records can move between hunting apps without being retyped, exported to a proprietary spreadsheet, or lost when an app shuts down. A conforming bundle is a self-contained zip file or directory that any two independently written applications can produce and consume without coordinating with each other in advance.

OHD is not a sync protocol: a bundle is a point-in-time snapshot, not a live channel between two apps. It is not a cloud service: nothing in this specification requires a server, an account, or a network connection to produce or consume a bundle. And it is not a database: a bundle is meant to be read on import, not queried or updated in place.

## 2. Conventions

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, and MAY are to be interpreted as described in RFC 2119. "Exporter" means an application writing a bundle. "Importer" means an application reading one. "Subject" means the person whose data the bundle contains.

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
- Only `manifest.json` is REQUIRED; every other top-level file MAY be omitted. An absent file means "none exported", and `manifest.coverage` explains why if the exporter holds that kind of data.
- All JSON MUST be UTF-8 encoded. GeoJSON files MUST follow RFC 7946 (WGS84, longitude first, right-hand rule for polygons). Validators report winding-order violations as warnings by default; `ohd validate --strict` promotes them to errors.
- Readers MUST ignore unknown top-level files and unknown fields anywhere.
- Writers MUST NOT add top-level files outside this list unless the name starts with `x-`.
- Relative paths inside the bundle MUST use forward slashes and MUST NOT contain `..` segments.

### 3.1 manifest.json

```jsonc
{
  "ohd_version": "1.0.0",                     // semver of the spec this bundle conforms to
  "exported_at": "2026-09-07T14:02:11-05:00",
  "exporter": { "name": "ExampleHuntApp", "version": "2.4.1", "url": "https://example.com/hunt-app" },
  "subject": {
    "display_name": "J. Hunter",                // optional, user-chosen
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

`files[]` MUST list every top-level file except `manifest.json`. Files under `media/` are governed by `media.json` and MAY be omitted from `files[]`. Files whose names begin with `x-` are listed with `kind: "extension"`.

`coverage` is REQUIRED and is the honesty mechanism: it tells the importer and the human what is missing and why. `files[].sha256` is REQUIRED for every file present; validators treat a mismatch as an error.

## 4. Entity model

### 4.1 Common envelope

Every record (elements of the JSON arrays, and the `properties` object of every GeoJSON feature) carries the fields below. A record MUST include every field marked "yes" in the Req column and MAY omit any field marked "no":

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | UUID string | yes | Stable across exports from the same app. GeoJSON features also set the feature-level `id` to the same value; feature-level `id` on a GeoJSON feature, when present, MUST equal `properties.id`. |
| `created_at` | ISO 8601 with offset | yes | |
| `updated_at` | ISO 8601 with offset | yes | |
| `source` | `{ app, app_version, record_id }` | yes | Provenance. `record_id` is the app's native key, as a string. |
| `visibility` | `"private"` \| `"shared"` | yes | As it stood in the source app. |
| `notes` | string | no | Free text, CommonMark allowed. |
| `media` | array of relative paths | no | Each MUST exist in `media.json`. |
| `extensions` | object keyed by reverse-domain (`"com.example"`) | no | Opaque to other apps. Round-trip conformance requires preserving it byte-for-byte. |

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
| `observations` | array of Observation | yes | `observations` MUST contain at least one entry. |

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

`name`, `category` (vocab `track_category`: `recorded`, `drawn`, `annotation`; req), `started_at`, `ended_at`, `distance_m`, `style` (object: `stroke`, `stroke_width`, `dash`, `label`, `arrow_end` booleans/strings). A text-only annotation is a Track whose LineString has exactly two identical positions and a `style.label`.

### 4.9 Property (`properties.json`)

`name` (req), `description`, `acreage_m2`, `address` (`{ line1, line2, city, region, postal_code, country }`), `county`, `centroid` (GeoJSON Point), `lease_from`, `lease_to` (dates), `directions`. Secrets such as gate codes are excluded from the core and MAY only appear under `extensions`.

### 4.10 MediaEntry (`media.json`)

```jsonc
{ "path": "media/3fa9….jpg", "mime": "image/jpeg", "bytes": 1834921, "sha256": "…",
  "owners": [ { "kind": "harvests", "id": "…" } ],
  "captured_at": "…", "location": Point | null,
  "camera": { "make": "…", "model": "…" }, "original_filename": "IMG_0421.jpg" }
```

Files are named by content hash so duplicates collapse. `owners` is the reverse index from file to records. `owners[].kind` uses the plural kind names: `harvests`, `sightings`, `hunts`, `waypoints`, `areas`, `tracks`, `properties`.

## 5. Vocabularies

Each controlled field has a canonical list in `vocab/<name>.json` (`{ "values": [ { "code", "label", "aliases": [] } ] }`). Every list includes `"other"`.

- **Exporter rule:** map to the closest canonical code; always write the original label in the paired `_text` field when it differs.
- **Importer rule:** trust the code for logic; show the `_text` value to the user.
- Validators MUST report an unknown code as an error and `other` without its `_text` as a warning.

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

Adding a value is a minor-version change. v1.x MUST NOT rename or remove a vocabulary value; either requires a major version.

## 6. Identity, units, time, privacy

- **Identity.** `id` is a UUID; the exporting app MUST keep it stable across exports of the same record. An importer that has already imported a record with the same `source.app` + `source.record_id` treats the incoming record as an update. An importer that finds its own app name in `source` treats the bundle as a restore.
- **Units.** Core numeric fields MUST use SI units, indicated by the unit in the field name. `measurements[].unit` MUST be a valid UCUM code.
- **Coordinates.** Coordinates MUST use WGS84 and GeoJSON's longitude-first axis order. Altitude MAY be given as the third position element, in meters.
- **Time.** Timestamps MUST be ISO 8601 with an explicit UTC offset; a bare date MAY be used only where the source stored a date without a time component.
- **Privacy stance (normative, quoted on the site):** A bundle contains the subject's own authored records only. It never contains other people's names, contact details, reservation calendars, or records other users authored on shared maps; such omissions are listed in `coverage.omitted`. Exporters MUST offer a `strip_location` option that nulls every `location`, empties `location_history`, and removes GPS EXIF from media, and MUST record its use in `coverage.flags`.

## 7. Conformance

| Level | Requirements |
|---|---|
| **Exporter** | Produces a bundle passing the validator with zero errors. `coverage` is truthful. The user can trigger the export from inside the app without contacting support. |
| **Importer** | Accepts any valid 1.x bundle. Never rejects for unknown fields, unknown `x-` files, unknown extension keys, or dangling references. Reports imported and skipped counts per entity type to the user. |
| **Round-trip** | Exporter + Importer, and importing then exporting the `examples/edge-cases` fixture preserves every core field and every `extensions` block byte-for-byte. Round-trip is verified by `ohd roundtrip <original> <re-exported>`, which compares every record by `id`, ignoring only `source` and `updated_at`, and compares every `x-` file byte-for-byte. Zero differences and zero missing records is conformant. |

Badges: three SVGs in `site/badges/`, plus a table in README listing adopters, level, and date verified.

GeoJSON files MUST conform to RFC 7946: geometry types matching the file (§3), closed polygons, and right-hand-rule exterior-ring winding (see §3). Winding-order violations are reported as warnings by default; `ohd validate --strict` promotes them to errors.

## 8. Versioning

Semver on `ohd_version`. Minor: new optional fields, new files, new vocab values. Major: any change to the meaning or type of an existing field, or removal of anything. Readers MUST accept any bundle whose major version matches a major version they support.

## 9. Roadmap (informative)

The following are deferred from 1.0, so they are not re-argued in future proposals:

- Personal profile extras: saved weather locations, game preferences, achievements, target-animal lists, emergency contacts.
- Club/group data: membership, rules, announcements, reservations, tasks, dues. Multi-party ownership needs its own privacy model.
- Bundle signing and encryption.
- Reference exporter/importer libraries beyond the validator.

Signing and encryption were considered for 1.0 and deferred: a bundle is a file the subject holds; protecting it at rest is the filesystem's job.

## Appendix A. File and schema index

| File | Kind | Schema `$id` | Geometry family |
|---|---|---|---|
| `harvests.json` | `harvests` | `https://openhuntdata.org/schemas/1.0/harvest.schema.json` | — |
| `sightings.json` | `sightings` | `https://openhuntdata.org/schemas/1.0/sighting.schema.json` | — |
| `hunts.json` | `hunts` | `https://openhuntdata.org/schemas/1.0/hunt.schema.json` | — |
| `waypoints.geojson` | `waypoints` | `https://openhuntdata.org/schemas/1.0/waypoints.schema.json` | Point |
| `areas.geojson` | `areas` | `https://openhuntdata.org/schemas/1.0/areas.schema.json` | Polygon |
| `tracks.geojson` | `tracks` | `https://openhuntdata.org/schemas/1.0/tracks.schema.json` | LineString |
| `properties.json` | `properties` | `https://openhuntdata.org/schemas/1.0/property.schema.json` | — |
| `media.json` | `media` | `https://openhuntdata.org/schemas/1.0/media.schema.json` | — |

## Appendix B. GPX/KML mapping

See `appendix/gpx-kml.md` (informative).
