import { loadEnvConfig } from "@next/env";
import { createClient, type Session } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const activeWorkspaceKey = "sportapp_active_workspace_id";
type WorkspaceMembership = {
  workspace_id: string;
  role: string;
};

type CloneSedeTarget = {
  id?: string;
  name: string;
};

export type CloneContext = {
  cleanupPrefix: string;
  managerWorkspaceId: string;
  ownsSourceSede: boolean;
  sourceSedeId: string;
  sourceSedeName: string;
  sourceTrainerId: string;
  sourceTrainerName: string;
  sourceTeamId: string;
  sourceTeamName: string;
  sourceSessionId: string;
  sourceParameterId: string;
  sourceParameterName: string;
};

type CloneFixtureContext = Pick<CloneContext, "cleanupPrefix" | "managerWorkspaceId"> & Partial<CloneContext>;

const postgrestErrorFields = ["code", "message", "details", "hint"] as const;

function sanitizePostgrestErrorValue(value: string) {
  return value
    .replace(/\b(?:bearer\s+|(?:access_|refresh_)?token\s*[=:]\s*)[^\s,;]+/gi, "[redacted-token]")
    .replace(/\b(?:api[_-]?key|apikey)\s*[=:]\s*[^\s,;]+/gi, "[redacted-token]")
    .replace(/https?:\/\/[^\s,;]+/gi, "[redacted-url]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi, "[redacted-id]")
    .replace(/\b([a-z_]*id)\s*[=:]\s*[^\s,;)\]]+/gi, "$1=[redacted-id]");
}

export function formatPostgrestError(error: unknown) {
  const candidate = error && typeof error === "object" ? error : {};
  const sanitizedError = Object.fromEntries(
    postgrestErrorFields.map((field) => {
      const value = Reflect.get(candidate, field);
      return [field, typeof value === "string" ? sanitizePostgrestErrorValue(value) : null];
    }),
  );

  return JSON.stringify(sanitizedError);
}

function fail(stage: string, postgrestError?: unknown): never {
  const errorDetails = ` PostgREST error: ${formatPostgrestError(postgrestError)}`;
  throw new Error(
    `Clone E2E bootstrap failed at ${stage}.${errorDetails} Check the local development test configuration.`,
  );
}

export function createCloneCleanupPrefix(runId: string) {
  return `E2E clon R5 ${runId}`;
}

export function isOwnedCloneSedeName(sedeName: string, cleanupPrefix: string) {
  return sedeName.startsWith(`${cleanupPrefix} `);
}

export function shouldDeleteSourceSede(context: Pick<CloneFixtureContext, "ownsSourceSede">) {
  return context.ownsSourceSede === true;
}

export function selectVisibleSourceSede<T extends { id: string; nombre: string }>(sedes: readonly T[]) {
  return [...sedes].sort((left, right) => left.nombre.localeCompare(right.nombre, "es") || left.id.localeCompare(right.id))[0];
}

export function selectVisibleFixtureParameter<T extends { id: string }>(parameters: readonly T[]) {
  return parameters[0];
}

function storageKey(supabaseUrl: string) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  if (!projectRef) fail("Supabase project reference");
  return `sb-${projectRef}-auth-token`;
}

function createStorageState(session: Session, supabaseUrl: string, appUrl: string, workspaceId: string) {
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(appUrl).origin,
        localStorage: [
          { name: storageKey(supabaseUrl), value: JSON.stringify(session) },
          { name: activeWorkspaceKey, value: workspaceId },
        ],
      },
    ],
  };
}

function getRequiredCloneEnvironment() {
  // `loadEnvConfig` carga las variables en `process.env`; no dependemos de la
  // forma de su retorno para que la validación explícita siguiente sea estable.
  loadEnvConfig(process.cwd());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!supabaseUrl || !supabaseAnonKey || !email || !password) fail("required environment variables");

  return { supabaseUrl, supabaseAnonKey, email, password };
}

