import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");
const readme = await readFile(resolve(repositoryRoot, "README.md"), "utf8");
const manifest = JSON.parse(
  await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
) as { readonly version: string };

test("README names the installable package", () => {
  expect(readme.startsWith("# @hraness/convex\n")).toBe(true);
});

test("README table cells escape pipes inside code spans", () => {
  for (const line of readme.split("\n")) {
    if (!line.startsWith("|")) continue;
    for (const span of line.matchAll(/`[^`]*`/gu)) {
      expect(span[0], `unescaped pipe splits a table cell: ${line}`).not.toMatch(/(?<!\\)\|/u);
    }
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

  const fences = readme.match(/^```/gmu)?.length ?? 0;
  expect(fences).toBeGreaterThan(0);
  expect(fences % 2).toBe(0);
  expect(readme).not.toContain("—");
});
