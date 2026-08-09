BEGIN;

CREATE TEMP TABLE economic_invariants_context (
  workspace_id uuid NOT NULL,
  player_id uuid NOT NULL,
  category_id uuid NOT NULL,
  entry_id uuid NOT NULL,
  account_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO economic_invariants_context VALUES (
  '81111111-0000-0000-0000-000000000001',
  '82222222-0000-0000-0000-000000000001',
  '83333333-0000-0000-0000-000000000001',
  '84444444-0000-0000-0000-000000000001',
  '85555555-0000-0000-0000-000000000001'
);

INSERT INTO public.workspaces (id, name)
SELECT workspace_id, 'economic invariants test fixture'
FROM economic_invariants_context;

INSERT INTO public.jugadores (id, workspace_id, nombre)
SELECT player_id, workspace_id, 'Economic test player'
FROM economic_invariants_context;

INSERT INTO public.economic_categories (id, workspace_id, direction, code, name)
SELECT category_id, workspace_id, 'income', 'economic_invariants_test', 'Economic invariants test'
FROM economic_invariants_context;

INSERT INTO public.economic_entries (
  id, workspace_id, category_id, entry_type, player_id, concept,
  amount_minor, currency_code, issue_date, due_date, lifecycle
)
SELECT
  entry_id, workspace_id, category_id, 'player_charge', player_id, 'Economic invariants test charge',
  10000, 'EUR', current_date, current_date, 'open'
FROM economic_invariants_context;

INSERT INTO public.stripe_connected_accounts (id, workspace_id, stripe_account_id, status)
SELECT account_id, workspace_id, 'acct_economicinvariants', 'active'
FROM economic_invariants_context;

DO $$
DECLARE
  v_context economic_invariants_context%ROWTYPE;
  v_settlement_id uuid;
  v_pending_id uuid;
BEGIN
  SELECT * INTO v_context FROM economic_invariants_context;

  INSERT INTO public.economic_movements (
    workspace_id, entry_id, movement_type, payment_method,
    amount_minor, currency_code, external_status
  ) VALUES (
    v_context.workspace_id, v_context.entry_id, 'settlement', 'cash',
    4000, 'EUR', 'succeeded'
  ) RETURNING id INTO v_settlement_id;

  INSERT INTO public.stripe_payment_attempts (
    workspace_id, entry_id, stripe_connected_account_id, amount_minor, currency_code
  ) VALUES (
    v_context.workspace_id, v_context.entry_id, v_context.account_id, 6000, 'EUR'
  );

  BEGIN
    INSERT INTO public.stripe_payment_attempts (
      workspace_id, entry_id, stripe_connected_account_id, amount_minor, currency_code
    ) VALUES (
      v_context.workspace_id, v_context.entry_id, v_context.account_id, 10000, 'EUR'
    );
    RAISE EXCEPTION 'expected outstanding balance attempt rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'stripe payment attempt amount must equal the entry outstanding balance' THEN
      RAISE;
    END IF;
  END;

  INSERT INTO public.economic_movements (
    workspace_id, entry_id, movement_type, payment_method,
    amount_minor, currency_code, external_status
  ) VALUES (
    v_context.workspace_id, v_context.entry_id, 'settlement', 'cash',
    6001, 'EUR', 'pending'
  ) RETURNING id INTO v_pending_id;

  BEGIN
    UPDATE public.economic_movements
    SET external_status = 'succeeded'
    WHERE id = v_pending_id;
    RAISE EXCEPTION 'expected status update over-settlement rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'economic movement net settled amount exceeds the entry amount' THEN
      RAISE;
    END IF;
  END;

  INSERT INTO public.economic_movements (
    workspace_id, entry_id, original_movement_id, movement_type, payment_method,
    amount_minor, currency_code, external_status
  ) VALUES (
    v_context.workspace_id, v_context.entry_id, v_settlement_id, 'refund', 'cash',
    4000, 'EUR', 'succeeded'
  );

  BEGIN
    INSERT INTO public.economic_movements (
      workspace_id, entry_id, original_movement_id, movement_type, payment_method,
      amount_minor, currency_code, external_status
    ) VALUES (
      v_context.workspace_id, v_context.entry_id, v_settlement_id, 'reversal', 'cash',
      1, 'EUR', 'succeeded'
    );
    RAISE EXCEPTION 'expected original adjustment cap rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'economic movement adjustments exceed their original movement amount' THEN
      RAISE;
    END IF;
  END;
END;
$$;

ROLLBACK;