async function createAuthenticatedCloneClient(stage: string) {
  const environment = getRequiredCloneEnvironment();
  const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: environment.email,
    password: environment.password,
  });
  if (authError || !authData.session || !authData.user) fail(`${stage} password authentication`);

  return { ...environment, authData, supabase };
}

function findMembership(memberships: WorkspaceMembership[], role: string, stage: string) {
  const membership = memberships.find((candidate) => candidate.role === role);
  if (!membership) fail(stage);
  return membership;
}

async function deleteOwnedSede(
  supabase: Awaited<ReturnType<typeof createAuthenticatedCloneClient>>["supabase"],
  workspaceId: string,
  cleanupPrefix: string,
  target: CloneSedeTarget,
) {
  if (!isOwnedCloneSedeName(target.name, cleanupPrefix)) {
    throw new Error("Clone E2E cleanup rejected a sede outside this run.");
  }

  const result = target.id
    ? await supabase
        .from("sedes")
        .select("id, nombre")
        .eq("workspace_id", workspaceId)
        .eq("id", target.id)
        .eq("nombre", target.name)
    : await supabase
        .from("sedes")
        .select("id, nombre")
        .eq("workspace_id", workspaceId)
        .eq("nombre", target.name);
  if (result.error) fail("cleanup sede lookup");
  if (!result.data?.length) return;
  if (result.data.length !== 1 || result.data[0].nombre !== target.name) {
    throw new Error("Clone E2E cleanup rejected an unexpected sede record.");
  }

  const sede = result.data[0];
  const { error: deleteError } = await supabase
    .from("sedes")
    .delete()
    .eq("id", sede.id)
    .eq("workspace_id", workspaceId)
    .eq("nombre", target.name);
  if (deleteError) fail("cleanup sede delete");

  const { data: remainingSedes, error: verificationError } = await supabase
    .from("sedes")
    .select("id")
    .eq("id", sede.id)
    .eq("workspace_id", workspaceId)
    .eq("nombre", target.name);
  if (verificationError || remainingSedes?.length) fail("cleanup sede verification");
}

async function deleteFixtureSessionTrainerLink(
  supabase: Awaited<ReturnType<typeof createAuthenticatedCloneClient>>["supabase"],
  context: CloneFixtureContext,
) {
  if (!context.sourceSessionId || !context.sourceTrainerId) return;
  const { error } = await supabase
    .from("sesion_entrenadores")
    .delete()
    .eq("sesion_id", context.sourceSessionId)
    .eq("entrenador_id", context.sourceTrainerId);
  if (error) fail("cleanup session-trainer delete", error);

  const { data, error: verificationError } = await supabase
    .from("sesion_entrenadores")
    .select("sesion_id")
    .eq("sesion_id", context.sourceSessionId)
    .eq("entrenador_id", context.sourceTrainerId);
  if (verificationError || data?.length) fail("cleanup session-trainer verification", verificationError);
}

async function deleteFixtureTrainerTeamLink(
  supabase: Awaited<ReturnType<typeof createAuthenticatedCloneClient>>["supabase"],
  context: CloneFixtureContext,
) {
  if (!context.sourceTrainerId || !context.sourceTeamId) return;
  const { error } = await supabase
    .from("entrenador_equipos")
    .delete()
    .eq("entrenador_id", context.sourceTrainerId)
    .eq("equipo_id", context.sourceTeamId);
  if (error) fail("cleanup trainer-team delete", error);

  const { data, error: verificationError } = await supabase
    .from("entrenador_equipos")
    .select("entrenador_id")
    .eq("entrenador_id", context.sourceTrainerId)
    .eq("equipo_id", context.sourceTeamId);
  if (verificationError || data?.length) fail("cleanup trainer-team verification", verificationError);
}

