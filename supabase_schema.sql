-- ============================================================
-- Ticket Transfer App — Complete Multi-User Supabase Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS app_users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password      TEXT NOT NULL,
  display_name  TEXT DEFAULT 'Toom',
  city          TEXT DEFAULT 'Los Angeles',
  country       TEXT DEFAULT 'United States',
  days_left     INT DEFAULT 22,
  wallet_passes INT DEFAULT 0,
  settings      JSONB DEFAULT '{
    "enableAppleWallet": false,
    "useGoogleWallet": false,
    "showTransferAccepted": false,
    "acceptedByName": "Mary Flores",
    "showBlankPage": false,
    "enableTransferFee": false,
    "transferFeeAmount": "$50.47"
  }'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id                BIGSERIAL PRIMARY KEY,
  user_id           TEXT,
  artist_name       TEXT NOT NULL,
  tour_name         TEXT,
  event_type        TEXT DEFAULT 'Standard',
  badge_text        TEXT DEFAULT 'Artist Presale',
  section           TEXT DEFAULT 'GA',
  row_name          TEXT DEFAULT '',
  seat_type         TEXT DEFAULT 'General Admission',
  venue_name        TEXT DEFAULT 'San Siro Stadium',
  venue_city        TEXT DEFAULT 'Milano',
  event_date        TEXT DEFAULT 'Mon, Jul 05, 2027 • 7:30 PM',
  purchase_date     TEXT DEFAULT 'Thu, Oct 29, 2026',
  entrance_details  TEXT DEFAULT 'Gate 4 Entrance',
  countdown_target  TIMESTAMPTZ,
  days_until        INT DEFAULT 221,
  ticket_price      NUMERIC(10,2) DEFAULT 145.00,
  service_fee       NUMERIC(10,2) DEFAULT 24.50,
  order_number      TEXT DEFAULT '5-85630/UT5',
  artist_image      TEXT DEFAULT '/assets/u2_banner.png',
  map_image         TEXT DEFAULT '/assets/venue_map_crop.png',
  favicon_url       TEXT,
  ticket_count      INT DEFAULT 4,
  is_hidden         BOOLEAN DEFAULT FALSE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id                    BIGSERIAL PRIMARY KEY,
  event_id              BIGINT REFERENCES events(id) ON DELETE CASCADE,
  user_id               TEXT,
  seat_label            TEXT DEFAULT 'GA',
  seat_number           INT,
  section               TEXT DEFAULT 'GA',
  row_name              TEXT DEFAULT '',
  status                TEXT DEFAULT 'active',
  barcode_code          TEXT,
  transferred_to_name   TEXT,
  transferred_to_contact TEXT,
  transferred_at        TIMESTAMPTZ,
  transfer_note         TEXT
);

CREATE TABLE IF NOT EXISTS transfers (
  id              BIGSERIAL PRIMARY KEY,
  event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
  user_id         TEXT,
  ticket_ids      JSONB,
  first_name      TEXT,
  last_name       TEXT,
  email_or_phone  TEXT,
  note            TEXT,
  status          TEXT DEFAULT 'completed',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_app_users" ON app_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_events"    ON events    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tickets"   ON tickets   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_transfers" ON transfers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
