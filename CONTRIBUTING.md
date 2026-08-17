# Contributing

Open an issue before changing a public state, refusal reason, environment variable, subprocess argument, or export. These values are compatibility and security contracts.

Use Bun 1.3.14 and Node 24. Install dependencies and run the complete local gate:

```sh
bun install --frozen-lockfile
bun run check
```

Add a readable deterministic regression for each behavior change. Add property tests for general parser and planner laws. Tests must use fake subprocess launchers and synthetic values; do not add credentials, private repository names, live deployment URLs, or network calls.
