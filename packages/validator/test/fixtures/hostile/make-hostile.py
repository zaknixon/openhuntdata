#!/usr/bin/env python3
"""Builds the hostile zip fixtures used by hostile.test.ts.

Run from anywhere:  python3 packages/validator/test/fixtures/hostile/make-hostile.py

Writes (next to this script):
  traversal.ohd  a bundle whose third entry escapes the extraction root ("zip slip")
  macosx.ohd     a Finder-style "Compress" zip: one wrapping folder plus __MACOSX/ noise

Both carry the manifest.json / harvests.json of examples/minimal verbatim, so the only
thing wrong with traversal.ohd is the entry name and macosx.ohd is fully valid once the
wrapping folder and the __MACOSX/ entries are stripped. Standard library only.
"""

import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
MINIMAL = REPO / "examples" / "minimal"

manifest = (MINIMAL / "manifest.json").read_bytes()
harvests = (MINIMAL / "harvests.json").read_bytes()

with zipfile.ZipFile(HERE / "traversal.ohd", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("manifest.json", manifest)
    z.writestr("harvests.json", harvests)
    z.writestr("../../../evil.json", b'{"pwned": true}\n')

with zipfile.ZipFile(HERE / "macosx.ohd", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("mybundle/manifest.json", manifest)
    z.writestr("mybundle/harvests.json", harvests)
    z.writestr("__MACOSX/mybundle/._manifest.json", b"\x00\x05\x16\x07mac resource fork")

print("wrote", HERE / "traversal.ohd", "and", HERE / "macosx.ohd")
