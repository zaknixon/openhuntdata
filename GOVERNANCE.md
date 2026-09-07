# Governance

Open Hunt Data is maintained in the open. These are the rules for changing it.

## Maintainers
- Zak Nixon (initial maintainer).
- Additional maintainers are added by consensus of the existing maintainers and listed here.

## How changes happen
- All changes arrive as pull requests against `main`. CI must be green (tests, example validation, link check).
- **Vocabulary additions** (a new code in `vocab/*.json`): one maintainer approval. Include a label and, when useful, aliases.
- **Field additions** (a new optional field, a new file, a new `coverage` flag): a written rationale in the PR and an example bundle under `examples/` that exercises the field. One maintainer approval.
- **Breaking changes** (changing the meaning or type of an existing field, removing anything, renaming a vocab code): open an issue titled `RFC: <change>` describing the change and migration, leave it open for at least fourteen days for comment, then land it in a major version.

## Releases
- Versions follow semver on `ohd_version`. See SPEC.md §8.
- Every release tags the repository (`v1.2.0`) and publishes `@openhuntdata/validator` at the same version.
- `CHANGELOG.md` is updated in the same PR as the change.

## Adopters
- Any app may claim a conformance level by opening a PR that adds a row to the README adopters table with a link to a public bundle (or a redacted one) that passes `ohd validate`, and, for Round-trip, a passing `ohd roundtrip` run. Maintainers verify and record the date.
