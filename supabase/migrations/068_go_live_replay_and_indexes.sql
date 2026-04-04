-- Go-live migration: replay RPCs, audit columns, domain constraints, indexes
-- NOTE: All status literals use explicit ::ingest_event_status casts.

-- ─── Domain table UNIQUE constraints for upsert ON CONFLICT ──────────
ALTER TABLE contacts
  ADD CONSTRAINT IF NOT EXISTS contacts_email_unique UNIQUE (email);

ALTER TABLE tasks
  ADD CONSTRAINT IF NOT EXISTS tasks_external_id_unique UNIQUE (external_id);

ALTER TABLE conversations
  ADD CONSTRAINT IF NOT EXISTS conversations_external_id_unique UNIQUE (external_id);

ALTER TABLE transactions
  ADD CONSTRAINT IF NOT EXISTS transactions_external_id_unique UNIQUE (external_id);

-- ─── Replay audit columns ────────────────────────────────────────────
ALTER TABLE ingest_events
  ADD COLUMN IF NOT EXISTS replay_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replayed_at timestamptz,
  ADD COLUMN IF NOT EXISTS replayed_by text,
  ADD COLUMN IF NOT EXISTS replay_reason text;

-- ─── Single-event replay RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION replay_ingest_event(
  p_event_id uuid,
  p_replayed_by text,
  p_reason text DEFAULT 'manual replay'
)
RETURNS TABLE (
  id uuid,
  previous_status ingest_event_status,
  new_status ingest_event_status,
  replay_count integer,
  replayed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prev_status ingest_event_status;
BEGIN
  IF p_replayed_by IS NULL OR btrim(p_replayed_by) = '' THEN
    RAISE EXCEPTION 'p_replayed_by is required';
  END IF;

  PERFORM pg_advisory_xact_lock(7483299);

  SELECT status INTO v_prev_status
  FROM ingest_events
  WHERE ingest_events.id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ingest_event % not found', p_event_id;
  END IF;

  IF v_prev_status NOT IN ('dead_letter'::ingest_event_status, 'retryable'::ingest_event_status) THEN
    RAISE EXCEPTION 'ingest_event % is in status %, expected dead_letter or retryable',
      p_event_id, v_prev_status;
  END IF;

  UPDATE ingest_events
  SET
    status = 'received'::ingest_event_status,
    attempt_count = 0,
    next_retry_at = NULL,
    claimed_at = NULL,
    claimed_by = NULL,
    lease_expires_at = NULL,
    processed_at = NULL,
    last_error = NULL,
    last_error_code = NULL,
    last_failed_at = NULL,
    replay_count = COALESCE(ingest_events.replay_count, 0) + 1,
    replayed_at = now(),
    replayed_by = p_replayed_by,
    replay_reason = p_reason,
    updated_at = now()
  WHERE ingest_events.id = p_event_id
  RETURNING
    ingest_events.id,
    v_prev_status,
    ingest_events.status,
    ingest_events.replay_count,
    ingest_events.replayed_at
  INTO id, previous_status, new_status, replay_count, replayed_at;

  RETURN NEXT;
END;
$$;

-- ─── Bulk dead-letter replay RPC ─────────────────────────────────────
CREATE OR REPLACE FUNCTION replay_dead_letter_ingest_events(
  p_limit integer DEFAULT 50,
  p_source text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_replayed_by text DEFAULT 'system',
  p_reason text DEFAULT 'bulk replay'
)
RETURNS TABLE (
  id uuid,
  source text,
  entity_type text,
  previous_status ingest_event_status,
  new_status ingest_event_status,
  replay_count integer,
  replayed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RAISE EXCEPTION 'p_limit must be > 0';
  END IF;

  PERFORM pg_advisory_xact_lock(7483300);

  RETURN QUERY
  WITH candidates AS (
    SELECT ie.id
    FROM ingest_events ie
    WHERE ie.status = 'dead_letter'::ingest_event_status
      AND (p_source IS NULL OR ie.source = p_source)
      AND (p_entity_type IS NULL OR ie.entity_type = p_entity_type)
    ORDER BY ie.received_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ),
  replayed AS (
    UPDATE ingest_events ie
    SET
      status = 'received'::ingest_event_status,
      attempt_count = 0,
      next_retry_at = NULL,
      claimed_at = NULL,
      claimed_by = NULL,
      lease_expires_at = NULL,
      processed_at = NULL,
      last_error = NULL,
      last_error_code = NULL,
      last_failed_at = NULL,
      replay_count = COALESCE(ie.replay_count, 0) + 1,
      replayed_at = now(),
      replayed_by = p_replayed_by,
      replay_reason = p_reason,
      updated_at = now()
    FROM candidates c
    WHERE ie.id = c.id
    RETURNING
      ie.id,
      ie.source,
      ie.entity_type,
      'dead_letter'::ingest_event_status AS previous_status,
      ie.status AS new_status,
      ie.replay_count,
      ie.replayed_at
  )
  SELECT * FROM replayed;
END;
$$;

-- ─── Partial indexes for claim/reap performance ──────────────────────
CREATE INDEX IF NOT EXISTS idx_ingest_events_claimable
  ON ingest_events (received_at ASC)
  WHERE status IN ('received', 'retryable');

CREATE INDEX IF NOT EXISTS idx_ingest_events_expired_leases
  ON ingest_events (lease_expires_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_ingest_events_source_freshness
  ON ingest_events (source, received_at DESC);
