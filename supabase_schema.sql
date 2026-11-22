-- ============================================================
-- Ticket Transfer App — Supabase Schema
-- Run this ONCE in your Supabase project SQL Editor
-- Dashboard → SQL Editor → New Query → paste & run
-- ============================================================

-- ----------------------------------------------------------------
-- EVENTS table: holds all configurable event/artist info
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id                BIGSERIAL PRIMARY KEY,
  artist_name       TEXT NOT NULL,
  tour_name         TEXT,
  badge_text        TEXT DEFAULT 'Verified Fan Onsale',
  section           TEXT DEFAULT 'Floor',
  row_name          TEXT DEFAULT '0',
  seat_type         TEXT DEFAULT 'General Admission',
  venue_name        TEXT DEFAULT 'Arrow',
  venue_city        TEXT DEFAULT 'Allentown, PA',
  event_date        TEXT DEFAULT 'Sat, Aug 15, 7:00 PM',
  countdown_target  TIMESTAMPTZ,
  ticket_price      NUMERIC(10,2) DEFAULT 89.50,
  service_fee       NUMERIC(10,2) DEFAULT 18.25,
  order_number      TEXT DEFAULT '28-49201/PHL',
  artist_image      TEXT DEFAULT '/assets/conan_banner.jpg',
  map_image         TEXT DEFAULT '/assets/venue_map_crop.png',
  favicon_url       TEXT,
  ticket_count      INT DEFAULT 4,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TICKETS table: individual seat records
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id                    BIGSERIAL PRIMARY KEY,
  event_id              BIGINT REFERENCES events(id) ON DELETE CASCADE,
  seat_label            TEXT DEFAULT 'SEAT',
  seat_number           INT,
  section               TEXT DEFAULT 'Floor',
  row_name              TEXT DEFAULT '0',
  status                TEXT DEFAULT 'active',   -- 'active' | 'transfer_pending' | 'transferred'
  barcode_code          TEXT,
  transferred_to_name   TEXT,
  transferred_to_contact TEXT,
  transferred_at        TIMESTAMPTZ,
  transfer_note         TEXT
);

-- ----------------------------------------------------------------
-- TRANSFERS table: audit log of transfer actions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transfers (
  id              BIGSERIAL PRIMARY KEY,
  event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
  ticket_ids      JSONB,
  first_name      TEXT,
  last_name       TEXT,
  email_or_phone  TEXT,
  note            TEXT,
  status          TEXT DEFAULT 'pending',   -- 'pending' | 'completed' | 'cancelled'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Seed initial Conan Gray event (runs only if table is empty)
-- ----------------------------------------------------------------
DO $$
DECLARE
  target TIMESTAMPTZ := NOW() + INTERVAL '3 days 5 hours 48 minutes 31 seconds';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM events LIMIT 1) THEN
    INSERT INTO events (
      id, artist_name, tour_name, badge_text, section, row_name, seat_type,
      venue_name, venue_city, event_date, countdown_target,
      ticket_price, service_fee, order_number, artist_image, map_image, ticket_count
    ) VALUES (
      1, 'Conan Gray', 'Superache Tour', 'Verified Fan Onsale', 'Floor', '0', 'General Admission',
      'Arrow', 'Allentown, PA', 'Sat, Aug 15, 7:00 PM', target,
      89.50, 18.25, '28-49201/PHL', '/assets/conan_banner.jpg', '/assets/venue_map_crop.png', 4
    );

    -- Seed 4 starting tickets
    INSERT INTO tickets (event_id, seat_label, seat_number, section, row_name, status, barcode_code)
    VALUES
      (1, 'SEAT', 1, 'Floor', '0', 'active', '8192048102941102'),
      (1, 'SEAT', 2, 'Floor', '0', 'active', '8192048102942102'),
      (1, 'SEAT', 3, 'Floor', '0', 'active', '8192048102943102'),
      (1, 'SEAT', 4, 'Floor', '0', 'active', '8192048102944102');
  END IF;
END $$;

-- ----------------------------------------------------------------
-- Enable Row Level Security (RLS) but allow all reads/writes
-- via the publishable key since this is a demo app.
-- For a real app: tighten these policies.
-- ----------------------------------------------------------------
ALTER TABLE events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Allow anon + authenticated to read/write everything
CREATE POLICY "allow_all_events"    ON events    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tickets"   ON tickets   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_transfers" ON transfers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
