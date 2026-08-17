import { expect, test } from "bun:test";
import fc from "fast-check";

import {
  parseVercelPreviewSurfaceOrigin,
  planVercelConvexBuild,
} from "./vercel-build.js";

test("foreign surface host input is total and only a bare lowercase Vercel hostname succeeds", () => {
  fc.assert(fc.property(fc.option(fc.string(), { nil: undefined }), (value) => {
    const parsed = parseVercelPreviewSurfaceOrigin(value);
    if (!parsed.ok) return;
    expect(value).toMatch(/^[a-z0-9.-]+\.vercel\.app$/);
    expect(parsed.origin).toBe(`https://${String(value)}`);
  }));
});

test("Preview never runs when either deployment credential is present", () => {
  fc.assert(fc.property(
    fc.string(),
    fc.boolean(),
    (credential, useToken) => {
      const key = useToken ? "CONVEX_DEPLOYMENT_TOKEN" : "CONVEX_DEPLOY_KEY";
      const plan = planVercelConvexBuild({
        CONVEX_PRODUCTION_DEPLOYMENT_NAME: "quiet-moth-123",
        NEXT_PUBLIC_CONVEX_SITE_URL: "https://quiet-moth-123.convex.site",
        NEXT_PUBLIC_CONVEX_URL: "https://quiet-moth-123.convex.cloud",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        VERCEL_TARGET_ENV: "preview",
        VERCEL_URL: "quiet-branch-team.vercel.app",
        [key]: credential,
      });
      expect(plan).toEqual({
        kind: "refuse",
        reason: useToken
          ? "preview-deployment-token-present"
          : "preview-deploy-key-present",
      });
    },
  ));
});

test("a production key never authorizes a non-Production Vercel target", () => {
  fc.assert(fc.property(
    fc.constantFrom(undefined, "development", "preview", "staging", "other"),
    fc.string({ minLength: 1 }),
    (target, secret) => {
      const plan = planVercelConvexBuild({
        CONVEX_DEPLOY_KEY: `prod:quiet-moth-123|${secret.replaceAll(/\s|\|/gu, "x")}`,
        CONVEX_PRODUCTION_DEPLOYMENT_NAME: "quiet-moth-123",
        VERCEL_ENV: target,
        VERCEL_TARGET_ENV: target,
      });
      expect(plan.kind).toBe("refuse");
    },
  ));
});

test("every unrecognized Vercel runtime fails closed regardless of leaked production selectors", () => {
  fc.assert(fc.property(
    fc.option(fc.string(), { nil: undefined }),
    fc.option(fc.string(), { nil: undefined }),
    fc.boolean(),
    fc.boolean(),
    (target, vercelEnvironment, leakMarker, leakKey) => {
      fc.pre(
        !(target === "production" && vercelEnvironment === "production")
        && !(target === "preview" && vercelEnvironment === "preview"),
      );
      const plan = planVercelConvexBuild({
        CONVEX_DEPLOY_KEY: leakKey
          ? "prod:quiet-moth-123|secret"
          : undefined,
        CONVEX_PRODUCTION_DEPLOYMENT_NAME: leakMarker
          ? "quiet-moth-123"
          : undefined,
        VERCEL: "1",
        VERCEL_ENV: vercelEnvironment,
        VERCEL_TARGET_ENV: target,
      });
      expect(plan.kind).toBe("refuse");
    },
  ));
});

test("planning never mutates a caller-owned environment", () => {
  fc.assert(fc.property(
    fc.dictionary(
      fc.string(),
      fc.option(fc.string(), { nil: undefined }),
    ),
    (generated) => {
      const environment = { ...generated };
      const before = { ...environment };
      planVercelConvexBuild(environment);
      expect(environment).toEqual(before);
    },
  ));
});
