# Architecture

## Package boundary

`@hraness/convex` owns two stable, product-neutral seams. The root parser turns untrusted public configuration into a discriminated deployment state. The explicit `@hraness/convex/vercel-build` subpath owns Vercel target planning and the Bun subprocess boundary.

Products retain deployment names, scripts, schemas, routes, backend functions, generated clients, and provider configuration. The package does not depend on product code or coordinate consumer upgrades.

## Runtime boundary

The parser is portable ESM and has no framework or Convex SDK dependency. The build launcher is Bun tooling because it starts Bun and Convex commands and supports direct execution through `import.meta.main`.

Planning functions are pure. Launch functions accept an injected subprocess launcher so tests can prove commands and environment handling without starting a process or contacting a provider.

## Safety model

Production, Preview, local development, and unrecognized Vercel runtimes are separate states. Production requires exact agreement among the provider markers, the source-bound deployment name, and the production deploy key. Preview is application-only and rejects any deployment credential, including an empty value. Unrecognized provider states fail closed before local fallback.

The application build receives a fresh environment record with every Convex deployment selector removed. The generated Vercel hostname is parsed as provider input and exposed only as display evidence.
