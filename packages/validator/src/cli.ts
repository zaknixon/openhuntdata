import { parseArgs } from 'node:util';
import { updateManifest } from './manifest-tool.js';

const USAGE = `Open Hunt Data tools

Usage:
  ohd validate <bundle.ohd | dir> [--json] [--strict]
  ohd manifest <dir>
  ohd roundtrip <expected-bundle> <actual-bundle> [--json]

Exit codes: 0 ok, 1 validation errors / differences found, 2 usage error.`;

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

  switch (cmd) {
    case 'manifest': {
      if (args.length !== 1) { console.error(USAGE); return 2; }
      const m = updateManifest(args[0]);
      console.log(`manifest.json updated: ${m.files.length} file(s) listed`);
      return 0;
    }
    case 'validate':
    case 'roundtrip':
      console.error(`${cmd}: not implemented yet`);
      return 2;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error(USAGE);
      return 2;
  }
}