async function deleteFixtureTrainerSedeLink(
  supabase: Awaited<ReturnType<typeof createAuthenticatedCloneClient>>["supabase"],
  context: CloneFixtureContext,
) {
  if (!context.sourceTrainerId || !context.sourceSedeId) return;
  const { error } = await supabase
    .from("entrenador_sedes")
    .delete()
    .eq("entrenador_id", context.sourceTrainerId)
    .eq("sede_id", context.sourceSedeId);
  if (error) fail("cleanup trainer-sede delete", error);

  const { data, error: verificationError } = await supabase
    .from("entrenador_sedes")
    .select("entrenador_id")
    .eq("entrenador_id", context.sourceTrainerId)
    .eq("sede_id", context.sourceSedeId);
  if (verificationError || data?.length) fail("cleanup trainer-sede verification", verificationError);
}

async function deleteOwnedSession(
  supabase: Awaited<ReturnType<typeof createAuthenticatedCloneClient>>["supabase"],
  context: CloneFixtureContext,
) {
  if (!context.sourceSessionId || !context.sourceTeamId || !context.sourceTrainerId) return;
  await deleteFixtureSessionTrainerLink(supabase, context);

  const { data: sessions, error: lookupError } = await supabase
    .from("sesiones")
    .select("id")
    .eq("id", context.sourceSessionId)
    .eq("equipo_id", context.sourceTeamId)
    .eq("entrenador_id", context.sourceTrainerId);
  if (lookupError) fail("cleanup session lookup", lookupError);
  if (!sessions?.length) return;
  if (sessions.length !== 1) throw new Error("Clone E2E cleanup rejected an unexpected session record.");

  const { error: deleteError } = await supabase
    .from("sesiones")
    .delete()
    .eq("id", context.sourceSessionId)
    .eq("equipo_id", context.sourceTeamId)
    .eq("entrenador_id", context.sourceTrainerId);
  if (deleteError) fail("cleanup session delete", deleteError);

  const { data: remainingSessions, error: verificationError } = await supabase
    .from("sesiones")
    .select("id")
    .eq("id", context.sourceSessionId)
    .eq("equipo_id", context.sourceTeamId)
    .eq("entrenador_id", context.sourceTrainerId);
  if (verificationError || remainingSessions?.length) fail("cleanup session verification", verificationError);
}

async function deleteOwnedTeam(
  supabase: Awaited<ReturnType<typeof createAuthenticatedCloneClient>>["supabase"],
  context: CloneFixtureContext,
) {
  if (!context.sourceTeamId || !context.sourceTeamName) return;
  if (!context.sourceTeamName.startsWith(`${context.cleanupPrefix} `)) {
    throw new Error("Clone E2E cleanup rejected a team outside this run.");
  }
  await deleteFixtureTrainerTeamLink(supabase, context);

  const { data: teams, error: lookupError } = await supabase
    .from("equipos")
    .select("id, nombre")
    .eq("id", context.sourceTeamId)
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("nombre", context.sourceTeamName);
  if (lookupError) fail("cleanup team lookup", lookupError);
  if (!teams?.length) return;
  if (teams.length !== 1 || teams[0].nombre !== context.sourceTeamName) {
    throw new Error("Clone E2E cleanup rejected an unexpected team record.");
  }

  const { error: deleteError } = await supabase
    .from("equipos")
    .delete()
    .eq("id", context.sourceTeamId)
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("nombre", context.sourceTeamName);
  if (deleteError) fail("cleanup team delete", deleteError);

  const { data: remainingTeams, error: verificationError } = await supabase
    .from("equipos")
    .select("id")
    .eq("id", context.sourceTeamId)
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("nombre", context.sourceTeamName);
  if (verificationError || remainingTeams?.length) fail("cleanup team verification", verificationError);
}

