import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  authenticateE2EPageForRole,
  E2E_BASE_URL,
  getE2EAuthCredentials,
  type E2EPasswordRole,
} from "./support/auth";

type RoleScope = { workspaceId: string; sedeId: string; otherSedeId?: string };
type PasswordRole = E2EPasswordRole;

type RlsFixture = {
  admin: Required<RoleScope>;
  superadmin: RoleScope;
  entrenador: Required<RoleScope>;
  gerente_sede: RoleScope;
  jugador: RoleScope;
  otherWorkspaceId: string;
};

const CREATED_BY_TEST_PREFIX = "E2E ejercicios RLS";

let fixture: RlsFixture;
let clients: Record<PasswordRole, SupabaseClient<Database>>;
let anonymousClient: SupabaseClient<Database>;

function requireEnvironment(...names: string[]) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`El E2E RLS requiere configurar: ${missing.join(", ")}.`);
  }

  return Object.fromEntries(names.map((name) => [name, process.env[name]!])) as Record<string, string>;
}

async function authenticate(role: PasswordRole) {
  const { email, password } = getE2EAuthCredentials(role);
  const environment = requireEnvironment("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const client = createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    throw new Error(`No se pudo autenticar el actor E2E ${role}.`);
  }

  return { client, userId: data.user.id };
}

async function resolveScope(client: SupabaseClient<Database>, userId: string): Promise<RoleScope> {
  const { data: user, error: userError } = await client
    .from("usuarios")
    .select("sede_id")
    .eq("id", userId)
    .single();

  if (userError || !user?.sede_id) {
    throw new Error("No se pudo resolver la sede del actor E2E autenticado.");
  }

  const { data: sede, error: sedeError } = await client
    .from("sedes")
    .select("id,workspace_id")
    .eq("id", user.sede_id)
    .single();

  if (sedeError || !sede) {
    throw new Error("No se pudo resolver el workspace de la sede del actor E2E autenticado.");
  }

  return { workspaceId: sede.workspace_id, sedeId: sede.id };
}

async function resolveOtherSedeId(client: SupabaseClient<Database>, scope: RoleScope) {
  const { data, error } = await client
    .from("sedes")
    .select("id")
    .eq("workspace_id", scope.workspaceId)
    .neq("id", scope.sedeId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("El E2E RLS requiere una segunda sede visible para el SuperAdmin en el workspace de prueba.");
  }

  return data.id;
}

async function resolveOtherWorkspaceId(client: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await client
    .from("workspaces")
    .select("id")
    .neq("id", workspaceId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("El E2E RLS requiere un segundo workspace visible para el SuperAdmin.");
  }

  return data.id;
}

async function resolveFixture(
  authenticated: Record<PasswordRole, { client: SupabaseClient<Database>; userId: string }>,
): Promise<RlsFixture> {
  const [superadmin, admin, entrenador, gerente_sede, jugador] = await Promise.all([
    resolveScope(authenticated.superadmin.client, authenticated.superadmin.userId),
    resolveScope(authenticated.admin.client, authenticated.admin.userId),
    resolveScope(authenticated.entrenador.client, authenticated.entrenador.userId),
    resolveScope(authenticated.gerente_sede.client, authenticated.gerente_sede.userId),
    resolveScope(authenticated.jugador.client, authenticated.jugador.userId),
  ]);
  const [adminOtherSedeId, entrenadorOtherSedeId, otherWorkspaceId] = await Promise.all([
    resolveOtherSedeId(authenticated.superadmin.client, admin),
    resolveOtherSedeId(authenticated.superadmin.client, entrenador),
    resolveOtherWorkspaceId(authenticated.superadmin.client, admin.workspaceId),
  ]);

  return {
    admin: { ...admin, otherSedeId: adminOtherSedeId },
    superadmin,
    entrenador: { ...entrenador, otherSedeId: entrenadorOtherSedeId },
    gerente_sede,
    jugador,
    otherWorkspaceId,
  };
}

