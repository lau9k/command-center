-- 060_add_daily_briefing_rpc.sql
-- Single RPC function that aggregates daily briefing data in one round-trip.
-- Part of BAS-316: Create daily briefing Supabase RPC and API route.

CREATE OR REPLACE FUNCTION get_daily_briefing(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'overdue_tasks', (
      SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::jsonb)
      FROM (
        SELECT id, title, status, priority, due_date, project_id
        FROM tasks
        WHERE user_id = p_user_id
          AND due_date < CURRENT_DATE
          AND status != 'done'
        ORDER BY due_date ASC
        LIMIT 10
      ) t
    ),
    'stale_deals', (
      SELECT COALESCE(jsonb_agg(row_to_json(pi.*)), '[]'::jsonb)
      FROM (
        SELECT id, title, stage_id, pipeline_id, updated_at
        FROM pipeline_items
        WHERE user_id = p_user_id
          AND updated_at < now() - INTERVAL '7 days'
        ORDER BY updated_at ASC
        LIMIT 10
      ) pi
    ),
    'unpaid_debts', (
      SELECT COALESCE(jsonb_agg(row_to_json(d.*)), '[]'::jsonb)
      FROM (
        SELECT id, name, type, balance, min_payment, due_day, lender
        FROM debts
        WHERE user_id = p_user_id
          AND balance > 0
        ORDER BY balance DESC
      ) d
    ),
    'recent_completions', (
      SELECT COUNT(*)
      FROM tasks
      WHERE user_id = p_user_id
        AND status = 'done'
        AND updated_at >= now() - INTERVAL '24 hours'
    ),
    'pipeline_moves', (
      SELECT COUNT(*)
      FROM pipeline_items
      WHERE user_id = p_user_id
        AND updated_at >= now() - INTERVAL '24 hours'
    ),
    'content_published', (
      SELECT COUNT(*)
      FROM content_posts
      WHERE user_id = p_user_id
        AND status = 'published'
        AND published_at >= now() - INTERVAL '24 hours'
    ),
    'revenue_this_week', (
      SELECT jsonb_build_object(
        'this_week', COALESCE(SUM(amount) FILTER (
          WHERE created_at >= date_trunc('week', CURRENT_DATE)
        ), 0),
        'last_week', COALESCE(SUM(amount) FILTER (
          WHERE created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days'
            AND created_at < date_trunc('week', CURRENT_DATE)
        ), 0)
      )
      FROM transactions
      WHERE user_id = p_user_id
        AND type = 'income'
        AND created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days'
    )
  ) INTO result;

  RETURN result;
END;
$$;
