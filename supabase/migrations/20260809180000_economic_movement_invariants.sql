BEGIN;

CREATE OR REPLACE FUNCTION public.assert_economic_movement_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry_amount bigint;
  v_entry_currency text;
  v_existing_net_amount bigint;
  v_new_net_amount bigint;
  v_original_entry_id uuid;
  v_original_workspace_id uuid;
  v_original_currency text;
  v_original_status text;
  v_original_amount bigint;
  v_existing_adjustment_amount bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
    OR NEW.entry_id IS DISTINCT FROM OLD.entry_id
    OR NEW.original_movement_id IS DISTINCT FROM OLD.original_movement_id
    OR NEW.movement_type IS DISTINCT FROM OLD.movement_type
    OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
    OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
    OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'economic movements are append-only; only external state may be updated';
  END IF;

  SELECT amount_minor, currency_code
    INTO v_entry_amount, v_entry_currency
  FROM public.economic_entries
  WHERE id = NEW.entry_id
    AND workspace_id = NEW.workspace_id
  FOR UPDATE;

  IF NOT FOUND OR v_entry_currency <> NEW.currency_code THEN
    RAISE EXCEPTION 'economic movement must use its entry workspace and currency';
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN movement_type = 'settlement' THEN amount_minor ELSE -amount_minor END
  ), 0)
    INTO v_existing_net_amount
  FROM public.economic_movements
  WHERE workspace_id = NEW.workspace_id
    AND entry_id = NEW.entry_id
    AND external_status = 'succeeded'
    AND (TG_OP = 'INSERT' OR id <> OLD.id);

  v_new_net_amount := v_existing_net_amount + CASE
    WHEN NEW.external_status = 'succeeded' AND NEW.movement_type = 'settlement' THEN NEW.amount_minor
    WHEN NEW.external_status = 'succeeded' THEN -NEW.amount_minor
    ELSE 0
  END;

  IF v_new_net_amount > v_entry_amount THEN
    RAISE EXCEPTION 'economic movement net settled amount exceeds the entry amount';
  END IF;

  IF NEW.original_movement_id IS NOT NULL THEN
    SELECT entry_id, workspace_id, currency_code, external_status, amount_minor
      INTO v_original_entry_id, v_original_workspace_id, v_original_currency, v_original_status, v_original_amount
    FROM public.economic_movements
    WHERE id = NEW.original_movement_id
    FOR UPDATE;

    IF NOT FOUND
      OR v_original_workspace_id <> NEW.workspace_id
      OR v_original_entry_id <> NEW.entry_id
      OR v_original_currency <> NEW.currency_code
      OR v_original_status <> 'succeeded' THEN
      RAISE EXCEPTION 'economic movement adjustment must reference a succeeded movement of the same entry, workspace and currency';
    END IF;

    SELECT COALESCE(SUM(amount_minor), 0)
      INTO v_existing_adjustment_amount
    FROM public.economic_movements
    WHERE original_movement_id = NEW.original_movement_id
      AND external_status = 'succeeded'
      AND (TG_OP = 'INSERT' OR id <> OLD.id);

    IF v_existing_adjustment_amount
      + CASE WHEN NEW.external_status = 'succeeded' THEN NEW.amount_minor ELSE 0 END
      > v_original_amount THEN
      RAISE EXCEPTION 'economic movement adjustments exceed their original movement amount';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_economic_movements_invariants ON public.economic_movements;
CREATE TRIGGER trg_economic_movements_invariants
  BEFORE INSERT OR UPDATE ON public.economic_movements
  FOR EACH ROW EXECUTE FUNCTION public.assert_economic_movement_invariants();

REVOKE ALL ON FUNCTION public.assert_economic_movement_invariants() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_stripe_payment_attempt_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry_amount bigint;
  v_entry_currency text;
  v_entry_type text;
  v_entry_lifecycle text;
  v_net_amount bigint;
  v_outstanding_amount bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
    OR NEW.entry_id IS DISTINCT FROM OLD.entry_id
    OR NEW.stripe_connected_account_id IS DISTINCT FROM OLD.stripe_connected_account_id
    OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
    OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'stripe payment attempt monetary scope is immutable after creation';
  END IF;

  SELECT amount_minor, currency_code, entry_type, lifecycle
    INTO v_entry_amount, v_entry_currency, v_entry_type, v_entry_lifecycle
  FROM public.economic_entries
  WHERE id = NEW.entry_id
    AND workspace_id = NEW.workspace_id
  FOR UPDATE;

  IF NOT FOUND OR v_entry_currency <> NEW.currency_code THEN
    RAISE EXCEPTION 'stripe payment attempt must match its entry workspace and currency';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stripe_connected_accounts
    WHERE id = NEW.stripe_connected_account_id
      AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'stripe payment attempt account must belong to its workspace';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_entry_type <> 'player_charge' OR v_entry_lifecycle <> 'open' THEN
      RAISE EXCEPTION 'stripe payment attempts require an open player charge';
    END IF;

    SELECT COALESCE(SUM(
      CASE WHEN movement_type = 'settlement' THEN amount_minor ELSE -amount_minor END
    ), 0)
      INTO v_net_amount
    FROM public.economic_movements
    WHERE workspace_id = NEW.workspace_id
      AND entry_id = NEW.entry_id
      AND external_status = 'succeeded';

    v_outstanding_amount := v_entry_amount - v_net_amount;
    IF v_outstanding_amount <= 0 OR v_outstanding_amount <> NEW.amount_minor THEN
      RAISE EXCEPTION 'stripe payment attempt amount must equal the entry outstanding balance';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_stripe_payment_attempt_scope() FROM PUBLIC, anon, authenticated;

COMMIT;
