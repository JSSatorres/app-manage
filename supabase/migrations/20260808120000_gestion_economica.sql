BEGIN;

-- Gestión económica multi-tenant. Esta migración no expone secretos de Stripe.

CREATE TABLE IF NOT EXISTS public.economic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  currency_code text NOT NULL DEFAULT 'EUR' CHECK (currency_code ~ '^[A-Z]{3}$'),
  timezone text NOT NULL DEFAULT 'Europe/Madrid' CHECK (length(timezone) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.economic_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('income', 'expense')),
  code text NOT NULL CHECK (code ~ '^[a-z0-9_]+$'),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  is_predefined boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT economic_categories_workspace_direction_code_key UNIQUE (workspace_id, direction, code),
  CONSTRAINT economic_categories_id_workspace_key UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.economic_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.economic_categories(id) ON DELETE RESTRICT,
  entry_type text NOT NULL CHECK (entry_type IN ('player_charge', 'income', 'expense')),
  player_id uuid REFERENCES public.jugadores(id) ON DELETE RESTRICT,
  concept text NOT NULL CHECK (length(btrim(concept)) > 0),
  counterparty_name text,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
  currency_code text NOT NULL DEFAULT 'EUR' CHECK (currency_code ~ '^[A-Z]{3}$'),
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  next_due_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT economic_schedules_id_workspace_key UNIQUE (id, workspace_id),
  CONSTRAINT economic_schedules_target_check CHECK (
    (entry_type = 'player_charge' AND player_id IS NOT NULL AND counterparty_name IS NULL)
    OR (entry_type = 'income' AND player_id IS NULL)
    OR (entry_type = 'expense' AND player_id IS NULL AND counterparty_name IS NOT NULL)
  ),
  CONSTRAINT economic_schedules_end_date_check CHECK (end_date IS NULL OR end_date >= next_due_date),
  CONSTRAINT economic_schedules_category_workspace_fkey
    FOREIGN KEY (category_id, workspace_id)
    REFERENCES public.economic_categories(id, workspace_id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.economic_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.economic_categories(id) ON DELETE RESTRICT,
  schedule_id uuid,
  period_key text,
  entry_type text NOT NULL CHECK (entry_type IN ('player_charge', 'income', 'expense')),
  player_id uuid REFERENCES public.jugadores(id) ON DELETE RESTRICT,
  concept text NOT NULL CHECK (length(btrim(concept)) > 0),
  counterparty_name text,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
  currency_code text NOT NULL DEFAULT 'EUR' CHECK (currency_code ~ '^[A-Z]{3}$'),
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  lifecycle text NOT NULL DEFAULT 'draft' CHECK (lifecycle IN ('draft', 'open', 'cancelled')),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancellation_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT economic_entries_id_workspace_key UNIQUE (id, workspace_id),
  CONSTRAINT economic_entries_target_check CHECK (
    (entry_type = 'player_charge' AND player_id IS NOT NULL AND counterparty_name IS NULL)
    OR (entry_type = 'income' AND player_id IS NULL)
    OR (entry_type = 'expense' AND player_id IS NULL AND counterparty_name IS NOT NULL)
  ),
  CONSTRAINT economic_entries_due_date_check CHECK (due_date >= issue_date),
  CONSTRAINT economic_entries_schedule_period_check CHECK (
    (schedule_id IS NULL AND period_key IS NULL)
    OR (schedule_id IS NOT NULL AND period_key IS NOT NULL AND length(btrim(period_key)) > 0)
  ),
  CONSTRAINT economic_entries_cancellation_check CHECK (
    (lifecycle = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL
      AND cancellation_reason IS NOT NULL AND length(btrim(cancellation_reason)) > 0)
    OR (lifecycle <> 'cancelled' AND cancelled_at IS NULL AND cancelled_by IS NULL AND cancellation_reason IS NULL)
  ),
  CONSTRAINT economic_entries_category_workspace_fkey
    FOREIGN KEY (category_id, workspace_id)
    REFERENCES public.economic_categories(id, workspace_id)
    ON DELETE RESTRICT,
  CONSTRAINT economic_entries_schedule_workspace_fkey
    FOREIGN KEY (schedule_id, workspace_id)
    REFERENCES public.economic_schedules(id, workspace_id)
    ON DELETE RESTRICT,
  CONSTRAINT economic_entries_schedule_period_key UNIQUE (schedule_id, period_key)
);

