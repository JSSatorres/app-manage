import { loadEnvConfig } from "@next/env";
import type { BrowserContextOptions } from "@playwright/test";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/types/database.types";
import { E2E_BASE_URL, getE2EAuthCredentials } from "../support/auth";

const DOCUMENTOS_BUCKET = "documentos";
const PROJECT_REF = "rgmrqkoudyotkpqgezzv";
const ACTIVE_WORKSPACE_KEY = "sportapp_active_workspace_id";
const ACTIVE_SEDE_KEY = "sportapp_active_sede_id";

type DocumentosEnvironment = {
  anonKey: string;
  serviceRoleKey: string;
  url: string;
};

type FixtureAsset = {
  id: string;
  resourceId: string;
};

export type E2EStorageState = Exclude<BrowserContextOptions["storageState"], string | undefined>;

export type DocumentosFixture = {
  cleanupPrefix: string;
  coachStorageState: E2EStorageState;
  coachUserId: string;
  coachWorkspaceId: string;
  managerStorageState: E2EStorageState;
  managerUserId: string;
  managerWorkspaceId: string;
  emptyFilteredSedeId: string;
  youtubeAssets: FixtureAsset[];
  youtubeFallbackAsset: FixtureAsset;
  googleDriveUnavailableAsset: FixtureAsset;
  storageAsset: { id: string; storagePath: string };
};

function documentosEnvironment(): DocumentosEnvironment {
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Documentos E2E requiere NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY para fixtures aisladas.",
    );
  }
  if (new URL(url).hostname.split(".")[0] !== PROJECT_REF) {
    throw new Error("Documentos E2E rechazó un proyecto Supabase distinto del entorno de pruebas autorizado.");
  }
  return { anonKey, serviceRoleKey, url };
}

