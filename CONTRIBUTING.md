# Contributing

Thanks for helping hunters keep their data.

## Setup
```bash
git clone https://github.com/openhuntdata/spec && cd spec
npm install
npm test                 # validator unit tests
npm run build            # builds packages/validator into dist/
npm run validate:examples
```

## Where things live
- `SPEC.md` is normative. Schemas in `schemas/` and vocabularies in `vocab/` are the machine-readable form and must agree with it.
- `examples/` are real bundles; CI validates them on every push. If you change a schema, update or add an example.
- `packages/validator` is the reference validator. Each check lives in `src/checks/` and has a test in `test/`.

## Proposing a change
See `GOVERNANCE.md` for what each kind of change needs. Small fixes (typos, clearer wording, a missing alias) are welcome as direct PRs.
