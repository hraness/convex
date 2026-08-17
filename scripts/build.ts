import { rm } from "node:fs/promises";

await rm("./dist", { force: true, recursive: true });

for (const [entrypoint, target] of [
  ["./src/index.ts", "node"],
  ["./src/vercel-build.ts", "bun"],
] as const) {
  const result = await Bun.build({
    entrypoints: [entrypoint],
    format: "esm",
    minify: true,
    outdir: "./dist",
    packages: "external",
    root: "./src",
    sourcemap: "external",
    splitting: false,
    target,
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`Bun failed to build ${entrypoint}`);
  }
}
