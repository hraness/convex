const convexDeployArguments = [
  "x",
  "convex",
  "deploy",
  "--cmd-url-env-var-name",
  "NEXT_PUBLIC_CONVEX_URL",
  "--cmd",
  "bun run build",
] as const;

const applicationBuildArguments = ["run", "build:app"] as const;
const deploymentNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
const vercelHostnamePattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+vercel\.app$/;

export const productionDeploymentNameEnvironmentVariable =
  "CONVEX_PRODUCTION_DEPLOYMENT_NAME" as const;
export const previewSurfaceOriginEnvironmentVariable =
  "NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN" as const;

export type VercelConvexBuildRefusal =
  | "invalid-production-deployment-name"
  | "invalid-preview-convex-site-url"
  | "invalid-preview-convex-url"
  | "invalid-preview-surface-host"
  | "malformed-production-deploy-key"
  | "missing-production-deployment-name"
  | "missing-production-deploy-key"
  | "missing-preview-convex-site-url"
  | "missing-preview-convex-url"
  | "missing-preview-surface-host"
  | "non-production-deploy-key"
  | "production-deploy-key-outside-production"
  | "production-deployment-declaration-mismatch"
  | "production-deployment-mismatch"
  | "production-deployment-token-present"
  | "production-marker-outside-vercel"
  | "production-target-outside-production"
  | "production-target-outside-vercel"
  | "preview-deploy-key-present"
  | "preview-deployment-token-present"
  | "preview-target-outside-preview"
  | "preview-target-outside-vercel"
  | "unsupported-vercel-runtime";

export type VercelConvexBuildPlan =
  | {
      readonly kind: "refuse";
      readonly reason: VercelConvexBuildRefusal;
    }
  | {
      readonly environmentMode: "deploy-convex" | "preview-app-only";
      readonly kind: "run";
      readonly surfaceOrigin?: string;
    };

export type VercelAppBuildPlan =
  | {
      readonly kind: "refuse";
      readonly reason: VercelConvexBuildRefusal;
    }
  | {
      readonly kind: "run";
      readonly surfaceOrigin?: string;
    };

export type VercelConvexBuildEnvironment = Readonly<
  Record<string, string | undefined>
>;

type BuildSubprocess = {
  readonly exited: Promise<number>;
};

export type VercelConvexBuildLauncher = (
  command: readonly string[],
  options: {
    readonly env: Record<string, string | undefined>;
    readonly stderr: "inherit";
    readonly stdin: "inherit";
    readonly stdout: "inherit";
  },
) => BuildSubprocess;

type ProductionDeployKey = {
  readonly deploymentName: string;
};

function parseProductionDeployKey(
  value: string | undefined,
): ProductionDeployKey | VercelConvexBuildRefusal {
  if (value === undefined || value === "") return "missing-production-deploy-key";
  if (!value.startsWith("prod:")) return "non-production-deploy-key";

  const separatorIndex = value.indexOf("|");
  if (
    separatorIndex === -1
    || separatorIndex === value.length - 1
    || value.indexOf("|", separatorIndex + 1) !== -1
    || /\s/u.test(value)
  ) {
    return "malformed-production-deploy-key";
  }

  const deploymentName = value.slice("prod:".length, separatorIndex);
  if (!deploymentNamePattern.test(deploymentName)) {
    return "malformed-production-deploy-key";
  }
  return { deploymentName };
}

/**
 * Parse Vercel's generated deployment hostname without confusing it with the
 * application's canonical production identity. VERCEL_URL is provider input,
 * not a URL: schemes, paths, ports, credentials, and non-Vercel hosts fail.
 */
export function parseVercelPreviewSurfaceOrigin(
  value: string | undefined,
): { readonly ok: true; readonly origin: string } | {
  readonly ok: false;
  readonly reason: "invalid-preview-surface-host" | "missing-preview-surface-host";
} {
  if (value === undefined || value === "") {
    return { ok: false, reason: "missing-preview-surface-host" };
  }
  if (value !== value.toLowerCase() || !vercelHostnamePattern.test(value)) {
    return { ok: false, reason: "invalid-preview-surface-host" };
  }
  return { ok: true, origin: `https://${value}` };
}

function previewRuntimeRefusal(
  environment: VercelConvexBuildEnvironment,
  productionDeploymentName: string,
): VercelConvexBuildRefusal | { readonly surfaceOrigin: string } {
  if (environment.CONVEX_DEPLOY_KEY !== undefined) {
    return "preview-deploy-key-present";
  }
  if (environment.CONVEX_DEPLOYMENT_TOKEN !== undefined) {
    return "preview-deployment-token-present";
  }

  const expectedConvexUrl = `https://${productionDeploymentName}.convex.cloud`;
  const expectedConvexSiteUrl = `https://${productionDeploymentName}.convex.site`;
  const convexUrl = environment.NEXT_PUBLIC_CONVEX_URL;
  const convexSiteUrl = environment.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (convexUrl === undefined || convexUrl === "") return "missing-preview-convex-url";
  if (convexUrl !== expectedConvexUrl) return "invalid-preview-convex-url";
  if (convexSiteUrl === undefined || convexSiteUrl === "") {
    return "missing-preview-convex-site-url";
  }
  if (convexSiteUrl !== expectedConvexSiteUrl) {
    return "invalid-preview-convex-site-url";
  }

  const surface = parseVercelPreviewSurfaceOrigin(environment.VERCEL_URL);
  return surface.ok ? { surfaceOrigin: surface.origin } : surface.reason;
}

