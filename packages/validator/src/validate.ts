import { openBundle, type Bundle } from './bundle.js';
import { checkContainer } from './checks/container.js';
import { checkGeoJson } from './checks/geojson.js';
import { checkSchemas } from './checks/schema.js';
import { createContext } from './context.js';
import { buildReport, type Report } from './report.js';

export interface ValidateOptions {
  /** Promote RFC 7946 winding-order findings from warnings to errors. */
  strict?: boolean;
}

export function validateBundle(input: string | Buffer, options: ValidateOptions = {}): Report {
  let bundle: Bundle;
  try {
    bundle = openBundle(input);
  } catch (e) {
    return buildReport([{ severity: 'error', check: 'container', message: `cannot open bundle: ${(e as Error).message}` }]);
  }
  const ctx = createContext(bundle, options.strict ?? false);
  if (checkContainer(ctx)) {
    checkSchemas(ctx);
    checkGeoJson(ctx);
    // Checks 6 to 9 are appended here in Task 8.
  }
  return buildReport(ctx.findings);
}