function storageKey(supabaseUrl: string) {
  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

function createStorageState(session: Session, supabaseUrl: string, workspaceId: string): E2EStorageState {
  return {
    cookies: [],
    origins: [{
      origin: new URL(E2E_BASE_URL).origin,
      localStorage: [
        { name: storageKey(supabaseUrl), value: JSON.stringify(session) },
        { name: ACTIVE_WORKSPACE_KEY, value: workspaceId },
      ],
    }],
  };
}

function serviceClient(environment: DocumentosEnvironment): SupabaseClient<Database> {
  return createClient<Database>(environment.url, environment.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(email: string, password: string, environment: DocumentosEnvironment) {
  const client = createClient<Database>(environment.url, environment.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error("No se pudo iniciar una sesión E2E temporal de documentos.");
  }
  return { session: data.session, userId: data.user.id };
}

function resourceId(seed: string) {
  return seed.replace(/-/g, "").slice(0, 11);
}

function youtubeRow(workspaceId: string, createdBy: string, value: string, embedUrl?: string) {
  return {
    workspace_id: workspaceId,
    provider: "youtube",
    status: "ready",
    original_url: `https://www.youtube.com/watch?v=${value}`,
    external_resource_id: value,
    embed_url: embedUrl ?? `https://www.youtube-nocookie.com/embed/${value}`,
    created_by: createdBy,
  };
}

async function deleteStoragePrefix(client: SupabaseClient<Database>, path: string): Promise<void> {
  const { data, error } = await client.storage.from(DOCUMENTOS_BUCKET).list(path, { limit: 1000 });
  if (error) throw new Error(`No se pudieron listar los objetos Storage de la fixture de documentos: ${error.message}`);

  const files = (data ?? []).filter((entry) => entry.id).map((entry) => `${path}/${entry.name}`);
  const folders = (data ?? []).filter((entry) => !entry.id).map((entry) => `${path}/${entry.name}`);
  for (const folder of folders) await deleteStoragePrefix(client, folder);
  if (files.length) {
    const { error: removeError } = await client.storage.from(DOCUMENTOS_BUCKET).remove(files);
    if (removeError) throw new Error(`No se pudieron borrar los objetos Storage de la fixture de documentos: ${removeError.message}`);
  }
}

async function deleteWorkspaceFixture(client: SupabaseClient<Database>, workspaceId: string) {
  await deleteStoragePrefix(client, workspaceId);

  const { data: documents, error: documentsLookupError } = await client
    .from("documentos")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (documentsLookupError) throw new Error(`No se pudieron localizar los documentos de limpieza E2E: ${documentsLookupError.message}`);
  const documentIds = (documents ?? []).map((document) => document.id);
  if (documentIds.length) {
    const pivotTables = ["documento_sedes", "documento_equipos", "documento_entrenadores", "sesion_documentos", "ejercicio_documentos"] as const;
    for (const table of pivotTables) {
      const { error } = await client.from(table).delete().in("documento_id", documentIds);
      if (error) throw new Error(`No se pudo limpiar ${table} de la fixture de documentos: ${error.message}`);
    }
    const { error } = await client.from("documentos").delete().in("id", documentIds);
    if (error) throw new Error(`No se pudieron borrar los documentos de la fixture E2E: ${error.message}`);
  }

  const { error: economicCategoriesUpdateError } = await client
    .from("economic_categories")
    .update({ is_predefined: false })
    .eq("workspace_id", workspaceId);
  if (economicCategoriesUpdateError) {
    throw new Error(`No se pudieron preparar las categorías económicas de la fixture para su limpieza: ${economicCategoriesUpdateError.message}`);
  }

  const cleanupTables = [
    "storage_upgrade_requests",
    "storage_reservations",
    "document_asset_reconciliation_audit",
    "content_assets",
    "workspace_entitlements",
    "workspace_storage_usage",
    "economic_movements",
    "stripe_payment_attempts",
    "economic_entries",
    "economic_schedules",
    "stripe_connected_accounts",
    "economic_categories",
    "economic_settings",
    "economic_audit_events",
    "workspace_members",
    "sedes",
  ] as const;
  for (const table of cleanupTables) {
    const { error } = await client.from(table).delete().eq("workspace_id", workspaceId);
    if (error) throw new Error(`No se pudo limpiar ${table} de la fixture de documentos: ${error.message}`);
  }

  const { error: workspaceError } = await client.from("workspaces").delete().eq("id", workspaceId);
  if (workspaceError) {
    throw new Error(`No se pudo borrar el workspace temporal de documentos ${workspaceId}: ${workspaceError.message}`);
  }
  const { data: remaining, error: verificationError } = await client
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId);
  if (verificationError || remaining?.length) {
    const detail = verificationError?.message ?? `el workspace temporal ${workspaceId} sigue existiendo`;
    throw new Error(`La limpieza E2E no confirmó el borrado del workspace temporal de documentos: ${detail}`);
  }
}

export async function createDocumentosFixture(): Promise<DocumentosFixture> {
  const environment = documentosEnvironment();
  const client = serviceClient(environment);
  const { email, password } = getE2EAuthCredentials();
  const managerAuth = await signIn(email, password, environment);
  const cleanupPrefix = `E2E documentos ${randomUUID()}`;
  const coachEmail = `e2e.documentos.${randomUUID()}@example.invalid`;
  const coachPassword = `E2E-${randomUUID()}-safe`;

  const { data: coachUser, error: coachError } = await client.auth.admin.createUser({
    email: coachEmail,
    password: coachPassword,
    email_confirm: true,
  });
  if (coachError || !coachUser.user) throw new Error("No se pudo crear el entrenador temporal E2E.");

  const { data: workspaces, error: workspacesError } = await client
    .from("workspaces")
    .insert([
      { name: `${cleanupPrefix} gestor` },
      { name: `${cleanupPrefix} entrenador` },
    ])
    .select("id,name");
  if (workspacesError || !workspaces || workspaces.length !== 2) {
    await client.auth.admin.deleteUser(coachUser.user.id);
    throw new Error("No se pudieron crear los dos workspaces temporales de documentos.");
  }
  const managerWorkspace = workspaces.find((workspace) => workspace.name.endsWith(" gestor"));
  const coachWorkspace = workspaces.find((workspace) => workspace.name.endsWith(" entrenador"));
  if (!managerWorkspace || !coachWorkspace) throw new Error("La fixture de documentos no resolvió sus workspaces temporales.");

  try {
    const { error: membershipsError } = await client.from("workspace_members").insert([
      { workspace_id: managerWorkspace.id, user_id: managerAuth.userId, role: "admin" },
      { workspace_id: coachWorkspace.id, user_id: coachUser.user.id, role: "entrenador" },
    ]);
    if (membershipsError) throw new Error("No se pudieron crear las membresías E2E de documentos.");

    const coachAuth = await signIn(coachEmail, coachPassword, environment);
    return {
      cleanupPrefix,
      coachStorageState: createStorageState(coachAuth.session, environment.url, coachWorkspace.id),
      coachUserId: coachUser.user.id,
      coachWorkspaceId: coachWorkspace.id,
      managerStorageState: createStorageState(managerAuth.session, environment.url, managerWorkspace.id),
      managerUserId: managerAuth.userId,
      managerWorkspaceId: managerWorkspace.id,
      emptyFilteredSedeId: "",
      youtubeAssets: [],
      youtubeFallbackAsset: { id: "", resourceId: "" },
      googleDriveUnavailableAsset: { id: "", resourceId: "" },
      storageAsset: { id: "", storagePath: "" },
    };
  } catch (error) {
    const cleanupErrors: Error[] = [];
    for (const workspaceId of [managerWorkspace.id, coachWorkspace.id]) {
      try {
        await deleteWorkspaceFixture(client, workspaceId);
      } catch (cleanupError) {
        cleanupErrors.push(
          cleanupError instanceof Error ? cleanupError : new Error("Falló la limpieza inicial E2E de documentos."),
        );
      }
    }
    const { error: userError } = await client.auth.admin.deleteUser(coachUser.user.id);
    if (userError) cleanupErrors.push(new Error(`No se pudo borrar el entrenador temporal E2E: ${userError.message}`));
    if (cleanupErrors.length) {
      const setupError = error instanceof Error ? error.message : "Falló la creación de la fixture E2E de documentos.";
      throw new Error(`${setupError} ${cleanupErrors.map((cleanupError) => cleanupError.message).join(" ")}`);
    }
    throw error;
  }
}

export async function seedDocumentosFixture(fixture: DocumentosFixture): Promise<void> {
  if (fixture.youtubeAssets.length) return;
  const environment = documentosEnvironment();
  const client = serviceClient(environment);
  const resourceIds = Array.from({ length: 11 }, () => resourceId(randomUUID()));
  const fallbackResourceId = resourceId(randomUUID());
  const driveResourceId = `drive${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const storagePath = `${fixture.managerWorkspaceId}/${randomUUID()}/fixture-privado.pdf`;

  const { data: sedes, error: sedesError } = await client.from("sedes").insert([
    { nombre: `${fixture.cleanupPrefix} con contenido`, workspace_id: fixture.managerWorkspaceId },
    { nombre: `${fixture.cleanupPrefix} sin contenido`, workspace_id: fixture.managerWorkspaceId },
  ]).select("id,nombre");
  if (sedesError || !sedes || sedes.length !== 2) throw new Error("No se pudieron crear las sedes de filtro E2E.");
  fixture.emptyFilteredSedeId = sedes.find((sede) => sede.nombre.endsWith(" sin contenido"))?.id ?? "";
  const contentSedeId = sedes.find((sede) => sede.nombre.endsWith(" con contenido"))?.id;
  if (!fixture.emptyFilteredSedeId || !contentSedeId) throw new Error("La fixture E2E no resolvió las sedes de filtro.");

  const { data: youtubeRows, error: youtubeError } = await client
    .from("content_assets")
    .insert(resourceIds.map((value) => youtubeRow(fixture.managerWorkspaceId, fixture.managerUserId, value)))
    .select("id,external_resource_id");
  if (youtubeError || !youtubeRows || youtubeRows.length !== resourceIds.length) {
    throw new Error("No se pudieron crear los vídeos YouTube de la fixture E2E.");
  }
  fixture.youtubeAssets = youtubeRows.map((row) => ({ id: row.id, resourceId: row.external_resource_id ?? "" }));

  const { data: extraAssets, error: extraAssetsError } = await client.from("content_assets").insert([
    youtubeRow(
      fixture.managerWorkspaceId,
      fixture.managerUserId,
      fallbackResourceId,
      "https://www.youtube-nocookie.com/embed/otro-video",
    ),
    {
      workspace_id: fixture.managerWorkspaceId,
      provider: "google_drive",
      status: "unavailable",
      original_url: `https://drive.google.com/file/d/${driveResourceId}/view`,
      external_resource_id: driveResourceId,
      created_by: fixture.managerUserId,
    },
    {
      workspace_id: fixture.managerWorkspaceId,
      provider: "supabase_storage",
      status: "ready",
      storage_path: storagePath,
      size_bytes: 1024,
      mime_type: "application/pdf",
      created_by: fixture.managerUserId,
    },
    {
      workspace_id: fixture.managerWorkspaceId,
      provider: "external_legacy",
      status: "ready",
      original_url: "https://example.invalid/legacy-documento",
      created_by: fixture.managerUserId,
    },
    {
      workspace_id: fixture.coachWorkspaceId,
      provider: "external_legacy",
      status: "ready",
      original_url: "https://example.invalid/solo-entrenador",
      created_by: fixture.coachUserId,
    },
  ]).select("id,provider,external_resource_id,storage_path");
  if (extraAssetsError || !extraAssets || extraAssets.length !== 5) {
    throw new Error("No se pudieron crear los activos adicionales de la fixture E2E.");
  }
  const fallback = extraAssets.find((asset) => asset.provider === "youtube");
  const drive = extraAssets.find((asset) => asset.provider === "google_drive");
  const storage = extraAssets.find((asset) => asset.provider === "supabase_storage");
  const legacy = extraAssets.find((asset) => asset.provider === "external_legacy");
  if (!fallback?.external_resource_id || !drive?.external_resource_id || !storage?.storage_path || !legacy) {
    throw new Error("La fixture E2E no resolvió los activos multifuente.");
  }
  fixture.youtubeFallbackAsset = { id: fallback.id, resourceId: fallback.external_resource_id };
  fixture.googleDriveUnavailableAsset = { id: drive.id, resourceId: drive.external_resource_id };
  fixture.storageAsset = { id: storage.id, storagePath: storage.storage_path };

  const fixtureDocuments = [
    ...fixture.youtubeAssets.map((asset) => ({
      titulo: `${fixture.cleanupPrefix} vídeo ${asset.resourceId}`,
      workspace_id: fixture.managerWorkspaceId,
      content_asset_id: asset.id,
    })),
    {
      titulo: `${fixture.cleanupPrefix} vídeo alternativo`,
      workspace_id: fixture.managerWorkspaceId,
      content_asset_id: fallback.id,
    },
    {
      titulo: `${fixture.cleanupPrefix} enlace Drive`,
      workspace_id: fixture.managerWorkspaceId,
      content_asset_id: drive.id,
    },
    {
      titulo: `${fixture.cleanupPrefix} archivo privado`,
      workspace_id: fixture.managerWorkspaceId,
      content_asset_id: storage.id,
      storage_path: storage.storage_path,
      file_name: "fixture-privado.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
    },
    {
      titulo: `${fixture.cleanupPrefix} enlace legacy`,
      workspace_id: fixture.managerWorkspaceId,
      content_asset_id: legacy.id,
    },
  ];
  const { data: insertedDocuments, error: documentError } = await client
    .from("documentos")
    .insert(fixtureDocuments)
    .select("id,content_asset_id");
  if (documentError || !insertedDocuments || insertedDocuments.length !== fixtureDocuments.length) {
    throw new Error("No se pudieron crear los documentos asociados de la fixture E2E.");
  }
  const { error: documentSedeError } = await client.from("documento_sedes").insert(
    insertedDocuments.map((document) => ({
      documento_id: document.id,
      sede_id: contentSedeId,
    })),
  );
  if (documentSedeError) throw new Error("No se pudo asociar el documento E2E a su sede.");

  await setDocumentosFixtureUsage(fixture, 79);
}

