# Release procedure

A `v*` tag requests an immutable GitHub Release. Creating the tag is irreversible after the release workflow succeeds.

1. Confirm the intended stable version equals `package.json` and is greater than every existing stable release.
2. Confirm `main` is current, the stable `Required` check passed for its exact commit, and no pull request or review thread remains unresolved.
3. Obtain explicit maintainer confirmation for the exact version and commit immediately before creating the tag.
4. Create `v<version>` on that exact `main` commit and push only the tag.
5. Verify the Release workflow, the non-draft non-prerelease immutable GitHub Release, and the Latest marker before starting another release.

Never move or recreate a release tag. Never run the write-scoped publisher without the read-only verification job.
