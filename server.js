// server.js — Express API backed by Supabase with resilient in-memory fallback
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./utils/supabase');

const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ----------------------------------------------------------------
// Dynamic Server-Side Injection for iOS Home Screen & Favicon
// ----------------------------------------------------------------
app.get(['/', '/index.html'], async (req, res, next) => {
  try {
    let faviconUrl = memoryEvent.favicon_url;
    try {
      const { data } = await supabase.from('events').select('favicon_url').eq('id', 1).single();
      if (data && data.favicon_url) faviconUrl = data.favicon_url;
    } catch (e) {}

    const htmlPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    if (faviconUrl) {
      html = html.replace(/href="\/assets\/apple-touch-icon\.png"/g, `href="${faviconUrl}"`);
      html = html.replace(/href="\/assets\/favicon\.png"/g, `href="${faviconUrl}"`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    next();
  }
});

// Dynamic Web App Manifest for Android & Chrome Home Screen
app.get('/manifest.json', async (req, res) => {
  let faviconUrl = memoryEvent.favicon_url;
  try {
    const { data } = await supabase.from('events').select('favicon_url').eq('id', 1).single();
    if (data && data.favicon_url) faviconUrl = data.favicon_url;
  } catch (e) {}

  const iconSrc = faviconUrl || '/assets/apple-touch-icon.png';
  res.json({
    name: 'Ticketmaster - My Tickets',
    short_name: 'My Tickets',
    description: 'Ticketmaster Mobile Tickets & Transfer',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#121212',
    theme_color: '#121212',
    icons: [
      { src: iconSrc, sizes: '180x180', type: 'image/png', purpose: 'any' },
      { src: iconSrc, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: iconSrc, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  });
});

app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------
// Fallback in-memory store in case Supabase tables are not yet created
// ----------------------------------------------------------------
let memoryEvent = {
  id: 1,
  artist_name: 'Conan Gray',
  tour_name: 'Superache Tour',
  badge_text: 'Verified Fan Onsale',
  section: 'Floor',
  row_name: '0',
  seat_type: 'General Admission',
  venue_name: 'Arrow',
  venue_city: 'Allentown, PA',
  event_date: 'Sat, Aug 15, 7:00 PM',
  countdown_target: new Date(Date.now() + (3 * 86400 + 5 * 3600 + 48 * 60 + 31) * 1000).toISOString(),
  ticket_price: 89.50,
  service_fee: 18.25,
  order_number: '28-49201/PHL',
  artist_image: '/assets/conan_banner.jpg',
  map_image: '/assets/venue_map_crop.png',
  favicon_url: '',
  ticket_count: 4,
  updated_at: new Date().toISOString()
};

let memoryTickets = [1, 2, 3, 4].map(n => ({
  id: n,
  event_id: 1,
  seat_label: 'SEAT',
  seat_number: n,
  section: 'Floor',
  row_name: '0',
  status: 'active',
  barcode_code: `819204810294${n}102`,
  transferred_to_name: null,
  transferred_to_contact: null,
  transferred_at: null,
  transfer_note: null
}));

let memoryTransfers = [];
let useSupabase = true;

// ----------------------------------------------------------------
// GET /api/event
// ----------------------------------------------------------------
app.get('/api/event', async (req, res) => {
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        return res.json(data);
      }
      console.warn('[Supabase] Event query fallback to memory:', error?.message);
    } catch (e) {
      console.warn('[Supabase] Exception:', e.message);
    }
  }
  res.json(memoryEvent);
});

// ----------------------------------------------------------------
// PUT /api/event
// ----------------------------------------------------------------
app.put('/api/event', async (req, res) => {
  const allowed = [
    'artist_name', 'tour_name', 'badge_text', 'section', 'row_name', 'seat_type',
    'venue_name', 'venue_city', 'event_date', 'countdown_target',
    'ticket_price', 'service_fee', 'order_number', 'artist_image', 'map_image', 'favicon_url'
  ];

  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      patch[key] = req.body[key];
      memoryEvent[key] = req.body[key];
    }
  }
  memoryEvent.updated_at = new Date().toISOString();
  patch.updated_at = memoryEvent.updated_at;

  // Sync memory tickets section/row
  if (patch.section || patch.row_name) {
    memoryTickets.forEach(t => {
      if (patch.section) t.section = patch.section;
      if (patch.row_name) t.row_name = patch.row_name;
    });
  }

  if (useSupabase) {
    try {
      if (patch.section || patch.row_name) {
        const ticketPatch = {};
        if (patch.section) ticketPatch.section = patch.section;
        if (patch.row_name) ticketPatch.row_name = patch.row_name;
        await supabase.from('tickets').update(ticketPatch).eq('event_id', 1);
      }

      const { data, error } = await supabase
        .from('events')
        .update(patch)
        .eq('id', 1)
        .select()
        .single();

      if (!error && data) {
        return res.json({ success: true, event: data });
      }
    } catch (e) {
      console.warn('[Supabase PUT] fallback:', e.message);
    }
  }

  res.json({ success: true, event: memoryEvent });
});

