---
title: Fail-closed build planning
type: concept
tags:
  - builds
  - credentials
  - security
  - vercel
repository_scopes:
  - src/vercel-build.ts
  - src/vercel-build.test.ts
  - src/vercel-build.property.test.ts
---

# Fail-closed build planning

A build command is safe only when provider state is classified before a subprocess starts. Production, Preview, local development, and unrecognized Vercel runtimes therefore produce explicit plans or refusal reasons. An unrecognized provider runtime cannot fall through to permissive local behavior.

Production authority depends on agreement among three independent inputs: exact Vercel target markers, a production deployment name supplied from consumer source, and the deployment name encoded by a production deploy key. No one input grants authority alone. A deployment token is refused in that path so the supported credential shape stays singular.

Preview never deploys Convex. It rejects every deployment credential by presence, including an empty value, checks that public cloud and site URLs identify the declared production deployment, validates the generated Vercel hostname, and launches only the application build. Before launch, a fresh child environment drops the key, token, and deployment selector.

Pure planning functions make the state machine inspectable. Injected fake launchers let deterministic and property tests prove command and environment behavior without provider access. This evidence covers local logic, not live Vercel settings or Convex resources.

## Related

[[repository-seams|Repository seams]] keeps provider identities and product commands in each consumer.
