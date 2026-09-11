import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import fc from "fast-check";
import { assertPublicIdentity } from "../scripts/public-identity-boundary.js";

const guide = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
const startMarker = "<!-- oompa-local-efficiency:start -->";
const endMarker = "<!-- oompa-local-efficiency:end -->";
const block = guide.slice(guide.indexOf(startMarker), guide.indexOf(endMarker) + endMarker.length + 1);
// This known collision is ordinary text in the reviewed public policy.
// No other prohibited identity needs to be reconstructed for these proofs.
const publicCollision = ["ac", "counts"].join("");

describe("public managed policy boundary", () => {
  test("admits the exact root block while scanning ordinary surrounding guidance", () => {
    expect(() => { assertPublicIdentity("AGENTS.md", guide); }).not.toThrow();
    expect(() => { assertPublicIdentity("AGENTS.md", `# Guide\n\n${block}\nKeep tests deterministic.\n`); }).not.toThrow();
  });

  test("refuses single-byte edits and line-ending drift inside the reviewed block", () => {
    expect(() => { assertPublicIdentity("AGENTS.md", block.replace("Treat", "treat")); }).toThrow("reviewed public managed policy");
    expect(() => { assertPublicIdentity("AGENTS.md", block.replaceAll("\n", "\r\n")); }).toThrow("reviewed public managed policy");
    expect(() => { assertPublicIdentity("AGENTS.md", block.slice(0, -1)); }).toThrow("reviewed public managed policy");
  });

  test("rejects generated one-byte mutations across the entire block", () => {
    const bytes = Buffer.from(block);
    fc.assert(fc.property(fc.integer({ min: 0, max: bytes.length - 1 }), (index) => {
      const changed = Buffer.from(bytes);
      changed[index] = (changed[index] ?? 0) ^ 1;
      expect(() => { assertPublicIdentity("AGENTS.md", changed.toString("utf8")); }).toThrow("reviewed public managed policy");
    }), { seed: 20260911, numRuns: 128 });
  });

  test("refuses missing, duplicate, reversed and malformed markers", () => {
    for (const contents of [
      "# Guide\n",
      `${block}${block}`,
      block.replace(startMarker, ""),
      block.replace(endMarker, ""),
      `${endMarker}${block.slice(startMarker.length, -(endMarker.length + 1))}${startMarker}\n`,
      block.replace(startMarker, "<!-- OOMPA-local-efficiency:start -->"),
      block.replace(startMarker, "<!--oompa-local-efficiency:start -->"),
      block.replace(endMarker, "<!-- oompa-local-efficiency end -->"),
      ` ${block}`,
      `${block}<!-- oompa-local-efficiency:start`,
    ]) {
      expect(() => { assertPublicIdentity("AGENTS.md", contents); }).toThrow("reviewed public managed policy");
    }
  });

  test("gives copied blocks and path variants no exemption", () => {
    for (const path of ["README.md", "docs/AGENTS.md", "./AGENTS.md", "AGENTS.MD", "nested\\AGENTS.md"]) {
      expect(() => { assertPublicIdentity(path, block); }).toThrow("private product identity");
    }
    expect(() => { assertPublicIdentity("README.md", "Public package guide.\n"); }).not.toThrow();
  });

  test("retains the prohibited identity scan before and after the exact block", () => {
    expect(() => { assertPublicIdentity("AGENTS.md", `${publicCollision}\n${block}`); }).toThrow("private product identity");
    expect(() => { assertPublicIdentity("AGENTS.md", `${block}${publicCollision}\n`); }).toThrow("private product identity");
    expect(() => { assertPublicIdentity("AGENTS.md", `${block}${publicCollision.toUpperCase()}\n`); }).toThrow("private product identity");
    expect(() => { assertPublicIdentity("README.md", publicCollision); }).toThrow("private product identity");
  });
});
