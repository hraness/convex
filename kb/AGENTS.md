# Contents

- `index.md` is the authored vault front door.
- `notes/` holds maintained concepts and reusable synthesis.
- `plans/` holds proposed through terminal implementation and migration records.
- `articles/` holds self-contained captured sources and local assets.
- `riffs/` holds cleaned first-person source notes.
- `scopes/` holds curated repository-context hubs.

# Guidelines

- Keep Markdown and Git authoritative. Catalogs, backlinks, graph reports, indexes, and history projections are derived.
- Put reusable current synthesis in `notes/`, coordination records in `plans/`, captures in `articles/`, first-person source material in `riffs/`, and repository mappings in `scopes/`.
- Preserve authored front matter, links, typed relationships, and note voice unless evidence supports a specific change.
- Run `bun run kb:check:lane` during parallel work. After material edits, run `bun run kb:refresh`, review bounded percolation findings in context, and finish with `bun run kb:check`.
- Do not duplicate mandatory repository rules from `AGENTS.md` or current procedures from `docs/`.
