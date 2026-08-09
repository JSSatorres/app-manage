BEGIN;

ALTER TABLE public.economic_schedules
  DROP CONSTRAINT economic_schedules_target_check,
  ADD CONSTRAINT economic_schedules_target_check CHECK (
    (entry_type = 'player_charge' AND player_id IS NOT NULL AND counterparty_name IS NULL)
    OR (entry_type = 'income')
    OR (entry_type = 'expense' AND player_id IS NULL AND counterparty_name IS NOT NULL)
  );

ALTER TABLE public.economic_entries
  DROP CONSTRAINT economic_entries_target_check,
  ADD CONSTRAINT economic_entries_target_check CHECK (
    (entry_type = 'player_charge' AND player_id IS NOT NULL AND counterparty_name IS NULL)
    OR (entry_type = 'income')
    OR (entry_type = 'expense' AND player_id IS NULL AND counterparty_name IS NOT NULL)
  );

COMMIT;