type DeclaredProductionDeployment =
  | { readonly deploymentName: string; readonly ok: true }
  | { readonly ok: false; readonly reason: VercelConvexBuildRefusal };

function declaredProductionDeployment(
  environment: VercelConvexBuildEnvironment,
): DeclaredProductionDeployment {
  const deploymentName = environment[productionDeploymentNameEnvironmentVariable];
  if (deploymentName === undefined || deploymentName === "") {
    return { ok: false, reason: "missing-production-deployment-name" };
  }
  if (!deploymentNamePattern.test(deploymentName)) {
    return { ok: false, reason: "invalid-production-deployment-name" };
  }
  return { deploymentName, ok: true };
}

/**
 * Production is the only Vercel target allowed to deploy Convex. Built-in
 * Preview is an application-only client of the exact checked production
 * deployment. Local development outside Vercel retains the existing Convex CLI
 * behavior, but an unrecognized Vercel runtime and a production-class key can
 * never fall through to that local path.
 */
export function planVercelConvexBuild(
  environment: VercelConvexBuildEnvironment,
): VercelConvexBuildPlan {
  const target = environment.VERCEL_TARGET_ENV;
  const deploymentName = environment[productionDeploymentNameEnvironmentVariable];

  if (target === "production") {
    if (environment.VERCEL !== "1") {
      return { kind: "refuse", reason: "production-target-outside-vercel" };
    }
    if (environment.VERCEL_ENV !== "production") {
      return { kind: "refuse", reason: "production-target-outside-production" };
    }
    const declared = declaredProductionDeployment(environment);
    if (!declared.ok) return { kind: "refuse", reason: declared.reason };
    const key = parseProductionDeployKey(environment.CONVEX_DEPLOY_KEY);
    if (typeof key === "string") return { kind: "refuse", reason: key };
    if (environment.CONVEX_DEPLOYMENT_TOKEN !== undefined) {
      return { kind: "refuse", reason: "production-deployment-token-present" };
    }
    if (key.deploymentName !== declared.deploymentName) {
      return { kind: "refuse", reason: "production-deployment-mismatch" };
    }
    return { environmentMode: "deploy-convex", kind: "run" };
  }

  if (target === "preview" || environment.VERCEL_ENV === "preview") {
    if (environment.VERCEL !== "1") {
      return { kind: "refuse", reason: "preview-target-outside-vercel" };
    }
    if (target !== "preview" || environment.VERCEL_ENV !== "preview") {
      return { kind: "refuse", reason: "preview-target-outside-preview" };
    }
    const declared = declaredProductionDeployment(environment);
    if (!declared.ok) return { kind: "refuse", reason: declared.reason };
    const preview = previewRuntimeRefusal(environment, declared.deploymentName);
    if (typeof preview === "string") return { kind: "refuse", reason: preview };
    return {
      environmentMode: "preview-app-only",
      kind: "run",
      surfaceOrigin: preview.surfaceOrigin,
    };
  }

  if (environment.VERCEL === "1") {
    return { kind: "refuse", reason: "unsupported-vercel-runtime" };
  }
  if (deploymentName !== undefined && environment.VERCEL !== "1") {
    return { kind: "refuse", reason: "production-marker-outside-vercel" };
  }
  if (environment.CONVEX_DEPLOY_KEY?.startsWith("prod:") === true) {
    return { kind: "refuse", reason: "production-deploy-key-outside-production" };
  }
  return { environmentMode: "deploy-convex", kind: "run" };
}

export function planVercelAppBuild(
  environment: VercelConvexBuildEnvironment,
): VercelAppBuildPlan {
  const plan = planVercelConvexBuild(environment);
  if (plan.kind === "refuse") return plan;
  return {
    kind: "run",
    ...(plan.surfaceOrigin === undefined ? {} : { surfaceOrigin: plan.surfaceOrigin }),
  };
}

function declareRegisteredProductionDeployment(
  environment: VercelConvexBuildEnvironment,
  expectedProductionDeploymentName: string | undefined,
): VercelConvexBuildEnvironment | VercelConvexBuildRefusal {
  if (
    expectedProductionDeploymentName === undefined
    || !deploymentNamePattern.test(expectedProductionDeploymentName)
  ) {
    return "invalid-production-deployment-name";
  }
  if (
    environment.VERCEL_TARGET_ENV !== "production"
    && environment.VERCEL_TARGET_ENV !== "preview"
    && environment.VERCEL_ENV !== "production"
    && environment.VERCEL_ENV !== "preview"
  ) {
    return environment;
  }
  const configured = environment[productionDeploymentNameEnvironmentVariable];
  if (configured !== undefined && configured !== expectedProductionDeploymentName) {
    return "production-deployment-declaration-mismatch";
  }
  return {
    ...environment,
    [productionDeploymentNameEnvironmentVariable]: expectedProductionDeploymentName,
  };
}

