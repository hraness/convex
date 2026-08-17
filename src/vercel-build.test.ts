import { describe, expect, test } from "bun:test";

import {
  parseVercelPreviewSurfaceOrigin,
  planVercelAppBuild,
  planVercelConvexBuild,
  previewSurfaceOriginEnvironmentVariable,
  runVercelAppBuild,
  runVercelConvexBuild,
  type VercelConvexBuildEnvironment,
  type VercelConvexBuildLauncher,
} from "./vercel-build.js";

const deployment = "qualified-marmot-22";
const marker = { CONVEX_PRODUCTION_DEPLOYMENT_NAME: deployment } as const;
const productionEnvironment = {
  ...marker,
  CONVEX_DEPLOY_KEY: `prod:${deployment}|secret`,
  VERCEL: "1",
  VERCEL_ENV: "production",
  VERCEL_TARGET_ENV: "production",
} as const;
const previewEnvironment = {
  ...marker,
  NEXT_PUBLIC_CONVEX_SITE_URL: `https://${deployment}.convex.site`,
  NEXT_PUBLIC_CONVEX_URL: `https://${deployment}.convex.cloud`,
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_TARGET_ENV: "preview",
  VERCEL_URL: "example-feature-team.vercel.app",
} as const;

describe("Vercel Convex target plans", () => {
  test("uses the public Preview surface key", () => {
    expect(previewSurfaceOriginEnvironmentVariable).toBe(
      "NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN",
    );
  });

  test("allows only Production to deploy the checked production backend", () => {
    expect(planVercelConvexBuild(productionEnvironment)).toEqual({
      environmentMode: "deploy-convex",
      kind: "run",
    });
    expect(planVercelConvexBuild({
      ...productionEnvironment,
      CONVEX_DEPLOY_KEY: "prod:other-marmot-23|secret",
    })).toEqual({ kind: "refuse", reason: "production-deployment-mismatch" });
    expect(planVercelConvexBuild({
      ...productionEnvironment,
      CONVEX_DEPLOYMENT_TOKEN: "token",
    })).toEqual({ kind: "refuse", reason: "production-deployment-token-present" });
    expect(planVercelConvexBuild({
      ...productionEnvironment,
      CONVEX_PRODUCTION_DEPLOYMENT_NAME: undefined,
    })).toEqual({ kind: "refuse", reason: "missing-production-deployment-name" });
  });

  test("turns built-in Preview into an app-only production client", () => {
    expect(planVercelConvexBuild(previewEnvironment)).toEqual({
      environmentMode: "preview-app-only",
      kind: "run",
      surfaceOrigin: "https://example-feature-team.vercel.app",
    });
    expect(planVercelAppBuild(previewEnvironment)).toEqual({
      kind: "run",
      surfaceOrigin: "https://example-feature-team.vercel.app",
    });
  });

  test("refuses every Preview deployment credential, including an empty value", () => {
    for (const [key, value, reason] of [
      ["CONVEX_DEPLOY_KEY", "", "preview-deploy-key-present"],
      ["CONVEX_DEPLOY_KEY", "preview:team:project|secret", "preview-deploy-key-present"],
      ["CONVEX_DEPLOYMENT_TOKEN", "", "preview-deployment-token-present"],
      ["CONVEX_DEPLOYMENT_TOKEN", "secret", "preview-deployment-token-present"],
    ] as const) {
      expect(planVercelConvexBuild({ ...previewEnvironment, [key]: value })).toEqual({
        kind: "refuse",
        reason,
      });
    }
  });

  test("requires exact production cloud and site URLs in Preview", () => {
    for (const [key, value, reason] of [
      ["NEXT_PUBLIC_CONVEX_URL", undefined, "missing-preview-convex-url"],
      ["NEXT_PUBLIC_CONVEX_URL", "https://other-marmot-23.convex.cloud", "invalid-preview-convex-url"],
      ["NEXT_PUBLIC_CONVEX_SITE_URL", undefined, "missing-preview-convex-site-url"],
      ["NEXT_PUBLIC_CONVEX_SITE_URL", "https://other-marmot-23.convex.site", "invalid-preview-convex-site-url"],
    ] as const) {
      expect(planVercelConvexBuild({ ...previewEnvironment, [key]: value })).toEqual({
        kind: "refuse",
        reason,
      });
    }
  });

  test("refuses every unrecognized Vercel runtime before local fallback", () => {
    for (const environment of [
      { VERCEL: "1" },
      {
        VERCEL: "1",
        VERCEL_ENV: "development",
        VERCEL_TARGET_ENV: "development",
      },
      {
        VERCEL: "1",
        VERCEL_ENV: "development",
        VERCEL_TARGET_ENV: "staging",
      },
      {
        ...marker,
        VERCEL: "1",
        VERCEL_ENV: "development",
        VERCEL_TARGET_ENV: "development",
      },
      {
        CONVEX_DEPLOY_KEY: `prod:${deployment}|secret`,
        VERCEL: "1",
        VERCEL_ENV: "development",
        VERCEL_TARGET_ENV: "development",
      },
    ] as const) {
      expect(planVercelConvexBuild(environment)).toEqual({
        kind: "refuse",
        reason: "unsupported-vercel-runtime",
      });
      expect(planVercelAppBuild(environment)).toEqual({
        kind: "refuse",
        reason: "unsupported-vercel-runtime",
      });
    }

    expect(planVercelConvexBuild({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_TARGET_ENV: "staging",
    })).toEqual({ kind: "refuse", reason: "preview-target-outside-preview" });
  });

  test("keeps local development behavior but rejects production keys outside Production", () => {
    for (const environment of [
      {},
      {
        VERCEL: "0",
        VERCEL_ENV: "development",
        VERCEL_TARGET_ENV: "development",
      },
      {
        VERCEL: "true",
        VERCEL_ENV: "development",
        VERCEL_TARGET_ENV: "custom",
      },
    ]) {
      expect(planVercelConvexBuild(environment)).toEqual({
        environmentMode: "deploy-convex",
        kind: "run",
      });
    }
    expect(planVercelConvexBuild({ CONVEX_DEPLOY_KEY: "prod:quiet-moth-23|secret" }))
      .toEqual({ kind: "refuse", reason: "production-deploy-key-outside-production" });
  });
});

