# Contents

- `build.ts` creates committed ESM runtime output for the Node parser and Bun build tooling.
- `package-smoke.ts` packs and installs the public artifact, verifies its runtime boundaries, and typechecks consumers.
- `check-portfolio-inventory.ts` derives and compares the canonical public package inventory.
- `check-public-boundary.ts` rejects private provenance, unexpected exports, mutating workflow scope, and package-surface drift.

# Guidelines

- Keep checks deterministic, fail closed, and independent of private files or sibling repositories.
- Create temporary state below the operating system temporary directory with restrictive permissions and remove it in `finally` blocks.
- Resolve a genuine Node 24 executable before claiming Node compatibility. Use Bun only for the launcher smoke.
- Package smoke may install the local archive and development type tools. It must not contact Convex, Vercel, or a product endpoint.
- Keep build entrypoints, package exports, file inventory, and smoke imports in exact agreement.
- Do not add provider credentials, mutation commands, repository writes, or publication behavior to validation scripts.
