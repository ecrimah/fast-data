-- =====================================================================
-- Fast Data Services — Full initial schema
-- Core tables (profiles, settings, orders, transactions)
-- + Operations tables (platform_settings, supplier_logs, sms_logs,
--   payment_events, promotions, disputes, referral_rewards)
-- + Row Level Security + seed data
-- =====================================================================

-- ---------------------------------------------------------------------
-- CORE: profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email         TEXT,
  name          TEXT,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'agent')),
  wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by   UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles (referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles (referred_by);

-- ---------------------------------------------------------------------
-- CORE: settings (single-row config, id = 1)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id                INT PRIMARY KEY DEFAULT 1,
  price_per_gb      NUMERIC(10, 2) NOT NULL DEFAULT 6,
  referrals_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT settings_singleton CHECK (id = 1)
);

-- ---------------------------------------------------------------------
-- CORE: orders
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  network               TEXT NOT NULL CHECK (network IN ('MTN', 'Telecel', 'AT')),
  bundle_size           TEXT NOT NULL,
  amount                NUMERIC(12, 2) NOT NULL,
  phone                 TEXT NOT NULL,
  payment_ref           TEXT NOT NULL UNIQUE,
  payment_status        TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  delivery_status       TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered')),
  payment_method        TEXT NOT NULL DEFAULT 'moolre' CHECK (payment_method IN ('paystack', 'wallet', 'moolre')),
  promo_code            TEXT,
  supplier              TEXT,
  supplier_reference    TEXT,
  supplier_order_code   TEXT,
  supplier_status       TEXT,
  supplier_error        TEXT,
  supplier_submitted_at TIMESTAMPTZ,
  supplier_fulfilled_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders (delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_status ON orders (supplier_status);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_reference ON orders (supplier_reference);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_order_code ON orders (supplier_order_code);

-- ---------------------------------------------------------------------
-- CORE: transactions (wallet ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('topup', 'purchase', 'reward')),
  amount     NUMERIC(12, 2) NOT NULL,
  status     TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
  reference  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions (created_at DESC);

-- ---------------------------------------------------------------------
-- OPS: platform_settings (hot-editable JSON config)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- OPS: supplier_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier           TEXT NOT NULL DEFAULT 'skanka5',
  event_type         TEXT NOT NULL,
  scope              TEXT,
  reference          TEXT,
  supplier_reference TEXT,
  http_status        INT,
  ok                 BOOLEAN,
  error              TEXT,
  request_payload    JSONB,
  response_payload   JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_logs_created ON supplier_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_logs_reference ON supplier_logs (reference);

-- ---------------------------------------------------------------------
-- OPS: sms_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template          TEXT NOT NULL,
  recipient         TEXT NOT NULL,
  message           TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  provider          TEXT NOT NULL DEFAULT 'moolre',
  provider_response JSONB,
  error             TEXT,
  triggered_by      UUID,
  context           JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs (created_at DESC);

-- ---------------------------------------------------------------------
-- OPS: payment_events (inbound MoMo / webhook reconciliation)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_body         JSONB NOT NULL,
  provider         TEXT NOT NULL DEFAULT 'moolre',
  transaction_id   TEXT,
  amount           NUMERIC(12, 2),
  sender_phone     TEXT,
  reference_hint   TEXT,
  parse_status     TEXT NOT NULL DEFAULT 'parsed' CHECK (parse_status IN ('parsed', 'unparsed', 'manual')),
  matched_order_id UUID REFERENCES orders (id) ON DELETE SET NULL,
  matched_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_tx ON payment_events (transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_unmatched ON payment_events (matched_order_id) WHERE matched_order_id IS NULL;

-- ---------------------------------------------------------------------
-- OPS: promotions (checkout promo codes)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  description      TEXT,
  discount_percent NUMERIC(5, 2),
  discount_amount  NUMERIC(12, 2),
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- OPS: disputes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disputes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders (id) ON DELETE SET NULL,
  user_id     UUID REFERENCES profiles (id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolution  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);

-- ---------------------------------------------------------------------
-- OPS: referral_rewards
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_rewards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders (id) ON DELETE SET NULL,
  amount      NUMERIC(12, 2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'failed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards (referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_order ON referral_rewards (order_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards (status);

CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes (order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user ON disputes (user_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Browser (anon/auth) clients use the anon key and are constrained below.
-- Server routes use the service_role key and bypass RLS entirely.
-- =====================================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards  ENABLE ROW LEVEL SECURITY;

-- Note: auth.uid() is wrapped in a subselect so Postgres evaluates it once
-- per query (init-plan) rather than once per row.

-- profiles: owner can read/insert/update their own row
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = (select auth.uid()));
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (id = (select auth.uid()));
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));

-- settings: world-readable (price/referrals flag); admins may write.
-- Write policies are scoped per-action so they don't add a duplicate SELECT policy.
CREATE POLICY settings_select_all ON settings
  FOR SELECT USING (true);
CREATE POLICY settings_admin_insert ON settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );
CREATE POLICY settings_admin_update ON settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

-- orders: owner can read/insert/update their own orders
CREATE POLICY orders_select_own ON orders
  FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY orders_insert_own ON orders
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY orders_update_own ON orders
  FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- transactions: owner can read/insert their own ledger entries
CREATE POLICY transactions_select_own ON transactions
  FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY transactions_insert_own ON transactions
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- promotions: anyone may read active promos (server manages writes)
CREATE POLICY promotions_select_active ON promotions
  FOR SELECT USING (active = true);

-- platform_settings, supplier_logs, sms_logs, payment_events, disputes,
-- referral_rewards: no anon/auth policies -> service_role only.

-- =====================================================================
-- SEED DATA
-- =====================================================================

INSERT INTO settings (id, price_per_gb, referrals_enabled)
VALUES (1, 6, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES (
  'platform_config',
  '{
    "recipientOrderCooldownMinutes": 3,
    "referralRewardGhs": 5,
    "supplierRouting": {},
    "contact": { "supportWhatsApp": "", "whatsappChannelUrl": "" },
    "moolreSms": { "enabled": true, "senderId": "FDS" },
    "smsTemplates": {
      "paymentReceived": "FDS: Payment of GH₵{amount} received for {ref}. Your data is being processed.",
      "orderFulfilled": "FDS: {bundle} delivered to {phone}. Ref: {ref}. Thank you!"
    },
    "shopBanners": [
      { "id": "flash-sale", "title": "Flash Sale!", "description": "Get 10% bonus on all MTN bundles today.", "active": true },
      { "id": "new-user", "title": "New Here?", "description": "Use code FDS500 for free 500MB on your first order.", "active": true }
    ]
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