describe("Preview surface origin", () => {
  test("constructs HTTPS only from a bare generated Vercel hostname", () => {
    expect(parseVercelPreviewSurfaceOrigin("project-git-topic-team.vercel.app")).toEqual({
      ok: true,
      origin: "https://project-git-topic-team.vercel.app",
    });
  });

  test("rejects schemes, paths, ports, credentials, uppercase, and foreign hosts", () => {
    for (const value of [
      undefined,
      "",
      "https://project-team.vercel.app",
      "project-team.vercel.app/path",
      "project-team.vercel.app:443",
      "user@project-team.vercel.app",
      "Project-team.vercel.app",
      "project.example.com",
    ]) {
      expect(parseVercelPreviewSurfaceOrigin(value).ok).toBe(false);
    }
  });
});

function recorder(): {
  readonly calls: Array<{
    readonly command: readonly string[];
    readonly environment: Record<string, string | undefined>;
  }>;
  readonly launch: VercelConvexBuildLauncher;
} {
  const calls: Array<{
    readonly command: readonly string[];
    readonly environment: Record<string, string | undefined>;
  }> = [];
  return {
    calls,
    launch: (command, options) => {
      calls.push({ command, environment: options.env });
      return { exited: Promise.resolve(0) };
    },
  };
}

describe("process boundary", () => {
  test("Production launches Convex with a fixed argv and the key only in env", async () => {
    const observed = recorder();
    expect(await runVercelConvexBuild({
      environment: productionEnvironment,
      expectedProductionDeploymentName: deployment,
      launch: observed.launch,
    })).toBe(0);
    expect(observed.calls).toHaveLength(1);
    expect(observed.calls[0]?.command).toEqual([
      process.execPath,
      "x",
      "convex",
      "deploy",
      "--cmd-url-env-var-name",
      "NEXT_PUBLIC_CONVEX_URL",
      "--cmd",
      "bun run build",
    ]);
    expect(observed.calls[0]?.command.join(" ")).not.toContain("secret");
    expect(observed.calls[0]?.environment.CONVEX_DEPLOY_KEY).toContain("|secret");
  });

  test("Preview skips Convex and strips every deployment selector from the app", async () => {
    const observed = recorder();
    const environment: VercelConvexBuildEnvironment = {
      ...previewEnvironment,
      CONVEX_DEPLOYMENT: "prod:wrong-project",
    };
    expect(await runVercelConvexBuild({
      environment,
      expectedProductionDeploymentName: deployment,
      launch: observed.launch,
    })).toBe(0);
    expect(observed.calls[0]?.command).toEqual([process.execPath, "run", "build:app"]);
    expect(observed.calls[0]?.environment.CONVEX_DEPLOY_KEY).toBeUndefined();
    expect(observed.calls[0]?.environment.CONVEX_DEPLOYMENT_TOKEN).toBeUndefined();
    expect(observed.calls[0]?.environment.CONVEX_DEPLOYMENT).toBeUndefined();
    expect(observed.calls[0]?.environment[previewSurfaceOriginEnvironmentVariable])
      .toBe("https://example-feature-team.vercel.app");
    expect(observed.calls[0]?.environment.NEXT_PUBLIC_SITE_URL).toBeUndefined();
  });

  test("the nested application build revalidates the source-bound declaration", async () => {
    const reasons: string[] = [];
    expect(await runVercelAppBuild({
      environment: {
        ...previewEnvironment,
        CONVEX_PRODUCTION_DEPLOYMENT_NAME: "other-marmot-23",
      },
      expectedProductionDeploymentName: deployment,
      launch: recorder().launch,
      reportRefusal: (reason) => reasons.push(reason),
    })).toBe(1);
    expect(reasons).toEqual(["production-deployment-declaration-mismatch"]);
  });

  test("the source-bound production name is not injected into local development", async () => {
    const observed = recorder();
    expect(await runVercelConvexBuild({
      environment: { CONVEX_DEPLOYMENT: "dev:local-project" },
      expectedProductionDeploymentName: deployment,
      launch: observed.launch,
    })).toBe(0);
    expect(observed.calls[0]?.environment.CONVEX_PRODUCTION_DEPLOYMENT_NAME)
      .toBeUndefined();
    expect(observed.calls[0]?.environment.CONVEX_DEPLOYMENT).toBe("dev:local-project");
  });
});
