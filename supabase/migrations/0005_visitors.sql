-- =====================================================================
-- Visitor / lead capture
-- Every visit to the storefront is recorded (one row per browser session)
-- so the admin can see who came by and reach out to people who showed
-- buying intent (entered a phone, picked a bundle, started checkout).
-- service_role-only: written by /api/track and read by admin server routes.
-- =====================================================================

CREATE TABLE IF NOT EXISTS visitors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       TEXT NOT NULL UNIQUE,           -- client-generated, stored in localStorage
  phone            TEXT,                            -- captured if they type a beneficiary/payer number
  name             TEXT,
  interest_network TEXT,                            -- MTN / Telecel / AT
  interest_bundle  TEXT,                            -- e.g. "5 GB"
  intent           TEXT NOT NULL DEFAULT 'visited'  -- how far they got
                     CHECK (intent IN ('visited','browsed','checkout_started','abandoned','purchased')),
  status           TEXT NOT NULL DEFAULT 'new'      -- admin outreach pipeline
                     CHECK (status IN ('new','interested','contacted','converted','ignored')),
  landing_page     TEXT,
  last_page        TEXT,
  referrer         TEXT,
  utm              JSONB NOT NULL DEFAULT '{}',
  user_agent       TEXT,
  ip               TEXT,
  page_views       INT NOT NULL DEFAULT 1,
  notes            TEXT,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors (status);
CREATE INDEX IF NOT EXISTS idx_visitors_intent ON visitors (intent);
CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitors (phone);

-- RLS: service_role only (managed via server routes). No anon/auth policies.
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