CREATE TABLE IF NOT EXISTS public.economic_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.economic_entries(id) ON DELETE CASCADE,
  original_movement_id uuid REFERENCES public.economic_movements(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('settlement', 'refund', 'reversal')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'stripe', 'other')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  external_status text NOT NULL DEFAULT 'succeeded' CHECK (external_status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  external_reference text,
  occurred_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT economic_movements_id_workspace_key UNIQUE (id, workspace_id),
  CONSTRAINT economic_movements_original_check CHECK (
    (movement_type = 'settlement' AND original_movement_id IS NULL)
    OR (movement_type IN ('refund', 'reversal') AND original_movement_id IS NOT NULL)
  ),
  CONSTRAINT economic_movements_entry_workspace_fkey
    FOREIGN KEY (entry_id, workspace_id)
    REFERENCES public.economic_entries(id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.economic_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN (
    'economic_settings', 'economic_categories', 'economic_schedules', 'economic_entries',
    'economic_movements', 'stripe_connected_accounts', 'stripe_payment_attempts'
  )),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE CHECK (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  dashboard_access text NOT NULL DEFAULT 'full' CHECK (dashboard_access IN ('full')),
  controller_configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  details_submitted boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'restricted', 'active', 'disabled')),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stripe_connected_accounts_id_workspace_key UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.stripe_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.economic_entries(id) ON DELETE RESTRICT,
  stripe_connected_account_id uuid NOT NULL REFERENCES public.stripe_connected_accounts(id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  idempotency_key uuid NOT NULL DEFAULT gen_random_uuid(),
  checkout_session_id text UNIQUE CHECK (checkout_session_id IS NULL OR checkout_session_id ~ '^cs_[A-Za-z0-9_]+$'),
  payment_intent_id text UNIQUE CHECK (payment_intent_id IS NULL OR payment_intent_id ~ '^pi_[A-Za-z0-9_]+$'),
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'open', 'processing', 'succeeded', 'failed', 'expired', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stripe_payment_attempts_workspace_idempotency_key UNIQUE (workspace_id, idempotency_key),
  CONSTRAINT stripe_payment_attempts_entry_workspace_fkey
    FOREIGN KEY (entry_id, workspace_id)
    REFERENCES public.economic_entries(id, workspace_id)
    ON DELETE RESTRICT,
  CONSTRAINT stripe_payment_attempts_account_workspace_fkey
    FOREIGN KEY (stripe_connected_account_id, workspace_id)
    REFERENCES public.stripe_connected_accounts(id, workspace_id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  event_id text NOT NULL UNIQUE CHECK (event_id ~ '^evt_[A-Za-z0-9_]+$'),
  stripe_account_id text CHECK (stripe_account_id IS NULL OR stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
  object_id text,
  processing_status text NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processed', 'failed', 'ignored')),
  processing_attempts integer NOT NULL DEFAULT 0 CHECK (processing_attempts >= 0),
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stripe_webhook_events_processed_at_check CHECK (
    (processing_status = 'processed' AND processed_at IS NOT NULL)
    OR (processing_status <> 'processed' AND processed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_economic_categories_workspace_active
  ON public.economic_categories (workspace_id, direction, is_active, name);
CREATE INDEX IF NOT EXISTS idx_economic_schedules_workspace_status_next_due
  ON public.economic_schedules (workspace_id, status, next_due_date);
CREATE INDEX IF NOT EXISTS idx_economic_entries_workspace_type_due
  ON public.economic_entries (workspace_id, entry_type, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_economic_entries_workspace_player_due
  ON public.economic_entries (workspace_id, player_id, due_date DESC)
  WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_economic_entries_workspace_category_issue
  ON public.economic_entries (workspace_id, category_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_economic_movements_workspace_entry_created
  ON public.economic_movements (workspace_id, entry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economic_movements_original
  ON public.economic_movements (original_movement_id)
  WHERE original_movement_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_economic_movements_workspace_external_reference
  ON public.economic_movements (workspace_id, external_reference)
  WHERE external_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_economic_audit_events_workspace_entity_created
  ON public.economic_audit_events (workspace_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_attempts_workspace_status_created
  ON public.stripe_payment_attempts (workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_account_status_received
  ON public.stripe_webhook_events (stripe_account_id, processing_status, received_at);

CREATE OR REPLACE FUNCTION public.assert_economic_schedule_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_direction text;
BEGIN
  SELECT direction INTO v_direction
  FROM public.economic_categories
  WHERE id = NEW.category_id AND workspace_id = NEW.workspace_id;

  IF NOT FOUND OR v_direction <> (CASE WHEN NEW.entry_type = 'expense' THEN 'expense' ELSE 'income' END) THEN
    RAISE EXCEPTION 'economic schedule category must belong to its workspace and direction';
  END IF;

  IF NEW.player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.jugadores WHERE id = NEW.player_id AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'economic schedule player must belong to its workspace';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_economic_entry_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_direction text;
BEGIN
  SELECT direction INTO v_direction
  FROM public.economic_categories
  WHERE id = NEW.category_id AND workspace_id = NEW.workspace_id;

  IF NOT FOUND OR v_direction <> (CASE WHEN NEW.entry_type = 'expense' THEN 'expense' ELSE 'income' END) THEN
    RAISE EXCEPTION 'economic entry category must belong to its workspace and direction';
  END IF;

  IF NEW.player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.jugadores WHERE id = NEW.player_id AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'economic entry player must belong to its workspace';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_economic_movement_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry_currency text;
  v_original_entry_id uuid;
BEGIN
  SELECT currency_code INTO v_entry_currency
  FROM public.economic_entries
  WHERE id = NEW.entry_id AND workspace_id = NEW.workspace_id;

  IF NOT FOUND OR v_entry_currency <> NEW.currency_code THEN
    RAISE EXCEPTION 'economic movement must use its entry workspace and currency';
  END IF;

  IF NEW.original_movement_id IS NOT NULL THEN
    SELECT entry_id INTO v_original_entry_id
    FROM public.economic_movements
    WHERE id = NEW.original_movement_id AND workspace_id = NEW.workspace_id;

    IF NOT FOUND OR v_original_entry_id <> NEW.entry_id THEN
      RAISE EXCEPTION 'economic movement adjustment must reference a movement of the same entry and workspace';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_stripe_payment_attempt_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry_amount bigint;
  v_entry_currency text;
BEGIN
  SELECT amount_minor, currency_code INTO v_entry_amount, v_entry_currency
  FROM public.economic_entries
  WHERE id = NEW.entry_id AND workspace_id = NEW.workspace_id;

  IF NOT FOUND OR v_entry_amount <> NEW.amount_minor OR v_entry_currency <> NEW.currency_code THEN
    RAISE EXCEPTION 'stripe payment attempt must match its entry workspace, amount and currency';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stripe_connected_accounts
    WHERE id = NEW.stripe_connected_account_id AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'stripe payment attempt account must belong to its workspace';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_predefined_economic_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.is_predefined THEN
    RAISE EXCEPTION 'predefined economic categories cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_economic_defaults(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.economic_settings (workspace_id)
  VALUES (p_workspace_id)
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.economic_categories (workspace_id, direction, code, name, is_predefined)
  VALUES
    (p_workspace_id, 'income', 'player_fees', 'Cuotas de jugadores', true),
    (p_workspace_id, 'income', 'registrations', 'Matrículas/altas', true),
    (p_workspace_id, 'income', 'passed_through_licenses', 'Licencias repercutidas', true),
    (p_workspace_id, 'income', 'camps_tournaments', 'Campus/torneos', true),
    (p_workspace_id, 'income', 'tickets', 'Entradas', true),
    (p_workspace_id, 'income', 'merchandising', 'Merchandising', true),
    (p_workspace_id, 'income', 'sponsorship_advertising', 'Patrocinio/publicidad', true),
    (p_workspace_id, 'income', 'grants', 'Subvenciones', true),
    (p_workspace_id, 'income', 'donations', 'Donaciones', true),
    (p_workspace_id, 'income', 'facility_rentals', 'Alquiler/cesión de instalaciones', true),
    (p_workspace_id, 'income', 'other_income', 'Otros ingresos', true),
    (p_workspace_id, 'expense', 'facilities', 'Instalaciones', true),
    (p_workspace_id, 'expense', 'equipment', 'Material/equipación', true),
    (p_workspace_id, 'expense', 'refereeing', 'Arbitraje', true),
    (p_workspace_id, 'expense', 'federation_licenses', 'Licencias/federación', true),
    (p_workspace_id, 'expense', 'travel_accommodation', 'Desplazamientos/alojamiento', true),
    (p_workspace_id, 'expense', 'staff_collaborators', 'Personal/colaboradores', true),
    (p_workspace_id, 'expense', 'insurance', 'Seguros', true),
    (p_workspace_id, 'expense', 'technology', 'Tecnología', true),
    (p_workspace_id, 'expense', 'marketing_communications', 'Marketing/comunicación', true),
    (p_workspace_id, 'expense', 'tournaments_events', 'Torneos/eventos', true),
    (p_workspace_id, 'expense', 'other_expenses', 'Otros gastos', true)
  ON CONFLICT (workspace_id, direction, code) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_economic_defaults_for_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.ensure_economic_defaults(NEW.id);
  RETURN NEW;
END;
$$;

SELECT public.ensure_economic_defaults(id)
FROM public.workspaces;

CREATE OR REPLACE FUNCTION public.write_economic_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row jsonb;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  INSERT INTO public.economic_audit_events (
    workspace_id,
    entity_type,
    entity_id,
    action,
    actor_id,
    old_data,
    new_data
  )
  VALUES (
    (v_row ->> 'workspace_id')::uuid,
    TG_TABLE_NAME,
    (v_row ->> 'id')::uuid,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_economic_schedules_scope ON public.economic_schedules;
CREATE TRIGGER trg_economic_schedules_scope
  BEFORE INSERT OR UPDATE ON public.economic_schedules
  FOR EACH ROW EXECUTE FUNCTION public.assert_economic_schedule_scope();

DROP TRIGGER IF EXISTS trg_economic_entries_scope ON public.economic_entries;
CREATE TRIGGER trg_economic_entries_scope
  BEFORE INSERT OR UPDATE ON public.economic_entries
  FOR EACH ROW EXECUTE FUNCTION public.assert_economic_entry_scope();

DROP TRIGGER IF EXISTS trg_economic_movements_scope ON public.economic_movements;
CREATE TRIGGER trg_economic_movements_scope
  BEFORE INSERT OR UPDATE ON public.economic_movements
  FOR EACH ROW EXECUTE FUNCTION public.assert_economic_movement_scope();

DROP TRIGGER IF EXISTS trg_stripe_payment_attempts_scope ON public.stripe_payment_attempts;
CREATE TRIGGER trg_stripe_payment_attempts_scope
  BEFORE INSERT OR UPDATE ON public.stripe_payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.assert_stripe_payment_attempt_scope();

DROP TRIGGER IF EXISTS trg_economic_categories_protect_predefined ON public.economic_categories;
CREATE TRIGGER trg_economic_categories_protect_predefined
  BEFORE DELETE ON public.economic_categories
  FOR EACH ROW EXECUTE FUNCTION public.protect_predefined_economic_category();

DROP TRIGGER IF EXISTS trg_economic_settings_updated_at ON public.economic_settings;
CREATE TRIGGER trg_economic_settings_updated_at
  BEFORE UPDATE ON public.economic_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_economic_categories_updated_at ON public.economic_categories;
CREATE TRIGGER trg_economic_categories_updated_at
  BEFORE UPDATE ON public.economic_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_economic_schedules_updated_at ON public.economic_schedules;
CREATE TRIGGER trg_economic_schedules_updated_at
  BEFORE UPDATE ON public.economic_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_economic_entries_updated_at ON public.economic_entries;
CREATE TRIGGER trg_economic_entries_updated_at
  BEFORE UPDATE ON public.economic_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_economic_movements_updated_at ON public.economic_movements;
CREATE TRIGGER trg_economic_movements_updated_at
  BEFORE UPDATE ON public.economic_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_stripe_connected_accounts_updated_at ON public.stripe_connected_accounts;
CREATE TRIGGER trg_stripe_connected_accounts_updated_at
  BEFORE UPDATE ON public.stripe_connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_stripe_payment_attempts_updated_at ON public.stripe_payment_attempts;
CREATE TRIGGER trg_stripe_payment_attempts_updated_at
  BEFORE UPDATE ON public.stripe_payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_stripe_webhook_events_updated_at ON public.stripe_webhook_events;
CREATE TRIGGER trg_stripe_webhook_events_updated_at
  BEFORE UPDATE ON public.stripe_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_economic_settings_audit ON public.economic_settings;
CREATE TRIGGER trg_economic_settings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.economic_settings
  FOR EACH ROW EXECUTE FUNCTION public.write_economic_audit_event();

DROP TRIGGER IF EXISTS trg_economic_categories_audit ON public.economic_categories;
CREATE TRIGGER trg_economic_categories_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.economic_categories
  FOR EACH ROW EXECUTE FUNCTION public.write_economic_audit_event();

DROP TRIGGER IF EXISTS trg_economic_schedules_audit ON public.economic_schedules;
CREATE TRIGGER trg_economic_schedules_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.economic_schedules
  FOR EACH ROW EXECUTE FUNCTION public.write_economic_audit_event();

DROP TRIGGER IF EXISTS trg_economic_entries_audit ON public.economic_entries;
CREATE TRIGGER trg_economic_entries_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.economic_entries
  FOR EACH ROW EXECUTE FUNCTION public.write_economic_audit_event();

DROP TRIGGER IF EXISTS trg_economic_movements_audit ON public.economic_movements;
CREATE TRIGGER trg_economic_movements_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.economic_movements
  FOR EACH ROW EXECUTE FUNCTION public.write_economic_audit_event();

DROP TRIGGER IF EXISTS trg_stripe_connected_accounts_audit ON public.stripe_connected_accounts;
CREATE TRIGGER trg_stripe_connected_accounts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.stripe_connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.write_economic_audit_event();

DROP TRIGGER IF EXISTS trg_stripe_payment_attempts_audit ON public.stripe_payment_attempts;
CREATE TRIGGER trg_stripe_payment_attempts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.stripe_payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.write_economic_audit_event();

DROP TRIGGER IF EXISTS trg_workspaces_economic_defaults ON public.workspaces;
CREATE TRIGGER trg_workspaces_economic_defaults
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.create_economic_defaults_for_workspace();

ALTER TABLE public.economic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS economic_settings_admin_select ON public.economic_settings;
CREATE POLICY economic_settings_admin_select ON public.economic_settings
  FOR SELECT TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_settings_admin_insert ON public.economic_settings;
CREATE POLICY economic_settings_admin_insert ON public.economic_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_settings_admin_update ON public.economic_settings;
CREATE POLICY economic_settings_admin_update ON public.economic_settings
  FOR UPDATE TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'))
  WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));

DROP POLICY IF EXISTS economic_categories_admin_select ON public.economic_categories;
CREATE POLICY economic_categories_admin_select ON public.economic_categories
  FOR SELECT TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_categories_admin_insert ON public.economic_categories;
CREATE POLICY economic_categories_admin_insert ON public.economic_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_categories_admin_update ON public.economic_categories;
CREATE POLICY economic_categories_admin_update ON public.economic_categories
  FOR UPDATE TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'))
  WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_categories_admin_delete ON public.economic_categories;
CREATE POLICY economic_categories_admin_delete ON public.economic_categories
  FOR DELETE TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));

DROP POLICY IF EXISTS economic_schedules_admin_select ON public.economic_schedules;
CREATE POLICY economic_schedules_admin_select ON public.economic_schedules
  FOR SELECT TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_schedules_admin_insert ON public.economic_schedules;
CREATE POLICY economic_schedules_admin_insert ON public.economic_schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_schedules_admin_update ON public.economic_schedules;
CREATE POLICY economic_schedules_admin_update ON public.economic_schedules
  FOR UPDATE TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'))
  WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));

DROP POLICY IF EXISTS economic_entries_admin_select ON public.economic_entries;
CREATE POLICY economic_entries_admin_select ON public.economic_entries
  FOR SELECT TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_entries_admin_insert ON public.economic_entries;
CREATE POLICY economic_entries_admin_insert ON public.economic_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_entries_admin_update ON public.economic_entries;
CREATE POLICY economic_entries_admin_update ON public.economic_entries
  FOR UPDATE TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'))
  WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));

DROP POLICY IF EXISTS economic_movements_admin_select ON public.economic_movements;
CREATE POLICY economic_movements_admin_select ON public.economic_movements
  FOR SELECT TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));
DROP POLICY IF EXISTS economic_movements_admin_insert ON public.economic_movements;
CREATE POLICY economic_movements_admin_insert ON public.economic_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));

