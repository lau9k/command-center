-- Reconcile log: tracks every archive/create operation during Personize↔Supabase reconciliation.

CREATE TABLE IF NOT EXISTS reconcile_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid NOT NULL,
  direction       text NOT NULL CHECK (direction IN ('personize_archive', 'supabase_to_personize')),
  decision        text NOT NULL CHECK (decision IN ('keep', 'archive', 'create', 'skip')),
  personize_id    text,
  supabase_id     uuid,
  identifier_used text,
  identifier_type text CHECK (identifier_type IN ('email', 'linkedin_url', 'name_company')),
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reconcile_log_run ON reconcile_log (run_id);
CREATE INDEX idx_reconcile_log_created ON reconcile_log (created_at);
