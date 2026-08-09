import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260809180000_economic_movement_invariants.sql",
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("economic movement invariants migration contract", () => {
  it("serializes inserts and status updates against the economic entry", () => {
    const sql = readMigration();

    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.assert_economic_movement_invariants()");
    expect(sql).toContain("FOR UPDATE;");
    expect(sql).toContain("BEFORE INSERT OR UPDATE ON public.economic_movements");
    expect(sql).toContain("FOR EACH ROW EXECUTE FUNCTION public.assert_economic_movement_invariants();");
    expect(sql).toContain("external_status = 'succeeded'");
    expect(sql).toContain("economic movement net settled amount exceeds the entry amount");
  });

  it("keeps original adjustments scoped, succeeded and capped", () => {
    const sql = readMigration();

    expect(sql).toContain("original_movement_id");
    expect(sql).toContain("v_original_status <> 'succeeded'");
    expect(sql).toContain("v_original_entry_id <> NEW.entry_id");
    expect(sql).toContain("v_original_currency <> NEW.currency_code");
    expect(sql).toContain("economic movement adjustments exceed their original movement amount");
  });

  it("creates Stripe attempts only for the locked current outstanding balance", () => {
    const sql = readMigration();

    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.assert_stripe_payment_attempt_scope()");
    expect(sql).toContain("v_entry_type <> 'player_charge'");
    expect(sql).toContain("v_entry_lifecycle <> 'open'");
    expect(sql).toContain("v_outstanding_amount <> NEW.amount_minor");
    expect(sql).toContain("stripe payment attempt amount must equal the entry outstanding balance");
  });
});
