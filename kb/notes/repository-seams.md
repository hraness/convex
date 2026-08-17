---
title: Repository seams
type: concept
tags:
  - architecture
  - dependencies
  - repositories
repository_scopes:
  - AGENTS.md
  - package.json
  - portfolio-inventory.json
  - src
---

# Repository seams

`@hraness/convex` owns two stable interfaces already shared by several independent applications: deployment-origin parsing and fail-closed Vercel build planning. Consumers retain deployment identities, Convex functions and schemas, generated clients, application commands, and provider resources. That boundary keeps high-churn product work out of the package.

The root export remains portable and side-effect free. Bun-specific launch behavior stays behind the explicit `./vercel-build` subpath. The package has no Convex SDK, framework, design-system, or product dependency because neither public seam needs one.

Consumers pin reviewed immutable releases or full commits and validate upgrades on their own schedule. They do not use sibling paths, Git submodules, coordinated branches, or floating `main` references. Another shared interface belongs here only after at least two concrete consumers need the same stable, product-neutral contract.

## Related

[[documentation-ownership|Documentation ownership]] explains where the normative and executable forms of these boundaries live. [[fail-closed-build-planning|Fail-closed build planning]] explains the provider-state model.
