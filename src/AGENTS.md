# Contents

- `index.ts` defines the public deployment-state union and parser.
- `vercel-build.ts` defines Vercel build plans, refusal reasons, pure planners, injectable launchers, and direct Bun entry behavior.
- `*.test.ts` contains deterministic examples and property tests.

# Guidelines

- Keep `index.ts` free of Bun, Node, framework, Convex SDK, and product dependencies.
- Keep `vercel-build.ts` product-neutral. Require the consumer to supply its production deployment name; do not add a fallback or embedded name.
- Preserve exact refusal reasons and subprocess arguments as public compatibility contracts.
- Parse every foreign value before use. Keep Production, Preview, local development, and unsupported provider runtimes as explicit states.
- Never allow Preview to hold a deployment credential. Remove deployment selectors from application-build environments without mutating the caller's record.
- Keep planning pure and side effects behind `VercelConvexBuildLauncher`.
- Use `.js` on relative imports so source-first types compile under NodeNext.
- Pair concrete regression cases with property tests for totality, canonicalization, target classification, environment immutability, and credential exclusion.
- Tests use synthetic values and fake launchers only. Do not contact Convex, Vercel, or another network service.
