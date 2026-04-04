-- Consolidate the ~20 individual PostgREST round-trips from the home-stats
-- API into a single RPC call.  This eliminates connection-pool pressure and
-- cuts tail latency by replacing fan-out with one database round-trip.
--
-- Usage:  SELECT * FROM get_dashboard_summary();
-- Returns a single JSON row containing all KPI-level counts/sums.

CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE                       -- reads only, safe to cache within a transaction
AS $$
DECLARE
  _today_start  timestamptz := date_trunc('day', now());
  _week_ago     timestamptz := now() - interval '7 days';
  _week_ahead   timestamptz := now() + interval '7 days';
  _yesterday    timestamptz := now() - interval '1 day';
  _result       jsonb;
BEGIN
  SELECT jsonb_build_object(
    -- Tasks
    'active_tasks',           (SELECT count(*) FROM tasks WHERE status <> 'done'),
    'overdue_tasks',          (SELECT count(*) FROM tasks WHERE status <> 'done' AND due_date < _today_start),
    'tasks_completed_today',  (SELECT count(*) FROM tasks WHERE status = 'done' AND updated_at >= _today_start),
    'total_tasks',            (SELECT count(*) FROM tasks),

    -- Projects (active)
    'active_project_count',   (SELECT count(*) FROM projects WHERE status = 'active'),

    -- Content
    'total_content_posts',    (SELECT count(*) FROM content_posts),
    'content_draft',          (SELECT count(*) FROM content_posts WHERE status = 'draft'),
    'content_scheduled',      (SELECT count(*) FROM content_posts WHERE status = 'scheduled'),
    'content_published',      (SELECT count(*) FROM content_posts WHERE status = 'published'),
    'content_this_week',      (SELECT count(*) FROM content_posts
                                WHERE status = 'scheduled'
                                  AND scheduled_for >= now() AND scheduled_for <= _week_ahead),

    -- Contacts
    'contacts_count',         (SELECT count(*) FROM contacts),
    'new_contacts_week',      (SELECT count(*) FROM contacts WHERE created_at >= _week_ago),

    -- Conversations
    'conversations_count',    (SELECT count(*) FROM conversations),

    -- Pipeline
    'pipeline_count',         (SELECT count(*) FROM pipeline_items),
    'pipeline_total_value',   (SELECT coalesce(sum((metadata->>'value')::numeric), 0)
                                FROM pipeline_items pi
                                JOIN pipeline_stages ps ON ps.id = pi.stage_id
                                WHERE ps.slug <> 'lost'),

    -- Invoices
    'open_invoice_total',     (SELECT coalesce(sum(amount), 0)
                                FROM invoices WHERE status IN ('sent', 'overdue')),

    -- Memory stats
    'memory_records',         (SELECT coalesce(sum(count), 0) FROM memory_stats),

    -- Sponsors
    'sponsors_total',         (SELECT count(*) FROM sponsors),
    'sponsors_confirmed',     (SELECT count(*) FROM sponsors WHERE status = 'confirmed'),
    'sponsors_confirmed_rev', (SELECT coalesce(sum(amount), 0) FROM sponsors WHERE status = 'confirmed'),

    -- Community (yesterday's stats for delta calculation)
    'yesterday_member_count', (SELECT member_count FROM community_stats
                                WHERE fetched_at < _yesterday
                                ORDER BY fetched_at DESC LIMIT 1),

    -- Outreach funnel
    'outreach_queued',        (SELECT count(*) FROM tasks WHERE task_type = 'outreach' AND outreach_status = 'queued'),
    'outreach_sent',          (SELECT count(*) FROM tasks WHERE task_type = 'outreach' AND outreach_status = 'sent'),
    'outreach_replied',       (SELECT count(*) FROM tasks WHERE task_type = 'outreach' AND outreach_status = 'replied'),
    'outreach_no_response',   (SELECT count(*) FROM tasks WHERE task_type = 'outreach' AND outreach_status = 'no_response'),
    'outreach_skipped',       (SELECT count(*) FROM tasks WHERE task_type = 'outreach' AND outreach_status = 'skipped'),
    'outreach_total',         (SELECT count(*) FROM tasks WHERE task_type = 'outreach')
  ) INTO _result;

  RETURN _result;
END;
$$;

-- Grant access to the service role so PostgREST can call it
GRANT EXECUTE ON FUNCTION get_dashboard_summary() TO service_role;
