-- AI Context Cache table for caching Personize/LLM responses with TTL-based invalidation
CREATE TABLE ai_context_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_type text NOT NULL,
  scope_id text,
  model_mode text NOT NULL,
  input_hash text NOT NULL,
  content jsonb NOT NULL,
  token_cost int NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  expires_at timestamptz,
  UNIQUE (user_id, view_type, scope_id, model_mode)
);

-- Index for fast cache lookups
CREATE INDEX idx_ai_context_cache_lookup ON ai_context_cache (user_id, view_type, scope_id);