export async function setDocumentosFixtureUsage(fixture: DocumentosFixture, percent: 79 | 80 | 100) {
  const client = serviceClient(documentosEnvironment());
  const limitBytes = 100_000;
  const { error } = await client
    .from("workspace_storage_usage")
    .update({ limit_bytes: limitBytes, reserved_bytes: 0, used_bytes: (limitBytes * percent) / 100 })
    .eq("workspace_id", fixture.managerWorkspaceId);
  if (error) throw new Error("No se pudo preparar el uso de cuota E2E.");
}

export async function cleanupDocumentosFixture(fixture: DocumentosFixture | undefined) {
  if (!fixture) return;
  const client = serviceClient(documentosEnvironment());
  const cleanupErrors: Error[] = [];
  for (const workspaceId of [fixture.managerWorkspaceId, fixture.coachWorkspaceId]) {
    try {
      await deleteWorkspaceFixture(client, workspaceId);
    } catch (error) {
      cleanupErrors.push(error instanceof Error ? error : new Error("Falló la limpieza E2E de documentos."));
    }
  }
  const { error: userError } = await client.auth.admin.deleteUser(fixture.coachUserId);
  if (userError) cleanupErrors.push(new Error(`No se pudo borrar el entrenador temporal E2E: ${userError.message}`));
  if (cleanupErrors.length) throw new Error(cleanupErrors.map((error) => error.message).join(" "));
}

export function storageStateWithActiveSede(storageState: E2EStorageState, sedeId: string): E2EStorageState {
  return {
    ...storageState,
    origins: storageState.origins.map((origin) => ({
      ...origin,
      localStorage: [
        ...origin.localStorage.filter((entry) => entry.name !== ACTIVE_SEDE_KEY),
        { name: ACTIVE_SEDE_KEY, value: sedeId },
      ],
    })),
  };
}