async function deleteOwnedParameter(
  supabase: Awaited<ReturnType<typeof createAuthenticatedCloneClient>>["supabase"],
  context: CloneFixtureContext,
) {
  if (!context.sourceParameterId || !context.sourceParameterName) return;
  if (!context.sourceParameterName.startsWith(`${context.cleanupPrefix} `)) {
    throw new Error("Clone E2E cleanup rejected a parameter outside this run.");
  }

  const { data: parameters, error: lookupError } = await supabase
    .from("parametros_sistema")
    .select("id, nombre")
    .eq("id", context.sourceParameterId)
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("nombre", context.sourceParameterName);
  if (lookupError) fail("cleanup parameter lookup", lookupError);
  if (!parameters?.length) return;
  if (parameters.length !== 1 || parameters[0].nombre !== context.sourceParameterName) {
    throw new Error("Clone E2E cleanup rejected an unexpected parameter record.");
  }

  const { error: deleteError } = await supabase
    .from("parametros_sistema")
    .delete()
    .eq("id", context.sourceParameterId)
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("nombre", context.sourceParameterName);
  if (deleteError) fail("cleanup parameter delete", deleteError);

  const { data: remainingParameters, error: verificationError } = await supabase
    .from("parametros_sistema")
    .select("id")
    .eq("id", context.sourceParameterId)
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("nombre", context.sourceParameterName);
  if (verificationError || remainingParameters?.length) fail("cleanup parameter verification", verificationError);
}

async function deleteOwnedTrainer(
  supabase: Awaited<ReturnType<typeof createAuthenticatedCloneClient>>["supabase"],
  context: CloneFixtureContext,
) {
  if (!context.sourceTrainerId || !context.sourceTrainerName) return;
  if (!context.sourceTrainerName.startsWith(`${context.cleanupPrefix} `)) {
    throw new Error("Clone E2E cleanup rejected a trainer outside this run.");
  }

  const { data: trainers, error: lookupError } = await supabase
    .from("entrenadores")
    .select("id, nombre")
    .eq("id", context.sourceTrainerId)
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("nombre", context.sourceTrainerName);
  if (lookupError) fail("cleanup trainer lookup");
  if (!trainers?.length) return;
  if (trainers.length !== 1 || trainers[0].nombre !== context.sourceTrainerName) {
    throw new Error("Clone E2E cleanup rejected an unexpected trainer record.");
  }

  const { error: deleteError } = await supabase
    .from("entrenadores")
    .delete()
    .eq("id", context.sourceTrainerId)
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("nombre", context.sourceTrainerName);
  if (deleteError) fail("cleanup trainer delete");

  const { data: remainingTrainers, error: verificationError } = await supabase
    .from("entrenadores")
    .select("id")
    .eq("id", context.sourceTrainerId)
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("nombre", context.sourceTrainerName);
  if (verificationError || remainingTrainers?.length) fail("cleanup trainer verification");
}

export async function cleanupCloneSede(context: CloneContext, target: CloneSedeTarget) {
  if (!isOwnedCloneSedeName(target.name, context.cleanupPrefix)) {
    throw new Error("Clone E2E cleanup rejected a sede outside this run.");
  }

  const { supabase } = await createAuthenticatedCloneClient("cleanup");
  await deleteOwnedSede(supabase, context.managerWorkspaceId, context.cleanupPrefix, target);
}

async function cleanupCloneFixture(context: CloneFixtureContext) {
  const { supabase } = await createAuthenticatedCloneClient("fixture cleanup");
  await deleteOwnedSession(supabase, context);
  await deleteOwnedTeam(supabase, context);
  await deleteOwnedParameter(supabase, context);
  await deleteFixtureTrainerSedeLink(supabase, context);
  if (shouldDeleteSourceSede(context) && context.sourceSedeId && context.sourceSedeName) {
    await deleteOwnedSede(supabase, context.managerWorkspaceId, context.cleanupPrefix, {
      id: context.sourceSedeId,
      name: context.sourceSedeName,
    });
  }
  await deleteOwnedTrainer(supabase, context);
}