function exerciseInput(scope: RoleScope, suffix: string, global = false) {
  return {
    titulo: `${CREATED_BY_TEST_PREFIX} ${suffix} ${randomUUID()}`,
    workspace_id: scope.workspaceId,
    es_global: global,
    sede_propietaria_id: global ? null : scope.sedeId,
  };
}

async function insertExercise(
  client: SupabaseClient<Database>,
  scope: RoleScope,
  suffix: string,
  global = false,
) {
  return client
    .from("ejercicios")
    .insert(exerciseInput(scope, suffix, global))
    .select("id,titulo,workspace_id,es_global,sede_propietaria_id")
    .single();
}

async function expectRlsInsertDenied(
  client: SupabaseClient<Database>,
  input: Database["public"]["Tables"]["ejercicios"]["Insert"],
) {
  const { data, error } = await client.from("ejercicios").insert(input).select("id");

  expect(data).toBeNull();
  expect(error?.code).toBe("42501");
}

async function deleteExercise(client: SupabaseClient<Database>, exerciseId: string) {
  const { error } = await client.from("ejercicios").delete().eq("id", exerciseId);
  expect(error).toBeNull();
}

async function expectRlsUpdateAndDeleteFiltered(client: SupabaseClient<Database>, exerciseId: string) {
  const { data: updated, error: updateError } = await client
    .from("ejercicios")
    .update({ titulo: `${CREATED_BY_TEST_PREFIX} intento denegado ${randomUUID()}` })
    .eq("id", exerciseId)
    .select("id");
  expect(updateError).toBeNull();
  expect(updated).toEqual([]);

  const { data: deleted, error: deleteError } = await client
    .from("ejercicios")
    .delete()
    .eq("id", exerciseId)
    .select("id");
  expect(deleteError).toBeNull();
  expect(deleted).toEqual([]);
}

async function assertAllowedLifecycle(
  client: SupabaseClient<Database>,
  scope: RoleScope,
  suffix: string,
  transition: Database["public"]["Tables"]["ejercicios"]["Update"],
  global = false,
) {
  const { data: created, error: createError } = await insertExercise(client, scope, suffix, global);
  expect(createError).toBeNull();
  if (!created) throw new Error(`El actor ${suffix} no devolvi\u00f3 la fila autorizada.`);

  const { data: updated, error: updateError } = await client
    .from("ejercicios")
    .update(transition)
    .eq("id", created.id)
    .select("id,workspace_id,es_global,sede_propietaria_id")
    .single();
  expect(updateError).toBeNull();
  expect(updated?.id).toBe(created.id);

  await deleteExercise(client, created.id);
}

async function createDocumento(
  client: SupabaseClient<Database>,
  workspaceId: string,
  sedeId: string | null,
  label: string,
) {
  const { data, error } = await client
    .from("documentos")
    .insert({
      titulo: `${CREATED_BY_TEST_PREFIX} ${label} ${randomUUID()}`,
      workspace_id: workspaceId,
      sede_id: sedeId,
      source_type: "link",
      external_url: `https://example.invalid/${randomUUID()}`,
      visible_entrenadores: true,
    })
    .select("id,titulo,workspace_id,sede_id")
    .single();

  expect(error).toBeNull();
  if (!data) throw new Error(`No se pudo crear el documento E2E ${label}.`);
  return data;
}

async function deleteDocumentos(client: SupabaseClient<Database>, documentIds: string[]) {
  const { error } = await client.from("documentos").delete().in("id", documentIds);
  expect(error).toBeNull();
}

async function setAdminScope(page: Page) {
  const authenticated = await authenticateE2EPageForRole(page, "admin");
  if (!authenticated) {
    throw new Error("La identidad E2E admin no tiene una membresía admin para el E2E RLS.");
  }

  await page.addInitScript(
    ({ workspaceId, sedeId }) => {
      window.localStorage.setItem("sportapp_active_workspace_id", workspaceId);
      window.localStorage.setItem("sportapp_active_sede_id", sedeId);
    },
    fixture.admin,
  );
}

