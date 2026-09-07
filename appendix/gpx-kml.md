# Appendix B: GPX and KML mapping (informative)

For apps that only speak GPX 1.1 or KML 2.2, this table shows how OHD entities map. Losses are marked; OHD is the richer format in every row.

| OHD | GPX 1.1 | KML 2.2 | Notes |
|---|---|---|---|
| Waypoint (Point feature) | `<wpt lat lon>` with `<name>`, `<desc>`, `<sym>`, `<time>` | `<Placemark>` with `<Point>`, `<name>`, `<description>`, `<styleUrl>` | `category` → GPX `<sym>` / KML style id; `category_text` → part of `<desc>`. `location_history` has no equivalent (lost). |
| Area (Polygon feature) | none (GPX has no polygons; some apps emit a closed `<trk>`) | `<Placemark>` with `<Polygon>` / `<MultiGeometry>` | Closed-track GPX imports SHOULD be treated as `areas` with `category: "other"` and `category_text: "closed track"`. `color` → KML `<LineStyle>`/`<PolyStyle>` (KML color is aabbggrr, reverse the bytes). |
| Track (LineString feature) | `<trk><trkseg><trkpt>` with `<time>` per point | `<Placemark>` with `<LineString>` | `started_at`/`ended_at` → first/last `<trkpt><time>`. `style` → KML `<LineStyle>`. Annotation tracks (zero length) → a Point placemark with the label as `<name>`. |
| Harvest | `<wpt>` with `<type>harvest</type>` and fields serialised into `<desc>` | `<Placemark>` with `<ExtendedData>` | Weather, measurements, and scores fit only in `<ExtendedData>` (KML) or free text (GPX). Lossy; prefer OHD. |
| Sighting | as Harvest with `<type>sighting</type>` | as Harvest | Observations flatten to text. |
| Hunt | none | none | No equivalent; hunts are dropped. |
| Property | none | `<Folder>` grouping the property's placemarks | Metadata (lease dates, acreage) only as `<description>` text. |
| Media | none (`<link>` to an external URL at best) | `<description>` with an `<img>` tag or a KMZ archive | KMZ can carry files; GPX cannot. |

Reading onX-style KML exports: folders named after a property map to `properties`; placemarks with `<Point>` to `waypoints` (use the style id and name to infer `category`); `<Polygon>` to `areas` with `category: "boundary"` when the folder or name contains "boundary", "lease", or "property", else `other`.
