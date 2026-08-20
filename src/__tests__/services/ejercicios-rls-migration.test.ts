import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260817120000_fix_ejercicios_mutate_rls.sql",
);
const legacyMigrationPath = resolve(process.cwd(), "supabase/migrations/021_rls_por_rol.sql");

function normalizeSql(sql: string) {
  return sql.replace(/\r\n/g, "\n").trim();
}

function getLegacyEjerciciosPolicy(sql: string) {
  const match = sql.match(
    /DROP POLICY IF EXISTS "ejercicios_mutate" ON public\.ejercicios;[\s\S]*?\n\);/,
  );

  if (!match) {
    throw new Error("No se encontr\u00f3 la policy hist\u00f3rica ejercicios_mutate en la migraci\u00f3n 021.");
  }

  return match[0];
}

describe("migraci\u00f3n RLS de mutaciones de ejercicios", () => {
  it("reemplaza la policy hist\u00f3rica por tres policies con el scope de rol y sede", () => {
    const migration = normalizeSql(readFileSync(migrationPath, "utf8"));
    const rollbackStart = migration.indexOf("/*\nRollback literal");
    const policySql = rollbackStart === -1 ? migration : migration.slice(0, rollbackStart);

    expect(policySql).toMatch(/^--[\s\S]*BEGIN;/);
    expect(migration).toMatch(/COMMIT;$/);
    expect(policySql).toContain('DROP POLICY IF EXISTS "ejercicios_mutate" ON public.ejercicios;');

    expect(policySql).toMatch(
      /CREATE POLICY "ejercicios_insert_role_scope" ON public\.ejercicios FOR INSERT TO authenticated\s+WITH CHECK \(/,
    );
    expect(policySql).toMatch(
      /CREATE POLICY "ejercicios_update_role_scope" ON public\.ejercicios FOR UPDATE TO authenticated\s+USING \([\s\S]*?\)\s+WITH CHECK \(/,
    );
    expect(policySql).toMatch(
      /CREATE POLICY "ejercicios_delete_role_scope" ON public\.ejercicios FOR DELETE TO authenticated\s+USING \(/,
    );

    for (const policyName of [
      "ejercicios_insert_role_scope",
      "ejercicios_update_role_scope",
      "ejercicios_delete_role_scope",
    ]) {
      expect(policySql).toContain(
        `DROP POLICY IF EXISTS "${policyName}" ON public.ejercicios;`,
      );
    }

    expect(policySql.match(/public\.current_user_rol\(\) = 'SuperAdmin'/g)).toHaveLength(4);
    expect(policySql.match(/public\.current_user_rol\(\) IN \('AdminSede', 'Entrenador'\)/g)).toHaveLength(4);
    expect(policySql.match(/public\.current_user_ws_role\(workspace_id\) = 'admin'/g)).toHaveLength(4);
    expect(policySql.match(/es_global IS TRUE/g)).toHaveLength(8);
    expect(policySql.match(/sede_propietaria_id IS NULL/g)).toHaveLength(8);
    expect(policySql.match(/sede_propietaria_id = public\.current_user_sede_id\(\)/g)).toHaveLength(4);
    expect(policySql.match(/sedes\.workspace_id = ejercicios\.workspace_id/g)).toHaveLength(4);

    expect(policySql).not.toMatch(/public\.(documentos|ejercicio_documentos)/);
    expect(policySql).not.toMatch(/\bGRANT\b/i);
    expect(policySql).not.toMatch(/ALTER PUBLICATION/i);
    expect(policySql).not.toMatch(/workspace_id IS NULL/);
    expect(policySql).not.toMatch(/gerente_sede/);
  });

  it("conserva el rollback literal de la policy 021", () => {
    const migration = normalizeSql(readFileSync(migrationPath, "utf8"));
    const legacyMigration = readFileSync(legacyMigrationPath, "utf8");

    expect(migration).toContain(normalizeSql(getLegacyEjerciciosPolicy(legacyMigration)));
  });
});
