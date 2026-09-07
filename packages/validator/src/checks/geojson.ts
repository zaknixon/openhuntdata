import type { Context } from '../context.js';
import { KINDS } from '../kinds.js';

type Position = number[];
interface Geometry { type: string; coordinates: unknown }

const ALLOWED: Record<'Point' | 'Polygon' | 'LineString', string[]> = {
  Point: ['Point'],
  Polygon: ['Polygon', 'MultiPolygon'],
  LineString: ['LineString', 'MultiLineString'],
};

/** Shoelace signed area in degree² units. Positive = counter-clockwise (RFC 7946 exterior). */
export function ringArea(ring: Position[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function checkPolygon(ctx: Context, rings: Position[][], where: string): void {
  rings.forEach((ring, r) => {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (ring.length < 4 || first[0] !== last[0] || first[1] !== last[1]) {
      ctx.error('geojson', `ring ${r} is not closed (first and last positions differ) or has fewer than 4 positions`, where);
      return;
    }
    const area = ringArea(ring);
    if (area === 0) {
      ctx.error('geojson', `ring ${r} has zero area`, where);
      return;
    }
    const ccw = area > 0;
    if (r === 0 && !ccw) ctx.flag('geojson', 'exterior ring is clockwise; RFC 7946 requires counter-clockwise', where);
    if (r > 0 && ccw) ctx.flag('geojson', `hole ring ${r} is counter-clockwise; RFC 7946 requires clockwise`, where);
  });
}

/** Check 5: geometry family matches the file, feature ids agree, polygons are closed and wound correctly. */
export function checkGeoJson(ctx: Context): void {
  for (const spec of KINDS) {
    if (!spec.geojson || !ctx.records.has(spec.kind)) continue;
    const fc = JSON.parse(ctx.bundle.readText(spec.file)) as { features: { id?: unknown; geometry: Geometry | null; properties: { id?: string } }[] };
    fc.features.forEach((f, i) => {
      const where = `${spec.file}#/features/${i}`;
      if (f.id !== undefined && f.id !== f.properties.id) {
        ctx.error('geojson', `feature id "${String(f.id)}" differs from properties.id "${f.properties.id}"`, where);
      }
      const g = f.geometry;
      if (!g) {
        ctx.error('geojson', 'geometry is null', where);
        return;
      }
      if (!ALLOWED[spec.geojson!].includes(g.type)) {
        ctx.error('geojson', `geometry type ${g.type} is not allowed in ${spec.file}`, where);
        return;
      }
      if (g.type === 'Polygon') checkPolygon(ctx, g.coordinates as Position[][], where);
      if (g.type === 'MultiPolygon') {
        (g.coordinates as Position[][][]).forEach((poly, j) => checkPolygon(ctx, poly, `${where}/geometry/coordinates/${j}`));
      }
    });
  }
}
