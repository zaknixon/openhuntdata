import { parseArgs } from 'node:util';
import { updateManifest } from './manifest-tool.js';
import type { Finding, Report } from './report.js';
import { validateBundle } from './validate.js';

const USAGE = `Open Hunt Data tools

Usage:
  ohd validate <bundle.ohd | dir> [--json] [--strict]
  ohd manifest <dir>
  ohd roundtrip <expected-bundle> <actual-bundle> [--json]

Exit codes: 0 ok, 1 validation errors / differences found, 2 usage error.`;

function formatFindings(report: Report, label: string): string {
  const lines: string[] = [];
  const row = (f: Finding) => `${f.severity.padEnd(7)} ${f.check.padEnd(9)} ${f.path ? `${f.path}: ` : ''}${f.message}`;
  for (const f of report.errors) lines.push(row(f));
  for (const f of report.warnings) lines.push(row(f));
  lines.push(`${label}: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`);
  return lines.join('\n');
}

export function main(argv: string[]): number {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        json: { type: 'boolean', default: false },
        strict: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (e) {
    console.error((e as Error).message);
    console.error(USAGE);
    return 2;
  }
  const { values, positionals } = parsed;
  const [cmd, ...args] = positionals;
  if (values.help || !cmd) {
    console.log(USAGE);
    return values.help ? 0 : 2;
  }

  try {
    switch (cmd) {
      case 'manifest': {
        if (args.length !== 1) { console.error(USAGE); return 2; }
        const m = updateManifest(args[0]);
        console.log(`manifest.json updated: ${m.files.length} file(s) listed`);
        return 0;
      }
      case 'validate': {
        if (args.length !== 1) { console.error(USAGE); return 2; }
        const report = validateBundle(args[0], { strict: values.strict });
        console.log(values.json ? JSON.stringify(report, null, 2) : formatFindings(report, args[0]));
        return report.ok ? 0 : 1;
      }
      case 'roundtrip':
        console.error(`${cmd}: not implemented yet`);
        return 2;
      default:
        console.error(`Unknown command: ${cmd}`);
        console.error(USAGE);
        return 2;
    }
  } catch (e) {
    console.error(`error: ${(e as Error).message}`);
    return 1;
  }
}