test.describe("Ejercicios: documentos disponibles y RLS", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const authenticated = {
      superadmin: await authenticate("superadmin"),
      admin: await authenticate("admin"),
      entrenador: await authenticate("entrenador"),
      gerente_sede: await authenticate("gerente_sede"),
      jugador: await authenticate("jugador"),
    };
    clients = {
      superadmin: authenticated.superadmin.client,
      admin: authenticated.admin.client,
      entrenador: authenticated.entrenador.client,
      gerente_sede: authenticated.gerente_sede.client,
      jugador: authenticated.jugador.client,
    };
    fixture = await resolveFixture(authenticated);
    const environment = requireEnvironment("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
    anonymousClient = createClient<Database>(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });

  test("el admin ve solo documentos globales y de su sede, guarda un ejercicio global y conserva pivotes", async ({ page }) => {
    const globalDocument = await createDocumento(clients.admin, fixture.admin.workspaceId, null, "global");
    const currentSedeDocument = await createDocumento(
      clients.admin,
      fixture.admin.workspaceId,
      fixture.admin.sedeId,
      "sede activa",
    );
    const otherSedeDocument = await createDocumento(
      clients.superadmin,
      fixture.admin.workspaceId,
      fixture.admin.otherSedeId,
      "otra sede",
    );
    const uiTitle = `${CREATED_BY_TEST_PREFIX} UI global ${randomUUID()}`;
    let uiExerciseId: string | undefined;

    try {
      await setAdminScope(page);
      await page.goto(`${E2E_BASE_URL}/ejercicios`);
      await expect(page.getByRole("heading", { name: "Ejercicios", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Nuevo", exact: true }).click();

      const dialog = page.getByRole("dialog", { name: "Nuevo ejercicio" });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("T\u00edtulo").fill(uiTitle);
      await dialog.getByRole("button", { name: /todos/i }).click();
      await expect(dialog.getByText(globalDocument.titulo, { exact: true })).toBeVisible();
      await expect(dialog.getByText(currentSedeDocument.titulo, { exact: true })).toBeVisible();
      await expect(dialog.getByText(otherSedeDocument.titulo, { exact: true })).toHaveCount(0);
      await dialog.getByText(globalDocument.titulo, { exact: true }).click();
      await dialog.getByText(currentSedeDocument.titulo, { exact: true }).click();
      await dialog.getByRole("switch", { name: /global/i }).click();
      await dialog.getByRole("button", { name: /guardar cambios/i }).click();
      await expect(dialog).toHaveCount(0);

      const { data: exercise, error: exerciseError } = await clients.admin
        .from("ejercicios")
        .select("id,workspace_id,es_global,sede_propietaria_id")
        .eq("titulo", uiTitle)
        .single();
      expect(exerciseError).toBeNull();
      expect(exercise).toMatchObject({
        workspace_id: fixture.admin.workspaceId,
        es_global: true,
        sede_propietaria_id: null,
      });
      if (!exercise) throw new Error("No se encontr\u00f3 el ejercicio global creado desde la UI.");
      uiExerciseId = exercise.id;

      const { data: pivots, error: pivotsError } = await clients.admin
        .from("ejercicio_documentos")
        .select("documento_id")
        .eq("ejercicio_id", exercise.id);
      expect(pivotsError).toBeNull();
      expect(pivots?.map((pivot) => pivot.documento_id).sort()).toEqual(
        [globalDocument.id, currentSedeDocument.id].sort(),
      );
    } finally {
      if (!uiExerciseId) {
        const { data } = await clients.admin.from("ejercicios").select("id").eq("titulo", uiTitle);
        uiExerciseId = data?.[0]?.id;
      }
      if (uiExerciseId) await deleteExercise(clients.admin, uiExerciseId);
      await deleteDocumentos(clients.admin, [globalDocument.id, currentSedeDocument.id]);
      await deleteDocumentos(clients.superadmin, [otherSedeDocument.id]);
    }
  });

  test("la matriz RLS permite los alcances autorizados y deniega roles, sedes y tenants ajenos", async () => {
    await assertAllowedLifecycle(clients.superadmin, fixture.superadmin, "superadmin global a sede", {
      es_global: false,
      sede_propietaria_id: fixture.superadmin.sedeId,
    }, true);
    await assertAllowedLifecycle(clients.admin, fixture.admin, "admin sede a global", {
      es_global: true,
      sede_propietaria_id: null,
    });
    await assertAllowedLifecycle(clients.entrenador, fixture.entrenador, "entrenador sede", {
      titulo: `${CREATED_BY_TEST_PREFIX} entrenador actualizado ${randomUUID()}`,
    });

    const deniedRows = [] as string[];
    const createDeniedRow = async (scope: RoleScope, suffix: string, global = false) => {
      const { data, error } = await insertExercise(clients.superadmin, scope, suffix, global);
      expect(error).toBeNull();
      if (!data) throw new Error(`No se pudo preparar la fila RLS ${suffix}.`);
      deniedRows.push(data.id);
      return data.id;
    };

    try {
      const entrenadorGlobalId = await createDeniedRow(fixture.entrenador, "entrenador global denegado", true);
      const entrenadorOtraSedeId = await createDeniedRow(
        { ...fixture.entrenador, sedeId: fixture.entrenador.otherSedeId },
        "entrenador otra sede denegado",
      );
      const gerenteGlobalId = await createDeniedRow(fixture.gerente_sede, "gerente global denegado", true);
      const jugadorSedeId = await createDeniedRow(fixture.jugador, "jugador sede denegado");
      const anonimoSedeId = await createDeniedRow(fixture.admin, "anonimo denegado");
      const otroTenantGlobalId = await createDeniedRow(
        { workspaceId: fixture.otherWorkspaceId, sedeId: fixture.admin.sedeId },
        "otro tenant denegado",
        true,
      );

      await expectRlsInsertDenied(clients.entrenador, exerciseInput(fixture.entrenador, "entrenador global denegado", true));
      await expectRlsInsertDenied(clients.entrenador, {
        ...exerciseInput(fixture.entrenador, "entrenador otra sede denegado"),
        sede_propietaria_id: fixture.entrenador.otherSedeId,
      });
      await expectRlsInsertDenied(clients.gerente_sede, exerciseInput(fixture.gerente_sede, "gerente global denegado", true));
      await expectRlsInsertDenied(clients.jugador, exerciseInput(fixture.jugador, "jugador sede denegado"));
      await expectRlsInsertDenied(anonymousClient, exerciseInput(fixture.admin, "anonimo denegado"));
      await expectRlsInsertDenied(clients.admin, {
        ...exerciseInput(fixture.admin, "otro tenant denegado", true),
        workspace_id: fixture.otherWorkspaceId,
      });

      await expectRlsUpdateAndDeleteFiltered(clients.entrenador, entrenadorGlobalId);
      await expectRlsUpdateAndDeleteFiltered(clients.entrenador, entrenadorOtraSedeId);
      await expectRlsUpdateAndDeleteFiltered(clients.gerente_sede, gerenteGlobalId);
      await expectRlsUpdateAndDeleteFiltered(clients.jugador, jugadorSedeId);
      await expectRlsUpdateAndDeleteFiltered(anonymousClient, anonimoSedeId);
      await expectRlsUpdateAndDeleteFiltered(clients.admin, otroTenantGlobalId);
    } finally {
      for (const exerciseId of deniedRows) {
        await deleteExercise(clients.superadmin, exerciseId);
      }
    }
  });
});
