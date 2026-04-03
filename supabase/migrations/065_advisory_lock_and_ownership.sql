-- Advisory lock for singleton cron steps + ownership-safe event updates
-- Depends on: 064_ingest_rpcs.sql

-- ─── Fix column bugs in claim_ingest_events ─────────────────────────
-- created_at → received_at, attempt → attempt_count
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
    attempt_count    = attempt_count + 1,
    updated_at       = now()
  FROM claimable c
  WHERE e.id = c.id
  RETURNING e.*;
END;
$$;

-- ─── Advisory-locked reaper ─────────────────────────────────────────
-- Uses pg_try_advisory_xact_lock to ensure only one cron invocation
-- runs the reaper at a time. Returns 0 if lock is not acquired.
-- Lock key 7483201 is an arbitrary constant for "reap_expired_claims".
-- Also fixes: attempt → attempt_count
CREATE OR REPLACE FUNCTION reap_expired_claims()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  reaped_count int;
BEGIN
  -- Try to acquire a transaction-scoped advisory lock (non-blocking)
  IF NOT pg_try_advisory_xact_lock(7483201) THEN
    RETURN 0;
  END IF;

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

-- ─── Ownership-safe event completion ────────────────────────────────
-- Only updates an event if the caller still owns it (status=processing,
-- claimed_by matches). Returns true if the update succeeded, false if
-- the event was already reaped/reclaimed by another worker.

CREATE OR REPLACE FUNCTION complete_ingest_event(
  p_event_id   uuid,
  p_worker_id  text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE ingest_events
  SET
    status           = 'processed',
    claimed_at       = NULL,
    lease_expires_at = NULL,
    processed_at     = now(),
    updated_at       = now()
  WHERE id = p_event_id
    AND status = 'processing'
    AND claimed_by = p_worker_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION fail_ingest_event(
  p_event_id      uuid,
  p_worker_id     text,
  p_attempt_count int,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count int;
  is_dead boolean;
BEGIN
  is_dead := p_attempt_count >= 5;

  UPDATE ingest_events
  SET
    status           = CASE WHEN is_dead THEN 'dead_letter' ELSE 'retryable' END,
    last_failed_at   = now(),
    last_error_code  = left(p_error_message, 255),
    next_retry_at    = CASE WHEN is_dead THEN NULL
                            ELSE now() + make_interval(secs =>
                              CASE p_attempt_count
                                WHEN 1 THEN 30
                                WHEN 2 THEN 120
                                WHEN 3 THEN 600
                                WHEN 4 THEN 1800
                                ELSE 3600
                              END)
                       END,
    claimed_at       = NULL,
    lease_expires_at = NULL,
    attempt_count    = p_attempt_count,
    updated_at       = now()
  WHERE id = p_event_id
    AND status = 'processing'
    AND claimed_by = p_worker_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;
