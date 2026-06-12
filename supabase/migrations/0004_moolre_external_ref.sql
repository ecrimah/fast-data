-- Store the Moolre payment attempt ref (FDS-xxx-R{timestamp}) so we can
-- poll /open/transact/status when the callback is missed.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS moolre_external_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_moolre_external_ref ON orders (moolre_external_ref);

-- Allow logging inbound callbacks before they are matched to an order.
ALTER TABLE payment_events DROP CONSTRAINT IF EXISTS payment_events_parse_status_check;
ALTER TABLE payment_events ADD CONSTRAINT payment_events_parse_status_check
  CHECK (parse_status IN ('parsed', 'unparsed', 'manual', 'received'));
