# @hraness/convex

Refuse ambiguous Convex deployments before a Vercel build can run them.

`@hraness/convex` turns public deployment configuration into typed states, then
plans Production, Preview, and local builds without letting a Preview carry a
deployment credential. It does not replace the Convex SDK or choose a
deployment for your application.

## Install

Pin the immutable release tag:

```json
{
  "dependencies": {
    "@hraness/convex": "github:hraness/convex#v0.1.0"
  }
}
```

The root parser is built ESM for Node.js 24 or newer. The explicit
`./vercel-build` entry uses Bun 1.3.14 because it launches the checked build
subprocess.

## Inspect one deployment value

Parse an untrusted environment value before you construct a Convex client:

```ts
import { parseConvexDeployment } from "@hraness/convex";

const ready = parseConvexDeployment("https://quiet-moth-123.convex.cloud");
const invalid = parseConvexDeployment(
  "https://quiet-moth-123.convex.cloud/admin?token=secret",
);

console.log(ready);
console.log(invalid);
```

The exact results keep both the usable origin and the reason a foreign value
was rejected:

```json
{
  "kind": "ready",
  "origin": "https://quiet-moth-123.convex.cloud",
  "transport": "cloud",
  "url": "https://quiet-moth-123.convex.cloud"
}
{
  "input": "https://quiet-moth-123.convex.cloud/admin?token=secret",
  "kind": "invalid",
  "message": "Use the deployment origin without a path or query.",
  "reason": "not-an-origin"
}
```

Blank and non-string inputs return `{ "kind": "missing" }`. The parser accepts
bare HTTPS origins and HTTP origins on the exact loopback hosts `localhost`,
`127.0.0.1`, and `[::1]`. It rejects credentials, paths, queries, fragments,
malformed URLs, and remote HTTP.

## Plan a Preview without a deploy key

The planner is pure. You can inspect the decision before any subprocess runs:

```ts
import { planVercelConvexBuild } from "@hraness/convex/vercel-build";

const preview = {
  CONVEX_PRODUCTION_DEPLOYMENT_NAME: "quiet-moth-123",
  NEXT_PUBLIC_CONVEX_SITE_URL: "https://quiet-moth-123.convex.site",
  NEXT_PUBLIC_CONVEX_URL: "https://quiet-moth-123.convex.cloud",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_TARGET_ENV: "preview",
  VERCEL_URL: "example-feature-team.vercel.app",
} as const;

console.log(planVercelConvexBuild(preview));
console.log(planVercelConvexBuild({ ...preview, CONVEX_DEPLOY_KEY: "" }));
```

```json
{
  "environmentMode": "preview-app-only",
  "kind": "run",
  "surfaceOrigin": "https://example-feature-team.vercel.app"
}
{
  "kind": "refuse",
  "reason": "preview-deploy-key-present"
}
```

An empty deploy key still counts as a credential. Preview must use the exact
checked production cloud and site URLs, and `VERCEL_URL` must be one bare,
lowercase `vercel.app` hostname.

## Run the checked build

Bind the production deployment name in consumer source, then call the launcher:

```ts
import { runVercelConvexBuild } from "@hraness/convex/vercel-build";

process.exitCode = await runVercelConvexBuild({
  expectedProductionDeploymentName: "quiet-moth-123",
});
```

The launcher makes the same plan, reports an exact refusal reason to `stderr`,
and exits with status `1` before it starts a child process when the plan is not
safe:

```text
Vercel Convex build refused: production-deployment-mismatch.
```

Use the built entry directly when Vercel needs a command:

```sh
bun ./node_modules/@hraness/convex/dist/vercel-build.js \
  --production-deployment quiet-moth-123
```

Add `--run-app-build` only for the nested application-build entry.

## Three runtime modes

| Runtime | Checked result | Child command |
| --- | --- | --- |
| Vercel Production | Deploy only when the provider target, source-bound name, and `prod:<name>|…` key agree | `bun x convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd "bun run build"` |
| Built-in Vercel Preview | Read the exact production deployment as an application-only client; reject every deploy key and token | `bun run build:app` |
| Local development | Keep the normal Convex deploy path, but reject production markers and production-class keys | The same Convex deploy command |

An unrecognized Vercel runtime refuses with `unsupported-vercel-runtime`.
There is no fallback from an ambiguous provider state into local behavior.

## Choose an interface

| Interface | Use it for | Side effects |
| --- | --- | --- |
| `@hraness/convex` | Parse one public deployment URL into `missing`, `invalid`, or `ready` | None |
| `planVercelConvexBuild` and `planVercelAppBuild` | Inspect a build decision or test synthetic environments | None |
| `runVercelConvexBuild` and `runVercelAppBuild` | Apply a checked plan through Bun | Starts one injected or Bun subprocess after a `run` plan |
| `dist/vercel-build.js` | Use the same checked launcher as a Vercel build command | Same launcher boundary |

## Trust boundary

This package owns configuration validation and build-target classification.
Your product still owns:

- the production deployment name in reviewed source;
- Convex functions, schema, generated clients, and application routes;
- provider configuration and credentials;
- the application build command and its output;
- product identity, authentication, and authorization.

The generated Vercel hostname becomes
`NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN` for display evidence only. It is not an
authentication, routing, or authorization authority. Every Convex deployment
selector is removed before the nested application build.

## Compatibility and artifact facts

| Fact | Current release |
| --- | --- |
| Install identity | `v0.1.0`, matching package version `0.1.0` |
| Runtime dependencies | Zero |
| Module format | Side-effect-free ESM |
| Root parser runtime | Node.js 24 or newer, Bun-compatible |
| Build launcher runtime | Bun 1.3.14 |
| Built parser | `dist/index.js`, 844 bytes |
| Built launcher | `dist/vercel-build.js`, 5,646 bytes |
| Package boundary | Nine files; root parser and `./vercel-build` are the only exports |

The `v0.1.0` tag is reachable from current `main`, and the tagged
`package.json` reports version `0.1.0`. The release workflow checks the tag,
complete repository gate, package inventory, genuine Node import, Bun launcher,
and installed Bundler and NodeNext consumers before it creates an immutable
GitHub Release.

## API map

### Root export

- `parseConvexDeployment(value)` returns `ConvexDeployment`.
- `ConvexDeployment` is the `missing | invalid | ready` discriminated union.

### `./vercel-build` export

- `parseVercelPreviewSurfaceOrigin(value)` validates one generated Vercel host.
- `planVercelConvexBuild(environment)` plans the full Convex-aware build.
- `planVercelAppBuild(environment)` plans the nested application build.
- `runVercelConvexBuild(options)` applies the full plan.
- `runVercelAppBuild(options)` applies the application-only plan.
- `productionDeploymentNameEnvironmentVariable` names the source-bound marker.
- `previewSurfaceOriginEnvironmentVariable` names the public Preview surface.
- `VercelConvexBuildPlan`, `VercelAppBuildPlan`,
  `VercelConvexBuildRefusal`, `VercelConvexBuildEnvironment`, and
  `VercelConvexBuildLauncher` describe the public planning and launch seams.

## Development

Install Bun 1.3.14 and a genuine Node.js 24 runtime, then run:

```sh
bun install --frozen-lockfile
bun run check
```

The complete check validates the public inventory and repository boundary,
lints and typechecks the source, rebuilds committed ESM output, runs example and
property tests, packs the artifact, imports the parser with genuine Node 24,
exercises the launcher with Bun and fake subprocesses, and typechecks installed
consumers under Bundler and NodeNext resolution.

## License

MIT
