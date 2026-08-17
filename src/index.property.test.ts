import { expect, test } from "bun:test";

import fc from "fast-check";

import { parseConvexDeployment } from "./index.js";

test("property: parsing is total over arbitrary foreign values", () => {
  fc.assert(
    fc.property(fc.anything(), (value) => {
      expect(() => parseConvexDeployment(value)).not.toThrow();
      const deployment = parseConvexDeployment(value);
      expect(["invalid", "missing", "ready"]).toContain(deployment.kind);
      if (typeof value !== "string") expect(deployment).toEqual({ kind: "missing" });
    }),
  );
});

test("property: surrounding whitespace cannot change a deployment result", () => {
  fc.assert(
    fc.property(fc.string(), fc.stringMatching(/^[ \t\n\r]*$/), (value, whitespace) => {
      expect(parseConvexDeployment(`${whitespace}${value}${whitespace}`)).toEqual(
        parseConvexDeployment(value),
      );
    }),
  );
});

test("property: every ready deployment is stable under reparsing", () => {
  fc.assert(
    fc.property(fc.string(), (value) => {
      const deployment = parseConvexDeployment(value);
      if (deployment.kind === "ready") {
        expect(parseConvexDeployment(deployment.url)).toEqual(deployment);
      }
      if (deployment.kind === "invalid") {
        expect(deployment.input).toBe(value.trim());
      }
    }),
  );
});

test("property: generated HTTPS origins canonicalize to their URL origin", () => {
  fc.assert(
    fc.property(fc.domain(), fc.option(fc.integer({ min: 1, max: 65_535 })), (host, port) => {
      const input = `https://${host}${port === null ? "" : `:${String(port)}`}`;
      const deployment = parseConvexDeployment(input);
      expect(deployment).toEqual({
        kind: "ready",
        origin: new URL(input).origin,
        transport: "cloud",
        url: new URL(input).origin,
      });
    }),
  );
});

test("property: loopback HTTP origins stay local and remote HTTP origins stay invalid", () => {
  fc.assert(
    fc.property(
      fc.constantFrom("127.0.0.1", "[::1]", "localhost"),
      fc.integer({ min: 1, max: 65_535 }),
      (host, port) => {
        const input = `http://${host}:${String(port)}`;
        const origin = new URL(input).origin;
        expect(parseConvexDeployment(input)).toEqual({
          kind: "ready",
          origin,
          transport: "local",
          url: origin,
        });
      },
    ),
  );

  fc.assert(
    fc.property(fc.domain(), (host) => {
      expect(parseConvexDeployment(`http://${host}`)).toMatchObject({
        kind: "invalid",
        reason: "insecure-remote",
      });
    }),
  );
});
