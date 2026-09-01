import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");
const readme = await readFile(resolve(repositoryRoot, "README.md"), "utf8");
const manifest = JSON.parse(
  await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
) as { readonly version: string };

test("README leads from the result through proof, interfaces, and boundary", () => {
  const headings = [
    "# @hraness/convex",
    "## Install",
    "## Inspect one deployment value",
    "## Plan a Preview without a deploy key",
    "## Run the checked build",
    "## Three runtime modes",
    "## Choose an interface",
    "## Trust boundary",
    "## Compatibility and artifact facts",
    "## API map",
    "## Development",
  ];

  let previous = -1;
  for (const heading of headings) {
    const index = readme.indexOf(heading);
    expect(index).toBeGreaterThan(previous);
    previous = index;
  }
});

test("README install, evidence, and release identity stay exact", () => {
  expect(readme).toContain(
    `"@hraness/convex": "github:hraness/convex#v${manifest.version}"`,
  );
  expect(readme).toContain('"reason": "not-an-origin"');
  expect(readme).toContain('"reason": "preview-deploy-key-present"');
  expect(readme).toContain(
    "Vercel Convex build refused: production-deployment-mismatch.",
  );
  expect(readme).toContain("`dist/index.js`, 844 bytes");
  expect(readme).toContain("`dist/vercel-build.js`, 5,646 bytes");
  expect(readme).toContain("Package boundary | Nine files");
});

test("README maps every public symbol and keeps its Markdown closed", () => {
  for (const symbol of [
    "parseConvexDeployment",
    "ConvexDeployment",
    "parseVercelPreviewSurfaceOrigin",
    "planVercelConvexBuild",
    "planVercelAppBuild",
    "runVercelConvexBuild",
    "runVercelAppBuild",
    "productionDeploymentNameEnvironmentVariable",
    "previewSurfaceOriginEnvironmentVariable",
    "VercelConvexBuildPlan",
    "VercelAppBuildPlan",
    "VercelConvexBuildRefusal",
    "VercelConvexBuildEnvironment",
    "VercelConvexBuildLauncher",
  ]) {
    expect(readme).toContain(symbol);
  }

  expect(readme.match(/^```/gmu)?.length ?? 0).toBe(18);
  expect(readme).not.toContain("—");
});