function defaultLauncher(
  command: readonly string[],
  options: Parameters<VercelConvexBuildLauncher>[1],
): BuildSubprocess {
  return Bun.spawn([...command], options);
}

function applicationEnvironment(
  environment: VercelConvexBuildEnvironment,
  surfaceOrigin?: string,
): Record<string, string | undefined> {
  const childEnvironment: Record<string, string | undefined> = { ...environment };
  delete childEnvironment.CONVEX_DEPLOY_KEY;
  delete childEnvironment.CONVEX_DEPLOYMENT_TOKEN;
  delete childEnvironment.CONVEX_DEPLOYMENT;
  if (surfaceOrigin === undefined) {
    delete childEnvironment[previewSurfaceOriginEnvironmentVariable];
  } else {
    childEnvironment[previewSurfaceOriginEnvironmentVariable] = surfaceOrigin;
  }
  return childEnvironment;
}

async function launchApplicationBuild(
  environment: VercelConvexBuildEnvironment,
  launch: VercelConvexBuildLauncher,
  surfaceOrigin?: string,
): Promise<number> {
  return await launch(
    [process.execPath, ...applicationBuildArguments],
    {
      env: applicationEnvironment(environment, surfaceOrigin),
      stderr: "inherit",
      stdin: "inherit",
      stdout: "inherit",
    },
  ).exited;
}

export async function runVercelConvexBuild(options?: {
  readonly expectedProductionDeploymentName?: string;
  readonly environment?: VercelConvexBuildEnvironment;
  readonly launch?: VercelConvexBuildLauncher;
  readonly reportRefusal?: (reason: VercelConvexBuildRefusal) => void;
}): Promise<number> {
  const declaredEnvironment = declareRegisteredProductionDeployment(
    options?.environment ?? process.env,
    options?.expectedProductionDeploymentName,
  );
  if (typeof declaredEnvironment === "string") {
    (options?.reportRefusal ?? defaultRefusalReporter)(declaredEnvironment);
    return 1;
  }
  const plan = planVercelConvexBuild(declaredEnvironment);
  if (plan.kind === "refuse") {
    (options?.reportRefusal ?? defaultRefusalReporter)(plan.reason);
    return 1;
  }
  const launch = options?.launch ?? defaultLauncher;
  if (plan.environmentMode === "preview-app-only") {
    return await launchApplicationBuild(declaredEnvironment, launch, plan.surfaceOrigin);
  }
  return await launch(
    [process.execPath, ...convexDeployArguments],
    {
      env: { ...declaredEnvironment },
      stderr: "inherit",
      stdin: "inherit",
      stdout: "inherit",
    },
  ).exited;
}

export async function runVercelAppBuild(options?: {
  readonly expectedProductionDeploymentName?: string;
  readonly environment?: VercelConvexBuildEnvironment;
  readonly launch?: VercelConvexBuildLauncher;
  readonly reportRefusal?: (reason: VercelConvexBuildRefusal) => void;
}): Promise<number> {
  const declaredEnvironment = declareRegisteredProductionDeployment(
    options?.environment ?? process.env,
    options?.expectedProductionDeploymentName,
  );
  if (typeof declaredEnvironment === "string") {
    (options?.reportRefusal ?? defaultRefusalReporter)(declaredEnvironment);
    return 1;
  }
  const plan = planVercelAppBuild(declaredEnvironment);
  if (plan.kind === "refuse") {
    (options?.reportRefusal ?? defaultRefusalReporter)(plan.reason);
    return 1;
  }
  return await launchApplicationBuild(
    declaredEnvironment,
    options?.launch ?? defaultLauncher,
    plan.surfaceOrigin,
  );
}

function defaultRefusalReporter(reason: VercelConvexBuildRefusal): void {
  console.error(`Vercel Convex build refused: ${reason}.`);
}

function parseArguments(arguments_: readonly string[]): {
  readonly expectedProductionDeploymentName: string;
  readonly runAppBuild: boolean;
} | null {
  let expectedProductionDeploymentName: string | undefined;
  let runAppBuild = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--run-app-build" && !runAppBuild) {
      runAppBuild = true;
      continue;
    }
    if (
      argument === "--production-deployment"
      && expectedProductionDeploymentName === undefined
      && index + 1 < arguments_.length
    ) {
      expectedProductionDeploymentName = arguments_[index + 1];
      index += 1;
      continue;
    }
    return null;
  }
  return expectedProductionDeploymentName === undefined
    ? null
    : { expectedProductionDeploymentName, runAppBuild };
}

if (import.meta.main) {
  const options = parseArguments(process.argv.slice(2));
  if (options === null) {
    console.error("Vercel Convex build refused: unsupported-arguments.");
    process.exitCode = 1;
  } else if (options.runAppBuild) {
    process.exitCode = await runVercelAppBuild(options);
  } else {
    process.exitCode = await runVercelConvexBuild(options);
  }
}