function isStoredCloneFixtureContext(value: unknown): value is CloneFixtureContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Record<string, unknown>;
  if (
    typeof context.cleanupPrefix !== "string" ||
    typeof context.managerWorkspaceId !== "string" ||
    typeof context.ownsSourceSede !== "boolean"
  ) {
    return false;
  }

  return [
    "sourceSedeId",
    "sourceSedeName",
    "sourceTrainerId",
    "sourceTrainerName",
    "sourceTeamId",
    "sourceTeamName",
    "sourceSessionId",
    "sourceParameterId",
    "sourceParameterName",
  ].every((key) => context[key] === undefined || typeof context[key] === "string");
}

export async function cleanupStoredCloneFixture() {
  const contextPath = process.env.E2E_CLONE_CONTEXT_PATH;
  if (!contextPath) return;

  try {
    const storedContext = JSON.parse(await readFile(contextPath, "utf8"));
    if (!isStoredCloneFixtureContext(storedContext)) throw new Error("Invalid clone E2E cleanup context.");

    await cleanupCloneFixture(storedContext);
    await unlink(contextPath);
  } catch (error) {
    // El contexto solo se borra tras una limpieza completa; ante un fallo se
    // conserva para poder reintentarla, sin propagar secretos del error origen.
    const detail = sanitizePostgrestErrorValue(
      error instanceof Error ? error.message : "unknown cleanup error",
    );
    throw new Error(
      `Clone E2E stored fixture cleanup failed: ${detail}. Check the local development test configuration.`,
    );
  }
}

async function createCloneFixture(
  supabase: Awaited<ReturnType<typeof createAuthenticatedCloneClient>>["supabase"],
  context: CloneFixtureContext,
) {
  if (!context.sourceSedeId || !context.sourceSedeName) fail("fixture legacy source sede");

  const sourceTrainerName = `${context.cleanupPrefix} entrenador`;
  const { data: sourceTrainer, error: sourceTrainerError } = await supabase
    .from("entrenadores")
    .insert({ nombre: sourceTrainerName, workspace_id: context.managerWorkspaceId })
    .select("id")
    .single();
  if (sourceTrainerError || !sourceTrainer) fail("fixture trainer insert");
  context.sourceTrainerId = sourceTrainer.id;
  context.sourceTrainerName = sourceTrainerName;

  const { error: trainerSedeError } = await supabase.from("entrenador_sedes").insert({
    entrenador_id: sourceTrainer.id,
    sede_id: context.sourceSedeId,
    rol: "Entrenador",
  });
  if (trainerSedeError) fail("fixture trainer-sede insert");

  const { data: sourceTeam, error: sourceTeamError } = await supabase
    .from("equipos")
    .insert({
      nombre: `${context.cleanupPrefix} equipo`,
      categoria: "E2E",
      sede_id: context.sourceSedeId,
      workspace_id: context.managerWorkspaceId,
    })
    .select("id")
    .single();
  if (sourceTeamError || !sourceTeam) fail("fixture team insert");
  context.sourceTeamId = sourceTeam.id;
  context.sourceTeamName = `${context.cleanupPrefix} equipo`;

  const { error: trainerTeamError } = await supabase.from("entrenador_equipos").insert({
    entrenador_id: sourceTrainer.id,
    equipo_id: sourceTeam.id,
    rol: "Principal",
  });
  if (trainerTeamError) fail("fixture trainer-team insert");

  const { data: sourceSession, error: sourceSessionError } = await supabase
    .from("sesiones")
    .insert({
      equipo_id: sourceTeam.id,
      entrenador_id: sourceTrainer.id,
      fecha: "2026-08-09",
      estado: "Planificada",
    })
    .select("id")
    .single();
  if (sourceSessionError || !sourceSession) fail("fixture session insert");
  context.sourceSessionId = sourceSession.id;

  const { error: sessionTrainerError } = await supabase.from("sesion_entrenadores").insert({
    sesion_id: sourceSession.id,
    entrenador_id: sourceTrainer.id,
  });
  if (sessionTrainerError) fail("fixture session-trainer insert");

  const { data: sourceParameters, error: sourceParametersError } = await supabase
    .from("parametros_sistema")
    .select("id")
    .eq("workspace_id", context.managerWorkspaceId)
    .eq("sede_id", context.sourceSedeId)
    .order("nombre", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);
  if (sourceParametersError) fail("fixture parameter lookup", sourceParametersError);
  const sourceParameter = selectVisibleFixtureParameter(sourceParameters ?? []);
  if (sourceParameter) {
    context.sourceParameterId = sourceParameter.id;
  }

}