// ----------------------------------------------------------------
// GET /api/tickets
// ----------------------------------------------------------------
app.get('/api/tickets', async (req, res) => {
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('event_id', 1)
        .order('seat_number', { ascending: true });

      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (e) {
      console.warn('[Supabase GET tickets] fallback:', e.message);
    }
  }
  res.json(memoryTickets);
});

// ----------------------------------------------------------------
// POST /api/transfer
// ----------------------------------------------------------------
app.post('/api/transfer', async (req, res) => {
  const { ticketIds, firstName, lastName, emailOrPhone, note } = req.body;

  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0)
    return res.status(400).json({ error: 'Please select at least one ticket to transfer.' });

  if (!firstName || !lastName || !emailOrPhone)
    return res.status(400).json({ error: 'First name, last name, and contact details are required.' });

  const recipientFullName = `${firstName.trim()} ${lastName.trim()}`;
  const now = new Date().toISOString();

  // Update in-memory
  const transferId = memoryTransfers.length + 1;
  const newTransfer = {
    id: transferId,
    event_id: 1,
    ticket_ids: ticketIds,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    email_or_phone: emailOrPhone.trim(),
    note: note ? note.trim() : '',
    status: 'pending',
    created_at: now
  };
  memoryTransfers.unshift(newTransfer);

  memoryTickets.forEach(t => {
    if (ticketIds.includes(t.id)) {
      t.status = 'transfer_pending';
      t.transferred_to_name = recipientFullName;
      t.transferred_to_contact = emailOrPhone.trim();
      t.transferred_at = now;
      t.transfer_note = note ? note.trim() : '';
    }
  });

  if (useSupabase) {
    try {
      await supabase.from('transfers').insert({
        event_id: 1,
        ticket_ids: ticketIds,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email_or_phone: emailOrPhone.trim(),
        note: note ? note.trim() : '',
        status: 'pending',
        created_at: now
      });

      await supabase.from('tickets').update({
        status: 'transfer_pending',
        transferred_to_name: recipientFullName,
        transferred_to_contact: emailOrPhone.trim(),
        transferred_at: now,
        transfer_note: note ? note.trim() : ''
      }).in('id', ticketIds);
    } catch (e) {
      console.warn('[Supabase POST transfer] fallback:', e.message);
    }
  }

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

// ----------------------------------------------------------------
// POST /api/transfer/cancel
// ----------------------------------------------------------------
app.post('/api/transfer/cancel', async (req, res) => {
  const { ticketId, transferId } = req.body;

  const resetTicket = (t) => {
    t.status = 'active';
    t.transferred_to_name = null;
    t.transferred_to_contact = null;
    t.transferred_at = null;
    t.transfer_note = null;
  };

  if (ticketId) {
    const t = memoryTickets.find(x => x.id === ticketId);
    if (t) resetTicket(t);

    if (useSupabase) {
      try {
        await supabase.from('tickets').update({
          status: 'active',
          transferred_to_name: null,
          transferred_to_contact: null,
          transferred_at: null,
          transfer_note: null
        }).eq('id', ticketId);
      } catch (e) {}
    }
    return res.json({ success: true, message: 'Transfer cancelled for ticket.' });
  }

  if (transferId) {
    const tr = memoryTransfers.find(x => x.id === transferId);
    if (tr) {
      tr.status = 'cancelled';
      const ids = tr.ticket_ids || [];
      memoryTickets.forEach(t => {
        if (ids.includes(t.id)) resetTicket(t);
      });
    }

    if (useSupabase) {
      try {
        const { data } = await supabase.from('transfers').select('ticket_ids').eq('id', transferId).single();
        if (data && data.ticket_ids) {
          await supabase.from('tickets').update({
            status: 'active',
            transferred_to_name: null,
            transferred_to_contact: null,
            transferred_at: null,
            transfer_note: null
          }).in('id', data.ticket_ids);
        }
        await supabase.from('transfers').update({ status: 'cancelled' }).eq('id', transferId);
      } catch (e) {}
    }
    return res.json({ success: true, message: 'Transfer cancelled successfully.' });
  }

  res.status(400).json({ error: 'ticketId or transferId required' });
});

// ----------------------------------------------------------------
// POST /api/reset
// ----------------------------------------------------------------
app.post('/api/reset', async (req, res) => {
  memoryTickets.forEach(t => {
    t.status = 'active';
    t.transferred_to_name = null;
    t.transferred_to_contact = null;
    t.transferred_at = null;
    t.transfer_note = null;
  });
  memoryTransfers = [];

  if (useSupabase) {
    try {
      await supabase.from('tickets').update({
        status: 'active',
        transferred_to_name: null,
        transferred_to_contact: null,
        transferred_at: null,
        transfer_note: null
      }).eq('event_id', 1);

      await supabase.from('transfers').delete().eq('event_id', 1);
    } catch (e) {}
  }

  res.json({ success: true, message: 'All tickets reset to original active state.' });
});

// ----------------------------------------------------------------
// POST /api/tickets/update-count
// ----------------------------------------------------------------
app.post('/api/tickets/update-count', async (req, res) => {
  const count = parseInt(req.body.count, 10);
  if (!count || count < 1 || count > 20)
    return res.status(400).json({ error: 'Ticket count must be between 1 and 20.' });

  memoryEvent.ticket_count = count;
  memoryTickets = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    event_id: 1,
    seat_label: 'SEAT',
    seat_number: i + 1,
    section: memoryEvent.section || 'Floor',
    row_name: memoryEvent.row_name || '0',
    status: 'active',
    barcode_code: `819204810294${i + 1}102`,
    transferred_to_name: null,
    transferred_to_contact: null,
    transferred_at: null,
    transfer_note: null
  }));

  if (useSupabase) {
    try {
      await supabase.from('tickets').delete().eq('event_id', 1);
      const rows = memoryTickets.map(t => ({
        event_id: 1,
        seat_label: t.seat_label,
        seat_number: t.seat_number,
        section: t.section,
        row_name: t.row_name,
        status: t.status,
        barcode_code: t.barcode_code
      }));
      await supabase.from('tickets').insert(rows);
      await supabase.from('events').update({ ticket_count: count }).eq('id', 1);
    } catch (e) {}
  }

  res.json({ success: true, ticketCount: count, tickets: memoryTickets });
});

