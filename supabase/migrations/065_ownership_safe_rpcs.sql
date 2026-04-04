-- Ownership-safe RPCs for marking ingest events as processed or failed.
-- NOTE: All status literals use explicit ::ingest_event_status casts.
-- Depends on: 061_create_ingest_events.sql, 063_ingest_events_add_columns.sql

CREATE OR REPLACE FUNCTION mark_ingest_event_processed(
  p_event_id  uuid,
  p_worker_id text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  rows_affected int;
BEGIN
  UPDATE ingest_events
  SET
    status           = 'processed'::ingest_event_status,
    processed_at     = now(),
    claimed_at       = NULL,
    lease_expires_at = NULL,
    updated_at       = now()
  WHERE id = p_event_id
    AND status = 'processing'::ingest_event_status
    AND claimed_by = p_worker_id
    AND lease_expires_at > now();

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION mark_ingest_event_failed(
  p_event_id  uuid,
  p_worker_id text,
  p_error     text,
  p_attempt   int
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  rows_affected int;
  backoff_seconds int[];
BEGIN
  backoff_seconds := ARRAY[30, 120, 600, 1800, 3600];

  UPDATE ingest_events
  SET
    status           = CASE WHEN p_attempt >= 5 THEN 'dead_letter'::ingest_event_status ELSE 'retryable'::ingest_event_status END,
    claimed_at       = NULL,
    claimed_by       = NULL,
    lease_expires_at = NULL,
    last_error       = p_error,
    last_failed_at   = now(),
    next_retry_at    = CASE WHEN p_attempt >= 5 THEN NULL
                            ELSE now() + (backoff_seconds[LEAST(p_attempt, 5)] * interval '1 second')
                       END,
    updated_at       = now()
  WHERE id = p_event_id
    AND status = 'processing'::ingest_event_status
    AND claimed_by = p_worker_id
    AND lease_expires_at > now();

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
