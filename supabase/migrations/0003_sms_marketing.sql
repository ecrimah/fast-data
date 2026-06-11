-- =====================================================================
-- SMS marketing platform
-- Audience contacts, suppression (STOP/opt-out), bulk campaigns, and
-- per-recipient send tracking. All tables are service_role-only (no
-- anon/auth RLS policies) — managed exclusively from admin server routes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Audience list
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone            TEXT NOT NULL UNIQUE,          -- normalized 233XXXXXXXXX
  name             TEXT,
  network          TEXT CHECK (network IN ('MTN','Telecel','AT')),
  source           TEXT NOT NULL DEFAULT 'manual',
  tags             TEXT[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed','unsubscribed','bounced')),
  last_messaged_at TIMESTAMPTZ,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_status ON sms_contacts (status);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_network ON sms_contacts (network);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_source ON sms_contacts (source);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_tags ON sms_contacts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_last_messaged ON sms_contacts (last_messaged_at);

-- ---------------------------------------------------------------------
-- Do-not-contact list (STOP replies, manual blocks, complaints)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_suppression (
  phone      TEXT PRIMARY KEY,
  reason     TEXT NOT NULL DEFAULT 'manual' CHECK (reason IN ('stop','manual','bounce','complaint')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Bulk campaigns
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  message          TEXT NOT NULL,
  sender_id        TEXT,
  segment          JSONB NOT NULL DEFAULT '{}',
  append_opt_out   BOOLEAN NOT NULL DEFAULT TRUE,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','paused','completed','cancelled')),
  scheduled_at     TIMESTAMPTZ,
  total_recipients INT NOT NULL DEFAULT 0,
  sent_count       INT NOT NULL DEFAULT 0,
  failed_count     INT NOT NULL DEFAULT 0,
  skipped_count    INT NOT NULL DEFAULT 0,
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON sms_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created ON sms_campaigns (created_at DESC);

-- ---------------------------------------------------------------------
-- Per-recipient queue / send tracking
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_campaign_recipients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES sms_campaigns (id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES sms_contacts (id) ON DELETE SET NULL,
  phone             TEXT NOT NULL,
  name              TEXT,
  message           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped')),
  error             TEXT,
  provider_response JSONB,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_camp_recipients_campaign ON sms_campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_camp_recipients_status ON sms_campaign_recipients (campaign_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_camp_recipients_unique ON sms_campaign_recipients (campaign_id, phone);

-- ---------------------------------------------------------------------
-- RLS: service_role only (admin server routes). No anon/auth policies.
-- ---------------------------------------------------------------------
ALTER TABLE sms_contacts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_suppression         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaign_recipients ENABLE ROW LEVEL SECURITY;
