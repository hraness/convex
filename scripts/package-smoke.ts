import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

const packageName = "@hraness/convex";
const repository = process.cwd();
const work = await mkdtemp(join(tmpdir(), "hraness-convex-package-smoke-"));
const cache = join(work, "cache");
const temporary = join(work, "tmp");
const environment = {
  ...process.env,
  BUN_INSTALL_CACHE_DIR: cache,
  BUN_TMPDIR: temporary,
  TMPDIR: temporary,
};

async function run(command: string[], cwd: string): Promise<void> {
  const child = Bun.spawn(command, {
    cwd,
    env: environment,
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed (${String(exitCode)}): ${command.join(" ")}`);
  }
}

function resolveGenuineNodeExecutable(): string {
  const executableName = process.platform === "win32" ? "node.exe" : "node";
  const identityProbe = [
    "if (typeof Bun !== 'undefined'",
    "|| process.versions.bun !== undefined",
    "|| !process.versions.node?.startsWith('24.')) process.exit(1)",
  ].join(" ");
  const candidates = [...new Set(
    (process.env.PATH ?? "")
      .split(delimiter)
      .filter((directory) => directory.length > 0)
      .map((directory) => resolve(directory, executableName)),
  )];

  for (const executable of candidates) {
    try {
      const probe = Bun.spawnSync([
        executable,
        "--input-type=commonjs",
        "-e",
        identityProbe,
      ], {
        env: environment,
        stderr: "ignore",
        stdin: "ignore",
        stdout: "ignore",
      });
      if (probe.exitCode === 0) return executable;
    } catch {
      // Continue past absent, inaccessible, or incompatible PATH candidates.
    }
  }

  throw new Error("package smoke requires a genuine Node 24 executable on PATH");
}

try {
  const archive = join(work, "package.tgz");
  const consumer = join(work, "consumer");
  await mkdir(cache, { mode: 0o700 });
  await mkdir(temporary, { mode: 0o700 });
  await mkdir(consumer, { mode: 0o700 });
  const nodeExecutable = resolveGenuineNodeExecutable();

  await run([
    process.execPath,
    "pm",
    "pack",
    "--filename",
    archive,
    "--ignore-scripts",
    "--quiet",
  ], repository);
  await writeFile(
    join(consumer, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
  );
  await run([
    process.execPath,
    "add",
    archive,
    "--ignore-scripts",
  ], consumer);

  const installedRoot = join(consumer, "node_modules", "@hraness", "convex");
  for (const excluded of [
    "src/index.test.ts",
    "src/index.property.test.ts",
    "src/vercel-build.test.ts",
    "src/vercel-build.property.test.ts",
    "scripts",
    "kb",
  ]) {
    if (await Bun.file(join(installedRoot, excluded)).exists()) {
      throw new Error(`installed package must not contain ${excluded}`);
    }
  }

  await writeFile(
    join(consumer, "node-smoke.mjs"),
    [
      'import assert from "node:assert/strict";',
      `const { parseConvexDeployment } = await import(${JSON.stringify(packageName)});`,
      'assert.equal(typeof globalThis.Bun, "undefined");',
      'assert.deepEqual(parseConvexDeployment(" https://quiet-moth-123.convex.cloud/ "), {',
      '  kind: "ready",',
      '  origin: "https://quiet-moth-123.convex.cloud",',
      '  transport: "cloud",',
      '  url: "https://quiet-moth-123.convex.cloud",',
      '});',
      "",
    ].join("\n"),
  );
  await run([nodeExecutable, "./node-smoke.mjs"], consumer);

  await writeFile(
    join(consumer, "bun-smoke.ts"),
    [
      'import assert from "node:assert/strict";',
      'import { planVercelConvexBuild, runVercelConvexBuild } from "@hraness/convex/vercel-build";',
      'assert.equal(typeof Bun, "object");',
      'assert.deepEqual(planVercelConvexBuild({}), { environmentMode: "deploy-convex", kind: "run" });',
      'const commands: string[][] = [];',
      'const code = await runVercelConvexBuild({',
      '  environment: {},',
      '  expectedProductionDeploymentName: "quiet-moth-123",',
      '  launch: (command) => {',
      '    commands.push([...command]);',
      '    return { exited: Promise.resolve(0) };',
      '  },',
      '});',
      'assert.equal(code, 0);',
      'assert.deepEqual(commands[0], [process.execPath, "x", "convex", "deploy", "--cmd-url-env-var-name", "NEXT_PUBLIC_CONVEX_URL", "--cmd", "bun run build"]);',
      "",
    ].join("\n"),
  );
  await run([process.execPath, "run", "./bun-smoke.ts"], consumer);

  await writeFile(
    join(consumer, "index.ts"),
    [
      'import { parseConvexDeployment, type ConvexDeployment } from "@hraness/convex";',
      'import {',
      '  planVercelConvexBuild,',
      '  runVercelAppBuild,',
      '  type VercelConvexBuildEnvironment,',
      '  type VercelConvexBuildLauncher,',
      '} from "@hraness/convex/vercel-build";',
      'const parsed: ConvexDeployment = parseConvexDeployment("https://quiet-moth-123.convex.cloud");',
      'const environment: VercelConvexBuildEnvironment = {};',
      'const plan = planVercelConvexBuild(environment);',
      'const launch: VercelConvexBuildLauncher = () => ({ exited: Promise.resolve(0) });',
      'void runVercelAppBuild({ environment, expectedProductionDeploymentName: "quiet-moth-123", launch });',
      'void [parsed, plan];',
      "",
    ].join("\n"),
  );
  const sharedCompilerOptions = {
    target: "ES2024",
    lib: ["ES2024", "DOM"],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    typeRoots: [join(repository, "node_modules", "@types")],
    types: ["bun", "node"],
  };
  await writeFile(
    join(consumer, "tsconfig.bundler.json"),
    `${JSON.stringify({
      compilerOptions: {
        ...sharedCompilerOptions,
        module: "Preserve",
        moduleResolution: "Bundler",
      },
      include: ["index.ts"],
    }, null, 2)}\n`,
  );
  await writeFile(
    join(consumer, "tsconfig.nodenext.json"),
    `${JSON.stringify({
      compilerOptions: {
        ...sharedCompilerOptions,
        module: "NodeNext",
        moduleResolution: "NodeNext",
      },
      include: ["index.ts"],
    }, null, 2)}\n`,
  );
  const typescriptExecutable = join(repository, "node_modules", "typescript", "bin", "tsc");
  await run([nodeExecutable, typescriptExecutable, "-p", "./tsconfig.bundler.json"], consumer);
  await run([nodeExecutable, typescriptExecutable, "-p", "./tsconfig.nodenext.json"], consumer);
} finally {
  await rm(work, { force: true, recursive: true });
}