DROP POLICY IF EXISTS economic_audit_events_admin_select ON public.economic_audit_events;
CREATE POLICY economic_audit_events_admin_select ON public.economic_audit_events
  FOR SELECT TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));

DROP POLICY IF EXISTS stripe_connected_accounts_admin_select ON public.stripe_connected_accounts;
CREATE POLICY stripe_connected_accounts_admin_select ON public.stripe_connected_accounts
  FOR SELECT TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));

DROP POLICY IF EXISTS stripe_payment_attempts_admin_select ON public.stripe_payment_attempts;
CREATE POLICY stripe_payment_attempts_admin_select ON public.stripe_payment_attempts
  FOR SELECT TO authenticated
  USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'));

REVOKE ALL ON TABLE public.economic_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.economic_categories FROM anon, authenticated;
REVOKE ALL ON TABLE public.economic_schedules FROM anon, authenticated;
REVOKE ALL ON TABLE public.economic_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.economic_movements FROM anon, authenticated;
REVOKE ALL ON TABLE public.economic_audit_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.stripe_connected_accounts FROM anon, authenticated;
REVOKE ALL ON TABLE public.stripe_payment_attempts FROM anon, authenticated;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.economic_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.economic_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.economic_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.economic_entries TO authenticated;
GRANT SELECT, INSERT ON TABLE public.economic_movements TO authenticated;
GRANT SELECT ON TABLE public.economic_audit_events TO authenticated;
GRANT SELECT ON TABLE public.stripe_connected_accounts TO authenticated;
GRANT SELECT ON TABLE public.stripe_payment_attempts TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_economic_defaults(uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
