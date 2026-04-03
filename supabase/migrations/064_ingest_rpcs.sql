-- RPC functions for safe concurrent ingest event processing
-- Depends on: 061_create_ingest_events.sql, 063_ingest_events_add_columns.sql

-- claim_ingest_events: Atomically claim a batch of events for processing
-- Uses FOR UPDATE SKIP LOCKED to prevent double-claiming across concurrent workers
CREATE OR REPLACE FUNCTION claim_ingest_events(
  p_limit     int    DEFAULT 10,
  p_worker_id text   DEFAULT 'default',
  p_sources   text[] DEFAULT NULL
)
RETURNS SETOF ingest_events
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT id
    FROM ingest_events
    WHERE status IN ('received', 'retryable')
      AND (next_retry_at IS NULL OR next_retry_at <= now())
      AND (p_sources IS NULL OR source = ANY(p_sources))
    ORDER BY received_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE ingest_events e
  SET
    status           = 'processing',
    claimed_at       = now(),
    claimed_by       = p_worker_id,
    lease_expires_at = now() + interval '2 minutes',
    attempt_count          = attempt_count + 1,
    updated_at       = now()
  FROM claimable c
  WHERE e.id = c.id
  RETURNING e.*;
END;
$$;

-- reap_expired_claims: Reclaim events whose processing lease has expired
-- Moves to 'retryable' with exponential backoff, or 'dead_letter' after 5 attempts
CREATE OR REPLACE FUNCTION reap_expired_claims()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  reaped_count int;
BEGIN
  WITH expired AS (
    UPDATE ingest_events
    SET
      status           = CASE WHEN attempt_count >= 5 THEN 'dead_letter' ELSE 'retryable' END,
      claimed_at       = NULL,
      claimed_by       = NULL,
      lease_expires_at = NULL,
      next_retry_at    = CASE WHEN attempt_count >= 5 THEN NULL
                              ELSE now() + (interval '1 minute' * power(4, attempt_count - 1))
                         END,
      last_failed_at   = now(),
      last_error_code  = COALESCE(last_error_code, 'lease_expired'),
      updated_at       = now()
    WHERE status = 'processing'
      AND lease_expires_at < now()
    RETURNING id
  )
  SELECT count(*) INTO reaped_count FROM expired;

  RETURN reaped_count;
END;
$$;