// ----------------------------------------------------------------
// GET /api/transfers
// ----------------------------------------------------------------
app.get('/api/transfers', async (req, res) => {
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('event_id', 1)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return res.json(data);
      }
    } catch (e) {}
  }
  res.json(memoryTransfers);
});

// ----------------------------------------------------------------
// POST /api/favicon  —  Save custom favicon data URL
// ----------------------------------------------------------------
app.post('/api/favicon', async (req, res) => {
  const { faviconUrl } = req.body;
  memoryEvent.favicon_url = faviconUrl || '';

  if (useSupabase) {
    try {
      await supabase
        .from('events')
        .update({ favicon_url: faviconUrl || '', updated_at: new Date().toISOString() })
        .eq('id', 1);
    } catch (e) {}
  }

  res.json({ success: true, faviconUrl: memoryEvent.favicon_url });
});

// ----------------------------------------------------------------
// Server boot — verify Supabase connection
// ----------------------------------------------------------------
async function init() {
  try {
    const { data, error } = await supabase.from('events').select('id').limit(1);
    if (error) {
      console.log('[Supabase] Note: Supabase tables not found yet. The app is running smoothly using memory store.');
      console.log('[Supabase] To persist directly in Supabase, run supabase_schema.sql in your Supabase SQL editor.');
    } else {
      console.log('[Supabase] Connected to live Supabase database.');
    }
  } catch (err) {
    console.log('[Supabase] Offline/Memory mode active.');
  }

  app.listen(PORT, () => {
    console.log(`\n🎟️  Ticket Transfer App running at http://localhost:${PORT}`);
    console.log(`⚙️   Admin panel: http://localhost:${PORT}/admin.html\n`);
  });
}

init();
