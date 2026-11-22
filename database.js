const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'tickets.db');
const db = new sqlite3.Database(dbPath);

function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create events table
      db.run(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          artist_name TEXT NOT NULL,
          tour_name TEXT,
          badge_text TEXT DEFAULT 'Verified Fan Onsale',
          section TEXT DEFAULT 'Floor',
          row_name TEXT DEFAULT '0',
          seat_type TEXT DEFAULT 'General Admission',
          venue_name TEXT DEFAULT 'Arrow',
          venue_city TEXT DEFAULT 'Allentown, PA',
          event_date TEXT DEFAULT 'Sat, Aug 15, 7:00 PM',
          countdown_target TEXT,
          ticket_price REAL DEFAULT 89.50,
          service_fee REAL DEFAULT 18.25,
          order_number TEXT DEFAULT '28-49201/PHL',
          artist_image TEXT DEFAULT '/assets/conan_banner.jpg',
          map_image TEXT DEFAULT '/assets/venue_map_crop.png',
          ticket_count INTEGER DEFAULT 4,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create tickets table
      db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER,
          seat_label TEXT DEFAULT 'SEAT',
          seat_number INTEGER,
          section TEXT DEFAULT 'Floor',
          row_name TEXT DEFAULT '0',
          status TEXT DEFAULT 'active', -- 'active', 'transfer_pending', 'transferred'
          barcode_code TEXT,
          transferred_to_name TEXT,
          transferred_to_contact TEXT,
          transferred_at TEXT,
          transfer_note TEXT,
          FOREIGN KEY (event_id) REFERENCES events (id)
        )
      `);

      // Create transfers table
      db.run(`
        CREATE TABLE IF NOT EXISTS transfers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER,
          ticket_ids TEXT, -- JSON array of ticket ids
          first_name TEXT,
          last_name TEXT,
          email_or_phone TEXT,
          note TEXT,
          status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events (id)
        )
      `);

      // Seed initial data if events table is empty
      db.get('SELECT COUNT(*) as count FROM events', (err, row) => {
        if (err) return reject(err);
        if (row.count === 0) {
          // Set countdown target ~ 3 days 5 hours 48 minutes 31 seconds from now
          const targetDate = new Date(Date.now() + (3 * 86400 + 5 * 3600 + 48 * 60 + 31) * 1000).toISOString();
          
          db.run(`
            INSERT INTO events (
              id, artist_name, tour_name, badge_text, section, row_name, seat_type,
              venue_name, venue_city, event_date, countdown_target,
              ticket_price, service_fee, order_number, artist_image, map_image, ticket_count
            ) VALUES (
              1, 'Conan Gray', 'Superache Tour', 'Verified Fan Onsale', 'Floor', '0', 'General Admission',
              'Arrow', 'Allentown, PA', 'Sat, Aug 15, 7:00 PM', ?,
              89.50, 18.25, '28-49201/PHL', '/assets/conan_banner.jpg', '/assets/venue_map_crop.png', 4
            )
          `, [targetDate], function(insertErr) {
            if (insertErr) return reject(insertErr);
            
            // Insert 4 initial tickets
            const stmt = db.prepare(`
              INSERT INTO tickets (event_id, seat_label, seat_number, section, row_name, status, barcode_code)
              VALUES (1, 'SEAT', ?, 'Floor', '0', 'active', ?)
            `);
            for (let i = 1; i <= 4; i++) {
              stmt.run(i, `819204810294${i}102`);
            }
            stmt.finalize(() => {
              console.log('Database initialized with seed event and 4 tickets.');
              resolve();
            });
          });
        } else {
          resolve();
        }
      });
    });
  });
}

module.exports = {
  db,
  initDb
};
