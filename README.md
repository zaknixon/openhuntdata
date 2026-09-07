# Open Hunt Data (OHD)

**Your hunting data, portable for life.**

Open Hunt Data is a vendor-neutral file format for a hunter's own records: harvests, sightings, hunts, waypoints, property boundaries, tracks, and the photos that go with them. Any hunting app can export an OHD bundle and any app can import one, so a lifetime of seasons is never locked inside one product.

- **Spec:** [SPEC.md](SPEC.md) (normative) · **Site:** https://openhuntdata.github.io/spec/
- **Schemas:** [`schemas/`](schemas/) · **Vocabularies:** [`vocab/`](vocab/) · **Examples:** [`examples/`](examples/)
- **Validator:** [`packages/validator`](packages/validator/) · `npx @openhuntdata/validator validate my-export.ohd`

> Not to be confused with [OpenBounds/OpenHuntingData](https://github.com/OpenBounds/OpenHuntingData), an archived dataset of US hunting-district boundaries.

## What a bundle looks like

A `.ohd` file is a zip (or a plain folder) with a manifest, one JSON or GeoJSON file per record type, and a `media/` folder:

```
season-2025.ohd
├── manifest.json        version, exporting app, file hashes, and what was left out and why
├── harvests.json        harvests with measurements, scores, weather
├── sightings.json       sightings with per-animal observations
├── hunts.json           sessions: start, end, stand, outcome, forecast vs actual
├── waypoints.geojson    stands, cameras, sign, access points (GeoJSON Points)
├── areas.geojson        boundaries, food plots (GeoJSON Polygons)
├── tracks.geojson       recorded walks and drawn lines (GeoJSON LineStrings)
├── properties.json      named land with acreage and lease dates
├── media.json           index of photos, who they belong to
└── media/               the photos themselves, named by content hash
```

Map files are plain GeoJSON; open them in QGIS or geojson.io without conversion.

## Conformance

| Level | Meaning |
|---|---|
| ![Exporter](site/badges/exporter.svg) | Produces a bundle that passes `ohd validate` with zero errors, and lets the user export from inside the app. |
| ![Importer](site/badges/importer.svg) | Accepts any valid 1.x bundle without rejecting unknown fields, extensions, or dangling references, and reports what it imported. |
| ![Round-trip](site/badges/roundtrip.svg) | Both, and re-exporting an imported bundle preserves every field and every extension, verified by `ohd roundtrip`. |

## Adopters

| App | Level | Verified |
|---|---|---|
| [Ember](https://emberhunt.app) | Exporter (in progress) | — |

To add your app, see [GOVERNANCE.md](GOVERNANCE.md).

## Validate a bundle

```bash
npx @openhuntdata/validator validate path/to/bundle.ohd
npx @openhuntdata/validator validate path/to/unzipped-folder --strict --json
```

Two more commands ship in the same CLI:

```bash
ohd manifest path/to/unzipped-folder          # fill in files[] and media.json hashes, sizes, counts
ohd roundtrip original.ohd re-exported.ohd    # the Round-trip conformance check, record by record
```

`ohd validate` refuses a bundle whose entry names escape the bundle root, and by default refuses one over 2 GiB uncompressed or over 50,000 entries — a guardrail of this validator, not a limit of the format.

## Licensing

Schemas, vocabularies, examples, and the validator are MIT ([LICENSE](LICENSE)). The specification text and this site are CC-BY-4.0 ([LICENSE-docs](LICENSE-docs)).
