-- =====================================================================
-- Fast Data Services — Data Packages
-- Per-network, per-size bundles with explicit pricing, admin-editable.
-- Replaces the hardcoded `size x price_per_gb` model on the storefront.
-- =====================================================================

CREATE TABLE IF NOT EXISTS data_packages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network     TEXT NOT NULL CHECK (network IN ('MTN', 'Telecel', 'AT')),
  size_gb     NUMERIC(10, 2) NOT NULL,
  price       NUMERIC(12, 2) NOT NULL,
  label       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  popular     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (network, size_gb)
);

CREATE INDEX IF NOT EXISTS idx_data_packages_network_active ON data_packages (network, active);
CREATE INDEX IF NOT EXISTS idx_data_packages_sort ON data_packages (network, sort_order);

-- Storefront (anon) may read active packages; all writes go through the
-- service role (admin API), so no INSERT/UPDATE/DELETE policy is defined.
ALTER TABLE data_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_packages_select_active ON data_packages;
CREATE POLICY data_packages_select_active ON data_packages
  FOR SELECT USING (active = true);

-- Seed from the legacy model: standard sizes x 3 networks at GHS 6/GB.
INSERT INTO data_packages (network, size_gb, price, sort_order)
SELECT n.network, s.size_gb, s.size_gb * 6, s.ord
FROM (VALUES ('MTN'), ('Telecel'), ('AT')) AS n(network)
CROSS JOIN (VALUES
  (1,1),(2,2),(3,3),(4,4),(5,5),(6,6),(8,7),(10,8),(15,9),(20,10),(25,11),(30,12),(40,13),(50,14),(100,15)
) AS s(size_gb, ord)
ON CONFLICT (network, size_gb) DO NOTHING;

UPDATE data_packages SET popular = TRUE WHERE size_gb IN (5, 10);
