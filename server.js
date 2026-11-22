const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static assets and frontend
app.use(express.static(path.join(__dirname, 'public')));

// API: Get current event info
app.get('/api/event', (req, res) => {
  db.get('SELECT * FROM events WHERE id = 1', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// API: Update event info (artist, dates, price, venue, image, countdown target, etc.)
app.put('/api/event', (req, res) => {
  const {
    artist_name,
    tour_name,
    badge_text,
    section,
    row_name,
    seat_type,
    venue_name,
    venue_city,
    event_date,
    countdown_target,
    ticket_price,
    service_fee,
    order_number,
    artist_image,
    map_image
  } = req.body;

  const sql = `
    UPDATE events SET
      artist_name = COALESCE(?, artist_name),
      tour_name = COALESCE(?, tour_name),
      badge_text = COALESCE(?, badge_text),
      section = COALESCE(?, section),
      row_name = COALESCE(?, row_name),
      seat_type = COALESCE(?, seat_type),
      venue_name = COALESCE(?, venue_name),
      venue_city = COALESCE(?, venue_city),
      event_date = COALESCE(?, event_date),
      countdown_target = COALESCE(?, countdown_target),
      ticket_price = COALESCE(?, ticket_price),
      service_fee = COALESCE(?, service_fee),
      order_number = COALESCE(?, order_number),
      artist_image = COALESCE(?, artist_image),
      map_image = COALESCE(?, map_image),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `;

  const params = [
    artist_name,
    tour_name,
    badge_text,
    section,
    row_name,
    seat_type,
    venue_name,
    venue_city,
    event_date,
    countdown_target,
    ticket_price,
    service_fee,
    order_number,
    artist_image,
    map_image
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });

    // Also update tickets section/row if changed
    if (section || row_name) {
      db.run(
        `UPDATE tickets SET section = COALESCE(?, section), row_name = COALESCE(?, row_name) WHERE event_id = 1`,
        [section, row_name]
      );
    }

    db.get('SELECT * FROM events WHERE id = 1', (getErr, row) => {
      if (getErr) return res.status(500).json({ error: getErr.message });
      res.json({ success: true, event: row });
    });
  });
});

// API: Get tickets
app.get('/api/tickets', (req, res) => {
  db.all('SELECT * FROM tickets WHERE event_id = 1 ORDER BY seat_number ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Transfer tickets
app.post('/api/transfer', (req, res) => {
  const { ticketIds, firstName, lastName, emailOrPhone, note } = req.body;

  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one ticket to transfer.' });
  }

  if (!firstName || !lastName || !emailOrPhone) {
    return res.status(400).json({ error: 'First name, last name, and contact details are required.' });
  }

  const recipientFullName = `${firstName.trim()} ${lastName.trim()}`;
  const now = new Date().toISOString();

  // Insert into transfers
  db.run(
    `INSERT INTO transfers (event_id, ticket_ids, first_name, last_name, email_or_phone, note, status, created_at)
     VALUES (1, ?, ?, ?, ?, ?, 'pending', ?)`,
    [JSON.stringify(ticketIds), firstName.trim(), lastName.trim(), emailOrPhone.trim(), note ? note.trim() : '', now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const transferId = this.lastID;

      // Update the tickets
      const placeholders = ticketIds.map(() => '?').join(',');
      const updateSql = `
        UPDATE tickets SET
          status = 'transfer_pending',
          transferred_to_name = ?,
          transferred_to_contact = ?,
          transferred_at = ?,
          transfer_note = ?
        WHERE id IN (${placeholders})
      `;

      db.run(updateSql, [recipientFullName, emailOrPhone.trim(), now, note ? note.trim() : '', ...ticketIds], function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        res.json({
          success: true,
          transferId,
          recipient: recipientFullName,
          emailOrPhone: emailOrPhone.trim(),
          note: note ? note.trim() : '',
          transferredCount: ticketIds.length,
          transferredAt: now
        });
      });
    }
  );
});

// API: Cancel a transfer
app.post('/api/transfer/cancel', (req, res) => {
  const { ticketId, transferId } = req.body;

  if (ticketId) {
    db.run(
      `UPDATE tickets SET
        status = 'active',
        transferred_to_name = NULL,
        transferred_to_contact = NULL,
        transferred_at = NULL,
        transfer_note = NULL
      WHERE id = ?`,
      [ticketId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Transfer cancelled for ticket.' });
      }
    );
  } else if (transferId) {
    db.get('SELECT * FROM transfers WHERE id = ?', [transferId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Transfer not found' });
      
      const ticketIds = JSON.parse(row.ticket_ids || '[]');
      const placeholders = ticketIds.map(() => '?').join(',');
      
      db.run(
        `UPDATE tickets SET
          status = 'active',
          transferred_to_name = NULL,
          transferred_to_contact = NULL,
          transferred_at = NULL,
          transfer_note = NULL
        WHERE id IN (${placeholders})`,
        ticketIds,
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });
          db.run(`UPDATE transfers SET status = 'cancelled' WHERE id = ?`, [transferId]);
          res.json({ success: true, message: 'Transfer cancelled successfully.' });
        }
      );
    });
  } else {
    res.status(400).json({ error: 'ticketId or transferId required' });
  }
});

// API: Reset all tickets to active
app.post('/api/reset', (req, res) => {
  db.run(`
    UPDATE tickets SET
      status = 'active',
      transferred_to_name = NULL,
      transferred_to_contact = NULL,
      transferred_at = NULL,
      transfer_note = NULL
    WHERE event_id = 1
  `, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run(`DELETE FROM transfers WHERE event_id = 1`, function() {
      res.json({ success: true, message: 'All tickets reset to original active state.' });
    });
  });
});

// API: Update ticket count
app.post('/api/tickets/update-count', (req, res) => {
  const { count } = req.body;
  const num = parseInt(count, 10);
  if (!num || num < 1 || num > 20) {
    return res.status(400).json({ error: 'Ticket count must be between 1 and 20.' });
  }

  db.get('SELECT section, row_name FROM events WHERE id = 1', (err, event) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Delete existing tickets and recreate fresh tickets
    db.run('DELETE FROM tickets WHERE event_id = 1', (delErr) => {
      if (delErr) return res.status(500).json({ error: delErr.message });

      const stmt = db.prepare(`
        INSERT INTO tickets (event_id, seat_label, seat_number, section, row_name, status, barcode_code)
        VALUES (1, 'SEAT', ?, ?, ?, 'active', ?)
      `);

      for (let i = 1; i <= num; i++) {
        stmt.run(i, event.section || 'Floor', event.row_name || '0', `819204810294${i}102`);
      }

      stmt.finalize(() => {
        db.run('UPDATE events SET ticket_count = ? WHERE id = 1', [num]);
        db.all('SELECT * FROM tickets WHERE event_id = 1 ORDER BY seat_number ASC', (tErr, tickets) => {
          if (tErr) return res.status(500).json({ error: tErr.message });
          res.json({ success: true, ticketCount: num, tickets });
        });
      });
    });
  });
});

// API: Get transfers history
app.get('/api/transfers', (req, res) => {
  db.all('SELECT * FROM transfers WHERE event_id = 1 ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Ticketmaster app running at http://localhost:${PORT}`);
    console.log(`Admin settings available at http://localhost:${PORT}/admin.html`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
