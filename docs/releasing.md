# Release procedure

A `v*` tag requests an immutable GitHub Release. Creating the tag is irreversible after the release workflow succeeds.

1. Confirm the intended stable version equals `package.json` and is greater than every existing stable release.
2. Confirm `main` is current, the stable `Required` check passed for its exact commit, and no pull request or review thread remains unresolved.
3. Confirm that the release request covers the exact version and commit. Task-level delivery authorization is sufficient; a second confirmation is not required.
4. Once `CI` passes on that `main` commit, `.github/workflows/auto-tag.yml` creates the annotated `v<version>` tag through the `hraness-release-tagger` GitHub App. If it did not, create `v<version>` on that exact commit and push only the tag.
5. Verify the Release workflow, the non-draft non-prerelease immutable GitHub Release, and the Latest marker before starting another release.

Never move or recreate a release tag. Never run the write-scoped publisher without the read-only verification job.

The public boundary check allows one write grant outside `release.yml`: the `permission-contents: write` input of the single `create-github-app-token` step in `auto-tag.yml`. That workflow itself stays `contents: read`.