export default async function setupCloneAuth() {
  const { supabaseUrl, authData, supabase } = await createAuthenticatedCloneClient("setup");
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/.test(baseUrl)) {
    fail("non-local E2E_BASE_URL");
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", authData.user.id);
  if (membershipsError || !memberships?.length) fail("workspace memberships");

  const managerWorkspace = findMembership(memberships, "admin", "admin workspace membership");
  const nonManagerWorkspace = findMembership(memberships, "entrenador", "trainer workspace membership");
  const { data: visibleSourceSedes, error: visibleSourceSedesError } = await supabase
    .from("sedes")
    .select("id, nombre")
    .eq("workspace_id", managerWorkspace.workspace_id)
    .order("nombre", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);
  if (visibleSourceSedesError) fail("visible source sedes", visibleSourceSedesError);
  const sourceSede = selectVisibleSourceSede(visibleSourceSedes ?? []);
  if (!sourceSede) fail("visible source sede");

  const { data: foreignSedes, error: foreignSedesError } = await supabase
    .from("sedes")
    .select("nombre")
    .eq("workspace_id", nonManagerWorkspace.workspace_id)
    .order("nombre", { ascending: true });
  if (foreignSedesError || !foreignSedes?.length) fail("non-manager foreign sede");

  const fixtureContext: CloneFixtureContext = {
    cleanupPrefix: createCloneCleanupPrefix(randomUUID()),
    managerWorkspaceId: managerWorkspace.workspace_id,
    ownsSourceSede: false,
    sourceSedeId: sourceSede.id,
    sourceSedeName: sourceSede.nombre,
  };
  try {
    await createCloneFixture(supabase, fixtureContext);
  } catch (fixtureError) {
    try {
      await cleanupCloneFixture(fixtureContext);
    } catch {
      throw new Error("Clone E2E fixture setup and cleanup failed.");
    }
    throw fixtureError;
  }

  const cloneContext = fixtureContext as CloneContext;
  const authDirectory = resolve(process.cwd(), ".auth");
  const managerState = resolve(authDirectory, "clone-manager.json");
  const nonManagerState = resolve(authDirectory, "clone-non-manager.json");
  const cloneContextPath = resolve(authDirectory, "clone-context.json");
  await mkdir(authDirectory, { recursive: true });
  await Promise.all([
    writeFile(managerState, JSON.stringify(createStorageState(authData.session, supabaseUrl, baseUrl, managerWorkspace.workspace_id))),
    writeFile(
      nonManagerState,
      JSON.stringify(createStorageState(authData.session, supabaseUrl, baseUrl, nonManagerWorkspace.workspace_id)),
    ),
    writeFile(cloneContextPath, JSON.stringify(cloneContext)),
  ]);

  process.env.E2E_CLONE_STORAGE_STATE = managerState;
  process.env.E2E_CLONE_NON_MANAGER_STORAGE_STATE = nonManagerState;
  process.env.E2E_CLONE_FOREIGN_SEDE_NAME = foreignSedes[0].nombre;
  process.env.E2E_CLONE_CONTEXT_PATH = cloneContextPath;

  return async () => {
    await cleanupCloneFixture(cloneContext);
  };
}
