# @hraness/convex

Validated Convex deployment configuration and fail-closed Vercel build tooling.

The root export parses untrusted deployment URLs into explicit missing, invalid, or ready states. The `./vercel-build` export plans and launches Bun-based Convex and application builds without giving Preview deployments a deployment credential.

## Install

Pin the immutable release tag:

```json
{
  "dependencies": {
    "@hraness/convex": "github:hraness/convex#v0.1.0"
  }
}
```

Use Bun 1.3.14 for the build launcher. The root parser's built ESM runtime supports Node.js 24 or newer.

## Parse a deployment

```ts
import { parseConvexDeployment } from "@hraness/convex";

const deployment = parseConvexDeployment(process.env.NEXT_PUBLIC_CONVEX_URL);

if (deployment.kind === "ready") {
  console.log(deployment.url);
}
```

The parser accepts bare HTTPS origins and HTTP origins on exact loopback hostnames. It rejects credentials, paths, queries, fragments, malformed URLs, and remote HTTP.

## Run a Vercel build

Keep the production deployment name in consumer source and pass it to the launcher:

```ts
import { runVercelConvexBuild } from "@hraness/convex/vercel-build";

process.exitCode = await runVercelConvexBuild({
  expectedProductionDeploymentName: "quiet-moth-123",
});
```

The launcher has three modes:

- Vercel Production deploys Convex only when the source-bound deployment name, production deploy key, and provider target agree.
- Built-in Vercel Preview runs `bun run build:app` without Convex deployment selectors. It requires exact public URLs for the checked production deployment and exposes only the generated Vercel surface origin to the application build.
- Local development retains `convex deploy` behavior, while production-class keys and production markers fail outside the checked Production target.

The package never supplies a production deployment name. Consumers must pass `expectedProductionDeploymentName`, or invoke the built module with `--production-deployment <name>`. Add `--run-app-build` only for the nested application-build entry.

## Development

Install Bun 1.3.14 and a genuine Node.js 24 runtime, then run:

```sh
bun install --frozen-lockfile
bun run check
```

The complete check validates the public inventory and repository boundary, lints and typechecks the source, rebuilds committed ESM output, runs deterministic and property tests, packs the artifact, imports the parser with genuine Node 24, exercises the launcher with Bun and fake subprocesses, and typechecks an installed consumer under Bundler and NodeNext resolution.

## License

MIT
