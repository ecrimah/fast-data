-- FDS Operations Platform

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier TEXT NOT NULL DEFAULT 'skanka5',
  event_type TEXT NOT NULL,
  scope TEXT,
  reference TEXT,
  supplier_reference TEXT,
  http_status INT,
  ok BOOLEAN,
  error TEXT,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_logs_created ON supplier_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_logs_reference ON supplier_logs (reference);

CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  provider TEXT NOT NULL DEFAULT 'moolre',
  provider_response JSONB,
  error TEXT,
  triggered_by UUID,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_body JSONB NOT NULL,
  provider TEXT NOT NULL DEFAULT 'moolre',
  transaction_id TEXT,
  amount NUMERIC(12, 2),
  sender_phone TEXT,
  reference_hint TEXT,
  parse_status TEXT NOT NULL DEFAULT 'parsed' CHECK (parse_status IN ('parsed', 'unparsed', 'manual')),
  matched_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_tx ON payment_events (transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_unmatched ON payment_events (matched_order_id) WHERE matched_order_id IS NULL;

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  discount_percent NUMERIC(5, 2),
  discount_amount NUMERIC(12, 2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credited_at TIMESTAMPTZ
);

-- Order supplier columns (safe if already exist)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_reference TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_order_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_submitted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_fulfilled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;

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
