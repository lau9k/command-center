-- BAS-441: Dedupe contacts by linkedin_url and add partial unique index
-- Prerequisite for BAS-440 linkedin-only upsert (ON CONFLICT (linkedin_url))

BEGIN;

-- ─── 1. Audit: log duplicate count ─────────────────────────────────────
DO $$
DECLARE
  dup_groups integer;
BEGIN
  SELECT count(*) INTO dup_groups
  FROM (
    SELECT linkedin_url FROM contacts
    WHERE linkedin_url IS NOT NULL AND deleted_at IS NULL
    GROUP BY linkedin_url HAVING count(*) > 1
  ) d;
  RAISE NOTICE 'linkedin_url duplicate groups to resolve: %', dup_groups;
END $$;

-- ─── 2. Identify winners (most recent updated_at, tie-break highest id)
CREATE TEMP TABLE _dedup_ranked AS
SELECT
  id,
  linkedin_url,
  ROW_NUMBER() OVER (
    PARTITION BY linkedin_url
    ORDER BY updated_at DESC NULLS LAST, id DESC
  ) AS rn
FROM contacts
WHERE linkedin_url IS NOT NULL
  AND deleted_at IS NULL;

-- Only keep rows from duplicate groups (rn > 1 exists)
DELETE FROM _dedup_ranked r
WHERE NOT EXISTS (
  SELECT 1 FROM _dedup_ranked r2
  WHERE r2.linkedin_url = r.linkedin_url AND r2.rn > 1
);

-- ─── 3. Merge non-null scalar fields from losers into winners ───────────
UPDATE contacts w
SET
  email             = COALESCE(w.email,             agg.m_email),
  phone             = COALESCE(w.phone,             agg.m_phone),
  company           = COALESCE(w.company,           agg.m_company),
  role              = COALESCE(w.role,              agg.m_role),
  last_contact_date = COALESCE(w.last_contact_date, agg.m_last_contact_date),
  next_action       = COALESCE(w.next_action,       agg.m_next_action),
  updated_at        = now()
FROM (
  SELECT
    r_w.id AS winner_id,
    (ARRAY_REMOVE(ARRAY_AGG(c.email             ORDER BY c.updated_at DESC NULLS LAST), NULL))[1] AS m_email,
    (ARRAY_REMOVE(ARRAY_AGG(c.phone             ORDER BY c.updated_at DESC NULLS LAST), NULL))[1] AS m_phone,
    (ARRAY_REMOVE(ARRAY_AGG(c.company           ORDER BY c.updated_at DESC NULLS LAST), NULL))[1] AS m_company,
    (ARRAY_REMOVE(ARRAY_AGG(c.role              ORDER BY c.updated_at DESC NULLS LAST), NULL))[1] AS m_role,
    (ARRAY_REMOVE(ARRAY_AGG(c.last_contact_date ORDER BY c.updated_at DESC NULLS LAST), NULL))[1] AS m_last_contact_date,
    (ARRAY_REMOVE(ARRAY_AGG(c.next_action       ORDER BY c.updated_at DESC NULLS LAST), NULL))[1] AS m_next_action
  FROM _dedup_ranked r_w
  JOIN _dedup_ranked r_l ON r_l.linkedin_url = r_w.linkedin_url AND r_l.rn > 1
  JOIN contacts c ON c.id = r_l.id
  WHERE r_w.rn = 1
  GROUP BY r_w.id
) agg
WHERE w.id = agg.winner_id;

-- Merge tags separately (union of all loser tags into winner)
UPDATE contacts w
SET
  tags = (
    SELECT ARRAY(
      SELECT DISTINCT unnest
      FROM unnest(
        array_cat(
          COALESCE(w.tags, '{}'),
          COALESCE(ARRAY(
            SELECT unnest(c.tags)
            FROM contacts c
            JOIN _dedup_ranked r ON r.id = c.id
            WHERE r.linkedin_url = w.linkedin_url
              AND r.rn > 1
              AND c.tags IS NOT NULL
              AND array_length(c.tags, 1) > 0
          ), '{}')
        )
      )
    )
  )
FROM _dedup_ranked r_w
WHERE w.id = r_w.id
  AND r_w.rn = 1;

-- ─── 4. Delete losers (data already merged into winners) ────────────────
DELETE FROM contacts c
USING _dedup_ranked r
WHERE c.id = r.id AND r.rn > 1;

-- ─── 5. Log to sync_log ────────────────────────────────────────────────
INSERT INTO sync_log (source, status, records_synced, message, metadata)
VALUES (
  'migration:083-dedupe',
  'success',
  (SELECT count(*) FROM _dedup_ranked WHERE rn > 1),
  'Deduplicated contacts by linkedin_url and added partial unique index',
  jsonb_build_object('migration', '083_contacts_linkedin_unique')
);

DROP TABLE _dedup_ranked;

-- ─── 6. Create partial unique index ─────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS contacts_linkedin_url_unique
  ON public.contacts (linkedin_url)
  WHERE linkedin_url IS NOT NULL;

COMMIT;
