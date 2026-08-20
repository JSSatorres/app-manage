import type { Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient, type Session } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

loadEnvConfig(process.cwd());

const testEnvPath = `${process.cwd()}/.env.test.local`;
if (existsSync(testEnvPath)) {
  for (const line of readFileSync(testEnvPath, "utf8").split(/\r?\n/)) {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0 || line.startsWith("#")) continue;

    const name = line.slice(0, separatorIndex);
    if (process.env[name] === undefined) {
      process.env[name] = line.slice(separatorIndex + 1);
    }
  }
}

const e2eEmail = process.env.E2E_TEST_EMAIL ?? process.env.TEST_USER_EMAIL;
const e2ePassword = process.env.E2E_TEST_PASSWORD ?? process.env.TEST_USER_PASSWORD;

export const E2E_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const hasE2EAuthCredentials = Boolean(e2eEmail && e2ePassword);
export const missingE2EAuthCredentialsReason =
  "Faltan E2E_TEST_EMAIL/E2E_TEST_PASSWORD o TEST_USER_EMAIL/TEST_USER_PASSWORD para ejecutar pruebas autenticadas.";

export type E2EPasswordRole = "superadmin" | "admin" | "entrenador" | "gerente_sede" | "jugador";

type E2EAuthState = {
  session: Session;
  supabaseUrl: string;
  workspaceId: string;
};

function getRoleCredentials(role: E2EPasswordRole) {
  const rolePrefix = `E2E_${role.toUpperCase()}`;
  const email = process.env[`${rolePrefix}_EMAIL`] ?? (role === "admin" ? e2eEmail : undefined);
  const password = process.env[`${rolePrefix}_PASSWORD`] ?? (role === "admin" ? e2ePassword : undefined);

  if (!email || !password) {
    if (role !== "admin") {
      throw new Error(`Faltan ${rolePrefix}_EMAIL/${rolePrefix}_PASSWORD para ejecutar el E2E de ${role}.`);
    }

    throw new Error(missingE2EAuthCredentialsReason);
  }

  return { email, password };
}

export function getE2EAuthCredentials(role?: E2EPasswordRole) {
  if (role) {
    return getRoleCredentials(role);
  }

  if (!e2eEmail || !e2ePassword) {
    throw new Error(missingE2EAuthCredentialsReason);
  }

  return { email: e2eEmail, password: e2ePassword };
}

function getSupabaseEnvironment() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY para autenticar E2E.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

function getStorageKey(supabaseUrl: string) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
}

async function getPasswordRoleState(role: E2EPasswordRole): Promise<E2EAuthState | undefined> {
  const { email, password } = getE2EAuthCredentials(role);
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnvironment();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

  if (authError || !authData.session || !authData.user) {
    throw new Error("La autenticación E2E por contraseña no devolvió una sesión válida.");
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", authData.user.id)
    .eq("role", role);

  if (membershipsError) {
    throw new Error(`No se pudo resolver el rol E2E ${role}.`);
  }

  const membership = memberships?.[0];
  if (!membership) {
    return undefined;
  }

  return { session: authData.session, supabaseUrl, workspaceId: membership.workspace_id };
}

export async function authenticateE2EPageForRole(page: Page, role: E2EPasswordRole) {
  const authState = await getPasswordRoleState(role);
  if (!authState) {
    return false;
  }

  await page.addInitScript(
    ({ session, storageKey, workspaceId }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.localStorage.setItem("sportapp_active_workspace_id", workspaceId);
    },
    {
      session: authState.session,
      storageKey: getStorageKey(authState.supabaseUrl),
      workspaceId: authState.workspaceId,
    },
  );

  return true;
}

export async function loginAsE2ETestUser(page: Page) {
  const { email, password } = getE2EAuthCredentials();

  await page.goto(`${E2E_BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: /^Entrar$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

export function createE2EInvitationEmail() {
  return `invitado.${Date.now()}@example.invalid`;
}
