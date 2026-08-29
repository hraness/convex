<!-- kb:context scopes/repository--cdb4ee2aea69 -->
# Contents

- `src/index.ts` parses untrusted public Convex deployment configuration into explicit missing, invalid, or ready states.
- `src/vercel-build.ts` owns pure Vercel target planning and the Bun subprocess launcher.
- `src/*.test.ts` contains deterministic examples and property tests for parser, planner, and launch-boundary behavior.
- `scripts/` builds and smoke-tests the packed package and checks its public inventory and repository boundary.
- `docs/` records the package architecture and immutable release procedure.
- `.github/workflows/` runs read-only continuous integration and verify-then-publish release automation.
- `.agents/skills/` contains the portable KB workflows and five-skill phased-execution pack.
- `kb/` contains authored repository rationale, maintained synthesis, and durable plans.
- `WRITING.md` and `STYLE.md` define the internal and public prose contracts.

# Guidelines

- Use Bun 1.3.14 for installs, builds, scripts, and tests. Keep the root runtime compatible with genuine Node 24; keep the explicit build-tooling subpath compatible with Bun.
- Follow `WRITING.md` for internal prose and `STYLE.md` for public prose.
- Apply unreasonably robust programming when agent work is cheap. Prefer coherent cross-file correctness and focused deterministic evidence to a knowingly weaker design.
- Deliver changes to `main` through a current-head pull request. Keep the stable `Required` CI job green, resolve every review thread, and serialize merges. Human approval stays optional while one regular maintainer would otherwise self-review. Never force-push or bypass the gate.
- Keep the package product-neutral. Consumers own deployment names, Convex functions and schemas, generated clients, application scripts, routes, identities, and provider configuration.
- Preserve the two public seams: the framework-neutral root parser and the explicit `./vercel-build` Bun tooling export. Do not add a Convex SDK, framework, design-system, or product dependency.
- Model invalid states out of existence. Parse foreign values from `unknown`, validate exact origins and provider markers, and refuse ambiguous Vercel runtimes before local fallback.
- Production may deploy Convex only when Vercel target markers, the source-bound deployment name, and the production deploy key agree. Preview must remain application-only and reject every deployment credential, including empty values.
- Strip every deployment selector before the nested application build. Treat the generated Vercel hostname and public Preview origin as display evidence, never as authentication, routing, or authorization authority.
- Keep launch planning pure and inject the subprocess boundary. Unit and property tests must use synthetic values and fake launchers; they must not use credentials, spawn real provider commands, or contact the network.
- Pair readable deterministic regressions with property tests for totality, canonicalization, immutability, fail-closed target classification, credential exclusion, and other general laws.
- Keep `.js` extensions on relative TypeScript import specifiers. The published source type surface must compile under Bundler and NodeNext resolution.
- Pin Hraness dependencies to reviewed immutable releases or full commits. Never connect repositories through sibling paths, Git submodules, or coordinated `main` assumptions; each consumer upgrades on its own validation schedule.
- Extract another shared interface only after at least two concrete consumers require the same stable, product-neutral seam. Avoid sharing high-churn product composition that would serialize parallel work.
- Freeze public interfaces before parallel lanes begin. Give exports, manifests, lockfiles, generated output, and other convergence surfaces one owner while lanes edit disjoint paths.
- Keep mandatory rules in the closest `AGENTS.md`, current procedures in `docs/`, executable contracts in types and tests, and pull-based rationale, evidence, synthesis, and plans in `kb/`.
- Run `bun run kb:check:lane` in an independent KB lane. The integrating agent runs `bun run kb:refresh` and `bun run kb:check`.
- Run `bun run check` before handoff. Its package smoke must use genuine Node 24 for the pure parser, Bun for the launcher, and installed-consumer typechecks under Bundler and NodeNext.
- Treat a `v*` tag as an irreversible release request. Obtain explicit confirmation for the exact version and commit, confirm repository-level immutable releases, and let the read-only verification job succeed before its write-scoped publisher creates the Release. Never move or recreate a release tag.
