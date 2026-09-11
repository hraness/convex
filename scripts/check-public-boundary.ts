import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { assertPublicIdentity } from "./public-identity-boundary.js";

const repositoryRoot = resolve(import.meta.dir, "..");
const ignoredDirectories = new Set([".git", "dist", "node_modules"]);
const textExtensions = new Set(["", ".json", ".md", ".mjs", ".ts", ".yml", ".yaml"]);
const localPathMarker = ["/", "Users", "/"].join("");
const writeCapabilities = [
  ["packages", "write"].join(": "),
  ["id-token", "write"].join(": "),
  ["pull-requests", "write"].join(": "),
  ["npm", "publish"].join(" "),
];

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await files(path));
    else if (entry.isFile() && textExtensions.has(extname(entry.name))) paths.push(path);
  }
  return paths;
}

const repositoryFiles = await files(repositoryRoot);
if (!repositoryFiles.includes(join(repositoryRoot, "AGENTS.md"))) {
  throw new Error("root AGENTS.md is required for public policy validation");
}
for (const path of repositoryFiles) {
  const contents = await readFile(path, "utf8");
  const repositoryPath = relative(repositoryRoot, path);
  if (contents.includes(localPathMarker)) {
    throw new Error(`${repositoryPath} contains an absolute local-user path`);
  }
  assertPublicIdentity(repositoryPath, contents);
  if (repositoryPath.startsWith(`${join(".github", "workflows")}/`)) {
    for (const capability of writeCapabilities) {
      if (contents.includes(capability)) {
        throw new Error(`${repositoryPath} contains mutating capability ${capability}`);
      }
    }
    if (
      contents.includes(["contents", "write"].join(": "))
      && repositoryPath !== ".github/workflows/release.yml"
    ) {
      throw new Error(`${repositoryPath} has unexpected contents write access`);
    }
  }
}

const releaseWorkflow = await readFile(
  join(repositoryRoot, ".github/workflows/release.yml"),
  "utf8",
);
for (const required of [
  "needs: verify",
  "verified_tag:",
  "contents: write",
  "gh release create",
  "isImmutable",
]) {
  if (!releaseWorkflow.includes(required)) {
    throw new Error(`release workflow is missing ${required}`);
  }
}
if ([...releaseWorkflow.matchAll(/contents: write/gu)].length !== 1) {
  throw new Error("release workflow must scope contents write to one publisher");
}

const manifest = JSON.parse(
  await readFile(join(repositoryRoot, "package.json"), "utf8"),
) as {
  dependencies?: unknown;
  exports?: unknown;
  files?: unknown;
  peerDependencies?: unknown;
  sideEffects?: unknown;
};
const expectedExports = {
  ".": {
    types: "./src/index.ts",
    import: "./dist/index.js",
    default: "./dist/index.js",
  },
  "./vercel-build": {
    types: "./src/vercel-build.ts",
    import: "./dist/vercel-build.js",
    default: "./dist/vercel-build.js",
  },
};
const expectedFiles = [
  "dist",
  "src/index.ts",
  "src/vercel-build.ts",
  "LICENSE",
  "README.md",
];
if (JSON.stringify(manifest.exports) !== JSON.stringify(expectedExports)) {
  throw new Error("package exports must preserve the root and vercel-build seams");
}
if (JSON.stringify(manifest.files) !== JSON.stringify(expectedFiles)) {
  throw new Error("package file inventory must contain only the reviewed public surface");
}
if (manifest.dependencies !== undefined || manifest.peerDependencies !== undefined) {
  throw new Error("package public runtime must remain dependency-free");
}
if (manifest.sideEffects !== false) {
  throw new Error("package must declare a side-effect-free public module surface");
}

for (const sourcePath of ["src/index.ts", "src/vercel-build.ts"] as const) {
  const source = await readFile(join(repositoryRoot, sourcePath), "utf8");
  for (const match of source.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/gu)) {
    if (!match[1]?.endsWith(".js")) {
      throw new Error(`${sourcePath} has a relative import without a .js extension`);
    }
  }
}
