-- Ownership-safe RPCs for marking ingest events as processed or failed.
-- Only the worker that currently holds the lease can update the event,
-- preventing stale workers from overwriting reaped/re-claimed events.
-- Depends on: 061_create_ingest_events.sql, 063_ingest_events_add_columns.sql

-- mark_ingest_event_processed: Mark an event as successfully processed.
-- Returns true if the row was updated, false if ownership was lost.
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
    status           = 'processed',
    processed_at     = now(),
    claimed_at       = NULL,
    lease_expires_at = NULL,
    updated_at       = now()
  WHERE id = p_event_id
    AND status = 'processing'
    AND claimed_by = p_worker_id
    AND lease_expires_at > now();

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

-- mark_ingest_event_failed: Mark an event as failed with backoff or dead-letter.
-- Uses fixed backoff tiers: 30s, 120s, 600s, 1800s, 3600s.
-- Returns true if the row was updated, false if ownership was lost.
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
    status           = CASE WHEN p_attempt >= 5 THEN 'dead_letter' ELSE 'retryable' END,
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
    AND status = 'processing'
    AND claimed_by = p_worker_id
    AND lease_expires_at > now();

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
