// server.js — Express API with User Accounts, Multi-User Scoped Events, Settings & Ticket Management
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const supabase = require('./utils/supabase');
const mailer = require('./utils/mailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ----------------------------------------------------------------
// In-Memory Seed State (Full Multi-User Account Support)
// ----------------------------------------------------------------
const DEFAULT_USER_ID = 'user-toom-001';

let memoryUsers = [
  {
    id: DEFAULT_USER_ID,
    email: 'toom41170@gmail.com',
    password: '12345',
    display_name: 'Toom',
    city: 'Los Angeles',
    country: 'United States',
    days_left: 22,
    wallet_passes: 0,
    settings: {
      enableAppleWallet: false,
      useGoogleWallet: false,
      showTransferAccepted: false,
      acceptedByName: 'Mary Flores',
      showBlankPage: false,
      enableTransferFee: false,
      transferFeeAmount: '$50.47'
    },
    created_at: new Date().toISOString()
  }
];

let memoryEvents = [
  {
    id: 1,
    user_id: DEFAULT_USER_ID,
    artist_name: 'U2: THE GREATEST SHOW ON EARTH WORLD TOUR',
    tour_name: 'The Greatest Show on Earth World Tour',
    event_type: 'Standard',
    badge_text: 'Artist Presale',
    section: 'GA',
    row_name: '',
    seat_type: 'General Admission',
    venue_name: 'San Siro Stadium',
    venue_city: 'Milano',
    event_date: 'Mon, Jul 05, 2027 • 7:30 PM',
    purchase_date: 'Thu, Oct 29, 2026',
    entrance_details: 'Gate 4 Entrance',
    countdown_target: new Date('2027-07-05T19:30:00Z').toISOString(),
    days_until: 221,
    ticket_price: 145.00,
    service_fee: 24.50,
    order_number: '5-85630/UT5',
    artist_image: '/assets/u2_banner.jpg',
    map_image: '/assets/venue_map_crop.png',
    favicon_url: '',
    ticket_count: 4,
    is_hidden: false,
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    user_id: DEFAULT_USER_ID,
    artist_name: 'STRAY KIDS WORLD TOUR [RUN IT ARNHEM]',
    tour_name: '[RUN IT ARNHEM]',
    event_type: 'Standard',
    badge_text: 'VIP Package',
    section: 'SEC 102',
    row_name: 'F',
    seat_type: 'Reserved Seating',
    venue_name: 'GelreDome',
    venue_city: 'Arnhem',
    event_date: 'Tue, Jul 27, 2027 • 7:30 PM',
    purchase_date: 'Mon, Nov 02, 2026',
    entrance_details: 'Main Entrance North',
    countdown_target: new Date('2027-07-27T19:30:00Z').toISOString(),
    days_until: 243,
    ticket_price: 185.00,
    service_fee: 28.00,
    order_number: '7-99120/SKZ',
    artist_image: '/assets/straykids_banner.jpg',
    map_image: '/assets/venue_map_crop.png',
    ticket_count: 2,
    is_hidden: false,
    updated_at: new Date().toISOString()
  }
];

let memoryTickets = [
  // U2 tickets (4)
  { id: 101, event_id: 1, user_id: DEFAULT_USER_ID, seat_label: 'GA1', seat_number: 1, section: 'GA', row_name: 'GA1', status: 'active', barcode_code: '8192048102941102' },
  { id: 102, event_id: 1, user_id: DEFAULT_USER_ID, seat_label: 'GA2', seat_number: 2, section: 'GA', row_name: 'GA2', status: 'active', barcode_code: '8192048102942102' },
  { id: 103, event_id: 1, user_id: DEFAULT_USER_ID, seat_label: 'GA3', seat_number: 3, section: 'GA', row_name: 'GA3', status: 'active', barcode_code: '8192048102943102' },
  { id: 104, event_id: 1, user_id: DEFAULT_USER_ID, seat_label: 'GA4', seat_number: 4, section: 'GA', row_name: 'GA4', status: 'active', barcode_code: '8192048102944102' },
  // Stray kids tickets (2)
  { id: 201, event_id: 2, user_id: DEFAULT_USER_ID, seat_label: 'SEAT 14', seat_number: 14, section: 'SEC 102', row_name: 'F', status: 'active', barcode_code: '9301294810291101' },
  { id: 202, event_id: 2, user_id: DEFAULT_USER_ID, seat_label: 'SEAT 15', seat_number: 15, section: 'SEC 102', row_name: 'F', status: 'active', barcode_code: '9301294810291102' }
];

let memoryTransfers = [];
let siteFaviconUrl = '';

// Helper to persist in-memory store to disk (survives local restarts)
const STORE_PATH = path.join(__dirname, 'data_store.json');

function saveStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify({
      users: memoryUsers,
      events: memoryEvents,
      tickets: memoryTickets,
      transfers: memoryTransfers,
      siteFaviconUrl
    }, null, 2));
  } catch (e) {}
}

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      if (Array.isArray(raw.users) && raw.users.length) memoryUsers = raw.users;
      if (Array.isArray(raw.events) && raw.events.length) memoryEvents = raw.events;
      if (Array.isArray(raw.tickets) && raw.tickets.length) memoryTickets = raw.tickets;
      if (Array.isArray(raw.transfers)) memoryTransfers = raw.transfers;
      if (typeof raw.siteFaviconUrl === 'string') siteFaviconUrl = raw.siteFaviconUrl;
    }
  } catch (e) {}
}
loadStore();

// ----------------------------------------------------------------
// Supabase Database Sync Helpers (Non-blocking with local fallback)
// ----------------------------------------------------------------
async function dbUpsertUser(u) {
  try {
    const userEvents = memoryEvents.filter(e => e.user_id === u.id);
    const userTickets = memoryTickets.filter(t => t.user_id === u.id);
    const mergedSettings = {
      ...(u.settings || {}),
      _events: userEvents,
      _tickets: userTickets
    };
    await supabase.from('app_users').upsert({
      id: u.id,
      email: u.email,
      password: u.password,
      display_name: u.display_name,
      city: u.city,
      country: u.country,
      days_left: u.days_left || 30,
      wallet_passes: u.wallet_passes || 0,
      settings: mergedSettings,
      updated_at: new Date().toISOString()
    });
  } catch (e) {}
}

function hydrateUserFromSupabase(u) {
  if (!u || !u.settings) return;
  // Hydrate events from settings._events (primary per-user storage)
  if (Array.isArray(u.settings._events)) {
    u.settings._events.forEach(ev => {
      // Ensure user_id is tagged on the event
      ev.user_id = u.id;
      if (!memoryEvents.find(me => me.id === ev.id)) {
        memoryEvents.push(ev);
      }
    });
  }
  // Hydrate tickets from settings._tickets
  if (Array.isArray(u.settings._tickets)) {
    u.settings._tickets.forEach(t => {
      t.user_id = u.id;
      if (!memoryTickets.find(mt => mt.id === t.id)) {
        memoryTickets.push(t);
      }
    });
  }
}

async function dbUpsertEvent(ev) {
  // Only send columns that exist in the Supabase events table
  try {
    await supabase.from('events').upsert({
      id: ev.id,
      artist_name: ev.artist_name,
      tour_name: ev.tour_name,
      badge_text: ev.badge_text,
      section: ev.section,
      row_name: ev.row_name,
      seat_type: ev.seat_type,
      venue_name: ev.venue_name,
      venue_city: ev.venue_city,
      event_date: ev.event_date,
      countdown_target: ev.countdown_target || null,
      ticket_price: ev.ticket_price,
      service_fee: ev.service_fee,
      order_number: ev.order_number,
      artist_image: ev.artist_image,
      map_image: ev.map_image,
      favicon_url: ev.favicon_url || '',
      ticket_count: ev.ticket_count,
      updated_at: new Date().toISOString()
    });
  } catch (e) {}
}

async function dbUpsertTickets(tix) {
  if (!Array.isArray(tix) || tix.length === 0) return;
  // Only send columns that exist in the Supabase tickets table (no user_id)
  try {
    await supabase.from('tickets').upsert(tix.map(t => ({
      id: t.id,
      event_id: t.event_id,
      seat_label: t.seat_label,
      seat_number: t.seat_number,
      section: t.section,
      row_name: t.row_name,
      status: t.status,
      barcode_code: t.barcode_code,
      transferred_to_name: t.transferred_to_name || null,
      transferred_to_contact: t.transferred_to_contact || null,
      transferred_at: t.transferred_at || null,
      transfer_note: t.transfer_note || null
    })));
  } catch (e) {}
}

async function dbSaveTransfer(tr) {
  // Note: transfers table has no user_id column, store in-memory + data_store.json only
  try {
    await supabase.from('transfers').upsert({
      id: tr.id,
      event_id: tr.event_id,
      ticket_ids: tr.ticket_ids,
      first_name: tr.first_name,
      last_name: tr.last_name,
      email_or_phone: tr.email_or_phone,
      note: tr.note,
      status: tr.status,
      created_at: tr.created_at
    });
  } catch (e) {}
}

async function syncFromSupabase() {
  try {
    // Load all registered users from Supabase and hydrate their events/tickets
    const { data: users, error: uErr } = await supabase.from('app_users').select('*');
    if (!uErr && Array.isArray(users) && users.length > 0) {
      users.forEach(u => {
        // Skip the legacy demo user
        if (u.id === DEFAULT_USER_ID || (u.email && u.email.toLowerCase().includes('toom4117'))) return;
        // Add to memory if not already there
        const existingIdx = memoryUsers.findIndex(mu => mu.id === u.id || mu.email.toLowerCase() === u.email.toLowerCase());
        if (existingIdx < 0) {
          memoryUsers.push(u);
        } else {
          // Merge: keep memory version but update settings from Supabase
          memoryUsers[existingIdx] = { ...memoryUsers[existingIdx], ...u };
        }
        // Hydrate their events/tickets from settings._events/_tickets
        hydrateUserFromSupabase(u);
      });
      console.log(`[Supabase] Loaded ${users.length} users from app_users.`);
    }
  } catch (e) {
    console.warn('[Supabase] syncFromSupabase failed:', e.message);
  }
}

// Helper to authenticate request (strict when x-user-id is checked)
async function resolveRequestUser(req, allowFallback = true) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const userIdHeader = (req.headers['x-user-id'] || '').trim();
  const lookupId = token || userIdHeader;

  if (lookupId && lookupId !== 'null' && lookupId !== 'undefined') {
    let found = memoryUsers.find(u => u.id === lookupId || u.email === lookupId);
    if (!found) {
      try {
        const { data } = await supabase.from('app_users').select('*').eq('id', lookupId).limit(1);
        if (data && data.length > 0) {
          found = data[0];
          memoryUsers.push(found);
          hydrateUserFromSupabase(found);
        }
      } catch (e) {}
    }
    if (found) {
      hydrateUserFromSupabase(found);
      return found;
    }
  }

  return allowFallback ? memoryUsers[0] : null;
}

function getRequestUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const userIdHeader = req.headers['x-user-id'];

  if (token) {
    const found = memoryUsers.find(u => u.id === token || u.email === token);
    if (found) return found;
  }
  if (userIdHeader) {
    const found = memoryUsers.find(u => u.id === userIdHeader);
    if (found) return found;
  }
  return memoryUsers[0];
}

// ----------------------------------------------------------------
// Dynamic Server-Side Injection for iOS Home Screen & Favicon
// ----------------------------------------------------------------
app.get(['/', '/index.html'], async (req, res, next) => {
  try {
    const user = getRequestUser(req);
    const activeEvent = memoryEvents.find(e => e.user_id === user.id) || memoryEvents[0];
    const faviconUrl = siteFaviconUrl || activeEvent?.favicon_url || '';

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

// Dynamic Web App Manifest
app.get('/manifest.json', async (req, res) => {
  const user = getRequestUser(req);
  const activeEvent = memoryEvents.find(e => e.user_id === user.id) || memoryEvents[0];
  const iconSrc = siteFaviconUrl || activeEvent?.favicon_url || '/assets/apple-touch-icon.png';
  res.json({
    name: 'Ticketmaster - My Tickets',
    short_name: 'My Tickets',
    description: 'Ticketmaster Mobile Tickets & Transfer',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b0c0e',
    theme_color: '#0b0c0e',
    icons: [
      { src: iconSrc, sizes: '180x180', type: 'image/png', purpose: 'any' },
      { src: iconSrc, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: iconSrc, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  });
});

// Claim ticket routes (clean URLs + fallback)
app.get(['/services/tickets/claim', '/claim', '/claim-ticket.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'claim-ticket.html'));
});

// Recipient Mini My Tickets route
app.get(['/my-tickets', '/my-tickets.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'my-tickets.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------
// Authentication API
// ----------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName, city, country } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  let existing = memoryUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!existing) {
    try {
      const { data: sbExisting } = await supabase
        .from('app_users')
        .select('id')
        .ilike('email', email.trim())
        .limit(1);
      if (sbExisting && sbExisting.length > 0) existing = sbExisting[0];
    } catch (e) {}
  }
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const newUser = {
    id: 'user-' + Date.now(),
    email: email.trim(),
    password: password.trim(),
    display_name: displayName ? displayName.trim() : email.split('@')[0],
    city: city ? city.trim() : 'Los Angeles',
    country: country ? country.trim() : 'United States',
    days_left: 30,
    wallet_passes: 0,
    settings: {
      enableAppleWallet: false,
      useGoogleWallet: false,
      showTransferAccepted: false,
      acceptedByName: 'Mary Flores',
      showBlankPage: false,
      enableTransferFee: false,
      transferFeeAmount: '$50.47'
    },
    created_at: new Date().toISOString()
  };

  memoryUsers.push(newUser);

  // Seed default U2 and Stray Kids events for this new user so their account is populated with ONLY these two!
  const u2EventId = Date.now();
  const u2Event = {
    id: u2EventId,
    user_id: newUser.id,
    artist_name: 'U2: THE GREATEST SHOW ON EARTH WORLD TOUR',
    tour_name: 'The Greatest Show on Earth World Tour',
    event_type: 'Standard',
    badge_text: 'Artist Presale',
    section: 'GA',
    row_name: '',
    seat_type: 'General Admission',
    venue_name: 'San Siro Stadium',
    venue_city: 'Milano',
    event_date: 'Mon, Jul 05, 2027 • 7:30 PM',
    purchase_date: 'Thu, Oct 29, 2026',
    entrance_details: 'Gate 4 Entrance',
    countdown_target: new Date('2027-07-05T19:30:00Z').toISOString(),
    days_until: 221,
    ticket_price: 145.00,
    service_fee: 24.50,
    order_number: '5-85630/UT5',
    artist_image: '/assets/u2_banner.jpg',
    map_image: '/assets/venue_map_crop.png',
    favicon_url: '',
    ticket_count: 4,
    is_hidden: false,
    updated_at: new Date().toISOString()
  };
  memoryEvents.push(u2Event);

  for (let i = 1; i <= 4; i++) {
    memoryTickets.push({
      id: Date.now() + i,
      event_id: u2Event.id,
      user_id: newUser.id,
      seat_label: `GA${i}`,
      seat_number: i,
      section: 'GA',
      row_name: `GA${i}`,
      status: 'active',
      barcode_code: `819204810294${i}102`
    });
  }

  const skzEventId = Date.now() + 10;
  const skzEvent = {
    id: skzEventId,
    user_id: newUser.id,
    artist_name: 'STRAY KIDS WORLD TOUR [RUN IT ARNHEM]',
    tour_name: '[RUN IT ARNHEM]',
    event_type: 'Standard',
    badge_text: 'VIP Package',
    section: 'SEC 102',
    row_name: 'F',
    seat_type: 'Reserved Seating',
    venue_name: 'GelreDome',
    venue_city: 'Arnhem',
    event_date: 'Tue, Jul 27, 2027 • 7:30 PM',
    purchase_date: 'Mon, Nov 02, 2026',
    entrance_details: 'Main Entrance North',
    countdown_target: new Date('2027-07-27T19:30:00Z').toISOString(),
    days_until: 243,
    ticket_price: 185.00,
    service_fee: 28.00,
    order_number: '7-99120/SKZ',
    artist_image: '/assets/straykids_banner.jpg',
    map_image: '/assets/venue_map_crop.png',
    ticket_count: 2,
    is_hidden: false,
    updated_at: new Date().toISOString()
  };
  memoryEvents.push(skzEvent);

  memoryTickets.push(
    { id: Date.now() + 20, event_id: skzEvent.id, user_id: newUser.id, seat_label: 'SEAT 14', seat_number: 14, section: 'SEC 102', row_name: 'F', status: 'active', barcode_code: '9301294810291101' },
    { id: Date.now() + 21, event_id: skzEvent.id, user_id: newUser.id, seat_label: 'SEAT 15', seat_number: 15, section: 'SEC 102', row_name: 'F', status: 'active', barcode_code: '9301294810291102' }
  );

  // IMPORTANT: Save store first so memoryEvents has the new events before dbUpsertUser serialises them
  saveStore();
  // dbUpsertUser reads memoryEvents to build settings._events — call AFTER all events/tickets are pushed
  await dbUpsertUser(newUser);

  res.json({
    success: true,
    token: newUser.id,
    user: {
      id: newUser.id,
      email: newUser.email,
      display_name: newUser.display_name,
      city: newUser.city,
      country: newUser.country,
      days_left: newUser.days_left,
      wallet_passes: newUser.wallet_passes,
      settings: newUser.settings
    }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  let user = memoryUsers.find(
    u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password.trim()
  );

  if (!user) {
    // Check Supabase app_users
    try {
      const { data: sbUsers } = await supabase
        .from('app_users')
        .select('*')
        .ilike('email', email.trim())
        .eq('password', password.trim())
        .limit(1);
      if (sbUsers && sbUsers.length > 0) {
        user = sbUsers[0];
        // Hydrate events/tickets from their Supabase settings._events/_tickets
        hydrateUserFromSupabase(user);
        // Add to memory if not already there
        if (!memoryUsers.find(mu => mu.id === user.id)) {
          memoryUsers.push(user);
        } else {
          // Update the memory copy with fresh Supabase data
          const idx = memoryUsers.findIndex(mu => mu.id === user.id);
          if (idx >= 0) memoryUsers[idx] = { ...memoryUsers[idx], ...user };
        }
        saveStore();
      }
    } catch (e) {}
  } else {
    // Refresh user from Supabase to get latest events
    try {
      const { data: sbUsers } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', user.id)
        .limit(1);
      if (sbUsers && sbUsers.length > 0) {
        const fresh = sbUsers[0];
        hydrateUserFromSupabase(fresh);
        // Merge settings from Supabase back into memory user
        const memIdx = memoryUsers.findIndex(mu => mu.id === user.id);
        if (memIdx >= 0) {
          memoryUsers[memIdx] = { ...memoryUsers[memIdx], ...fresh, settings: { ...memoryUsers[memIdx].settings, ...(fresh.settings || {}) } };
          user = memoryUsers[memIdx];
        }
      }
    } catch (e) {}
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  res.json({
    success: true,
    token: user.id,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      city: user.city,
      country: user.country,
      days_left: user.days_left,
      wallet_passes: user.wallet_passes,
      settings: user.settings
    }
  });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  if (!user || user.id === DEFAULT_USER_ID) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    city: user.city,
    country: user.country,
    days_left: user.days_left,
    wallet_passes: user.wallet_passes,
    settings: user.settings
  });
});

// Delete own account
app.delete('/api/auth/account', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  if (!user || user.id === DEFAULT_USER_ID) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const uid = user.id;
  memoryUsers = memoryUsers.filter(u => u.id !== uid);
  memoryEvents = memoryEvents.filter(e => e.user_id !== uid);
  memoryTickets = memoryTickets.filter(t => t.user_id !== uid);
  memoryTransfers = memoryTransfers.filter(tr => tr.user_id !== uid);
  saveStore();

  try {
    await supabase.from('app_users').delete().eq('id', uid);
  } catch (e) {}

  res.json({ success: true, message: 'Account deleted permanently.' });
});

// Admin: list & delete registered accounts
app.get('/api/admin/users', async (req, res) => {
  try {
    const { data: sbUsers } = await supabase.from('app_users').select('id, email, display_name, city, country, created_at, settings');
    if (Array.isArray(sbUsers)) {
      sbUsers.forEach(u => {
        if (u.id === DEFAULT_USER_ID || (u.email && u.email.toLowerCase().includes('toom4117'))) return;
        if (!memoryUsers.find(mu => mu.id === u.id)) {
          memoryUsers.push(u);
          hydrateUserFromSupabase(u);
        }
      });
    }
  } catch (e) {}

  const list = memoryUsers
    .filter(u => u.id !== DEFAULT_USER_ID && !(u.email && u.email.toLowerCase().includes('toom4117')))
    .map(u => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      city: u.city || '',
      country: u.country || '',
      event_count: memoryEvents.filter(e => e.user_id === u.id).length,
      created_at: u.created_at
    }));
  res.json(list);
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const uid = req.params.id;
  if (!uid || uid === DEFAULT_USER_ID) {
    return res.status(400).json({ error: 'Cannot delete default seed.' });
  }
  memoryUsers = memoryUsers.filter(u => u.id !== uid);
  memoryEvents = memoryEvents.filter(e => e.user_id !== uid);
  memoryTickets = memoryTickets.filter(t => t.user_id !== uid);
  memoryTransfers = memoryTransfers.filter(tr => tr.user_id !== uid);
  saveStore();

  try {
    await supabase.from('app_users').delete().eq('id', uid);
  } catch (e) {}

  res.json({ success: true, message: 'User account deleted.' });
});

// Update Profile & Location
app.put('/api/user/profile', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  if (!user || user.id === DEFAULT_USER_ID) {
    return res.status(401).json({ error: 'Please sign in first.' });
  }
  const { display_name, email, city, country } = req.body;

  if (display_name !== undefined) user.display_name = display_name.trim();
  if (email !== undefined) user.email = email.trim();
  if (city !== undefined) user.city = city.trim();
  if (country !== undefined) user.country = country.trim();

  saveStore();
  await dbUpsertUser(user);
  res.json({ success: true, user });
});

// Update Settings
app.put('/api/user/settings', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  if (!user || user.id === DEFAULT_USER_ID) {
    return res.status(401).json({ error: 'Please sign in first.' });
  }
  user.settings = {
    ...user.settings,
    ...req.body
  };
  saveStore();
  await dbUpsertUser(user);
  res.json({ success: true, settings: user.settings });
});

// Flutterwave pass credit purchase
app.post('/api/user/buy-passes', (req, res) => {
  const user = getRequestUser(req);
  const qty = parseInt(req.body.quantity, 10) || 2;
  user.wallet_passes = (user.wallet_passes || 0) + qty;
  saveStore();
  dbUpsertUser(user);
  res.json({ success: true, wallet_passes: user.wallet_passes, added: qty });
});

// ----------------------------------------------------------------
// Events API (Scoped per User)
// ----------------------------------------------------------------
app.get('/api/events', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  if (!user) return res.json([]);

  let userEvents = memoryEvents.filter(e => e.user_id === user.id);

  // If not in memory, check the user's Supabase app_users.settings._events
  if (userEvents.length === 0) {
    try {
      const { data: sbUser } = await supabase.from('app_users').select('settings').eq('id', user.id).limit(1);
      if (sbUser && sbUser.length > 0 && sbUser[0].settings && Array.isArray(sbUser[0].settings._events) && sbUser[0].settings._events.length > 0) {
        sbUser[0].settings._events.forEach(ev => {
          ev.user_id = user.id; // Ensure user_id is set
          if (!memoryEvents.find(me => me.id === ev.id)) memoryEvents.push(ev);
        });
        // Also hydrate tickets
        if (Array.isArray(sbUser[0].settings._tickets)) {
          sbUser[0].settings._tickets.forEach(t => {
            t.user_id = user.id;
            if (!memoryTickets.find(mt => mt.id === t.id)) memoryTickets.push(t);
          });
        }
        userEvents = memoryEvents.filter(e => e.user_id === user.id);
        saveStore();
      }
    } catch (e) {}
  }

  if (userEvents.length > 0) {
    return res.json(userEvents);
  }
  if (user.id === DEFAULT_USER_ID) {
    return res.json(memoryEvents.filter(e => !e.user_id || e.user_id === DEFAULT_USER_ID));
  }
  return res.json([]);
});

app.get('/api/events/:id', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  const id = parseInt(req.params.id, 10);
  const event = memoryEvents.find(e => e.id === id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const tickets = memoryTickets.filter(t => t.event_id === id && (!user || t.user_id === user.id));
  res.json({ ...event, tickets });
});

app.post('/api/events', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  if (!user) {
    return res.status(401).json({ error: 'Please sign in or create an account first.' });
  }
  const {
    artist_name, tour_name, event_type, badge_text, section, row_name,
    venue_name, venue_city, event_date, purchase_date, entrance_details,
    artist_image, ticket_count, ticket_price, service_fee, order_number,
    lat, lng, map_image, currency, seat_type, tickets
  } = req.body;

  if (!artist_name || !venue_name) {
    return res.status(400).json({ error: 'Event name and venue are required.' });
  }

  const newId = Date.now();
  const ticketList = Array.isArray(tickets) && tickets.length > 0 ? tickets : null;
  const count = ticketList ? ticketList.length : (parseInt(ticket_count, 10) || 4);
  const newEvent = {
    id: newId,
    user_id: user.id,
    artist_name: artist_name.trim(),
    tour_name: tour_name ? tour_name.trim() : artist_name.trim(),
    event_type: event_type || 'Standard',
    badge_text: badge_text || 'General Sale',
    section: section || (ticketList ? ticketList[0].section : 'GA'),
    row_name: row_name || (ticketList ? ticketList[0].row_name : ''),
    seat_type: seat_type || (section === 'GA' ? 'General Admission' : 'Reserved Seating'),
    venue_name: venue_name.trim(),
    venue_city: venue_city ? venue_city.trim() : user.city,
    event_date: event_date || 'Sat, Dec 12, 2026 • 8:00 PM',
    purchase_date: purchase_date || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    entrance_details: entrance_details || 'Gate 1 Entrance',
    countdown_target: new Date(Date.now() + 14 * 86400000).toISOString(),
    days_until: 14,
    currency: currency || 'USD',
    ticket_price: parseFloat(ticket_price) || 49.99,
    service_fee: parseFloat(service_fee) || 12.50,
    order_number: order_number || `8-${Math.floor(10000 + Math.random() * 90000)}/US3`,
    artist_image: artist_image || '/assets/u2_banner.jpg',
    map_image: map_image || '/assets/venue_map_crop.png',
    lat: lat || '40.7505',
    lng: lng || '-73.9934',
    favicon_url: '',
    ticket_count: count,
    is_hidden: false,
    updated_at: new Date().toISOString()
  };

  memoryEvents.unshift(newEvent);

  // Generate ticket seats
  if (ticketList) {
    ticketList.forEach((t, i) => {
      memoryTickets.push({
        id: Date.now() + i + 1,
        event_id: newId,
        user_id: user.id,
        seat_label: t.seat_label || (t.row_name ? `${t.section} ${t.row_name} ${t.seat_number}` : `${t.section}${t.seat_number}`),
        seat_number: t.seat_number || (i + 1),
        section: t.section || newEvent.section,
        row_name: t.row_name || '',
        status: 'active',
        barcode_code: `819204810294${i + 1}102`
      });
    });
  } else {
    for (let i = 1; i <= count; i++) {
      memoryTickets.push({
        id: Date.now() + i,
        event_id: newId,
        user_id: user.id,
        seat_label: `${newEvent.section}${i}`,
        seat_number: i,
        section: newEvent.section,
        row_name: newEvent.row_name || `${newEvent.section}${i}`,
        status: 'active',
        barcode_code: `819204810294${i}102`
      });
    }
  }

  saveStore();
  await dbUpsertUser(user);
  res.json({ success: true, event: newEvent });
});

app.put('/api/events/:id', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  const id = parseInt(req.params.id, 10);
  const event = memoryEvents.find(e => e.id === id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const fields = [
    'artist_name', 'tour_name', 'event_type', 'badge_text', 'section', 'row_name',
    'venue_name', 'venue_city', 'event_date', 'purchase_date', 'entrance_details',
    'ticket_price', 'artist_image', 'favicon_url'
  ];

  fields.forEach(f => {
    if (req.body[f] !== undefined) event[f] = req.body[f];
  });
  event.updated_at = new Date().toISOString();

  // If section changed, update ticket seats
  if (req.body.section) {
    memoryTickets.filter(t => t.event_id === id).forEach(t => {
      t.section = req.body.section;
    });
  }

  saveStore();
  if (user) await dbUpsertUser(user);
  res.json({ success: true, event });
});

app.delete('/api/events/:id', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  const id = parseInt(req.params.id, 10);
  memoryEvents = memoryEvents.filter(e => e.id !== id);
  memoryTickets = memoryTickets.filter(t => t.event_id !== id);
  saveStore();
  if (user) await dbUpsertUser(user);
  res.json({ success: true, message: 'Event deleted successfully.' });
});

app.post('/api/events/:id/toggle-visibility', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  const id = parseInt(req.params.id, 10);
  const event = memoryEvents.find(e => e.id === id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  event.is_hidden = !event.is_hidden;
  saveStore();
  if (user) await dbUpsertUser(user);
  res.json({ success: true, is_hidden: event.is_hidden });
});

// ----------------------------------------------------------------
// Tickets & Transfer API
// ----------------------------------------------------------------
app.get('/api/events/:id/tickets', async (req, res) => {
  const user = await resolveRequestUser(req, false);
  const id = parseInt(req.params.id, 10);

  // Try user-scoped tickets first
  let tickets = memoryTickets.filter(t => t.event_id === id && user && t.user_id === user.id);

  // If no scoped tickets, fall back to any tickets for this event (handles legacy data)
  if (tickets.length === 0) {
    tickets = memoryTickets.filter(t => t.event_id === id);
  }

  res.json(tickets);
});

app.post('/api/events/:id/transfer', async (req, res) => {
  const user = getRequestUser(req);
  const eventId = parseInt(req.params.id, 10);
  const { ticketIds, firstName, lastName, emailOrPhone, note } = req.body;

  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one ticket.' });
  }

  const recipientName = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim() || 'Ticket Recipient';
  const contact = (emailOrPhone || '').trim();
  const now = new Date().toISOString();

  // Find the event
  const event = memoryEvents.find(e => e.id === eventId) || memoryEvents[0];
  const transferredTickets = memoryTickets.filter(t => ticketIds.includes(t.id));

  // Generate secure transfer claim token
  const token = 'tf_' + crypto.randomBytes(16).toString('hex');

  // Compute absolute base URL & claim URL
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
  const envBase = (process.env.APP_BASE_URL || '').trim();
  const baseUrl = (envBase && !envBase.includes('localhost')) ? envBase : `${protocol}://${host}`;

  const senderName = user.display_name || user.email.split('@')[0] || 'A Friend';
  const fallbackPayload = Buffer.from(JSON.stringify({
    s: senderName,
    rn: recipientName,
    re: contact,
    n: note || '',
    eid: event.id,
    en: event.artist_name,
    et: event.tour_name,
    ed: event.event_date,
    vn: event.venue_name,
    vc: event.venue_city,
    img: event.artist_image,
    sec: event.section,
    row: event.row_name,
    tids: ticketIds,
    seats: transferredTickets.map(t => ({
      id: t.id,
      section: t.section,
      row_name: t.row_name,
      seat_label: t.seat_label,
      seat_number: t.seat_number,
      barcode_code: t.barcode_code
    }))
  })).toString('base64url');

  const claimUrl = `${baseUrl}/services/tickets/claim?token=${token}&d=${fallbackPayload}`;

  const transferRecord = {
    id: Date.now(),
    token: token,
    user_id: user.id,
    event_id: eventId,
    ticket_ids: ticketIds,
    first_name: firstName || '',
    last_name: lastName || '',
    recipient_name: recipientName,
    email_or_phone: contact,
    note: note || '',
    status: 'pending',
    claim_url: claimUrl,
    created_at: now
  };
  memoryTransfers.unshift(transferRecord);

  // Update tickets to transfer_pending state
  memoryTickets.forEach(t => {
    if (ticketIds.includes(t.id)) {
      t.status = 'transfer_pending';
      t.transferred_to_name = recipientName;
      t.transferred_to_contact = contact;
      t.transferred_at = now;
      t.transfer_note = note || '';
      t.transfer_token = token;
    }
  });

  saveStore();

  // Dispatch email if contact is an email address
  let emailResult = null;
  if (contact && contact.includes('@')) {
    emailResult = await mailer.sendTransferEmail({
      senderName: senderName,
      recipientEmail: contact,
      recipientName: recipientName,
      event: event,
      tickets: transferredTickets,
      note: note,
      claimUrl: claimUrl,
      baseUrl: baseUrl
    });
  }

  res.json({
    success: true,
    transfer: transferRecord,
    claimUrl: claimUrl,
    emailResult: emailResult,
    transferredCount: ticketIds.length
  });
});

function decodeTransferFallback(token, dParam) {
  if (!dParam) return null;
  try {
    const p = JSON.parse(Buffer.from(dParam, 'base64url').toString('utf8'));
    return {
      transfer: {
        id: Date.now(),
        token,
        status: 'pending',
        sender_name: p.s || 'A Friend',
        recipient_name: p.rn || 'Ticket Recipient',
        recipient_email: p.re || '',
        note: p.n || '',
        ticket_ids: p.tids || [],
        event_id: p.eid || 1,
        created_at: new Date().toISOString()
      },
      event: {
        id: p.eid || 1,
        artist_name: p.en || 'Live Event',
        tour_name: p.et || '',
        event_date: p.ed || 'Upcoming',
        venue_name: p.vn || 'Stadium',
        venue_city: p.vc || '',
        artist_image: p.img || '/assets/u2_banner.jpg',
        section: p.sec || 'GA',
        row_name: p.row || 'GA',
        ticket_count: (p.seats && p.seats.length) || 1
      },
      tickets: p.seats || [{ id: Date.now(), section: p.sec || 'GA', row_name: p.row || 'GA', seat_label: 'GA1', seat_number: 1 }]
    };
  } catch (e) {
    return null;
  }
}

// Transfer Claim Details Endpoint
app.get('/api/transfers/:token/claim-details', (req, res) => {
  const token = req.params.token;
  let transfer = memoryTransfers.find(t => t.token === token);

  if (!transfer && req.query.d) {
    const decoded = decodeTransferFallback(token, req.query.d);
    if (decoded) {
      return res.json({
        success: true,
        transfer: decoded.transfer,
        event: decoded.event,
        tickets: decoded.tickets,
        isAccepted: false
      });
    }
  }

  if (!transfer) {
    return res.status(404).json({ error: 'Transfer not found or expired.' });
  }

  const sender = memoryUsers.find(u => u.id === transfer.user_id) || { display_name: 'Sender', email: '' };
  const event = memoryEvents.find(e => e.id === transfer.event_id) || memoryEvents[0];
  const tickets = memoryTickets.filter(t => transfer.ticket_ids.includes(t.id));

  res.json({
    success: true,
    transfer: {
      id: transfer.id,
      token: transfer.token,
      status: transfer.status,
      sender_name: sender.display_name || sender.email.split('@')[0],
      recipient_name: transfer.recipient_name,
      recipient_email: transfer.email_or_phone,
      note: transfer.note,
      created_at: transfer.created_at,
      accepted_at: transfer.accepted_at
    },
    event: {
      id: event.id,
      artist_name: event.artist_name,
      tour_name: event.tour_name,
      event_date: event.event_date,
      venue_name: event.venue_name,
      venue_city: event.venue_city,
      artist_image: event.artist_image,
      section: event.section,
      row_name: event.row_name,
      ticket_count: transfer.ticket_ids.length
    },
    tickets: tickets.map(t => ({
      id: t.id,
      section: t.section,
      row_name: t.row_name,
      seat_label: t.seat_label,
      seat_number: t.seat_number,
      barcode_code: t.barcode_code
    })),
    isAccepted: transfer.status === 'accepted'
  });
});

// Accept Transfer Endpoint
app.post('/api/transfers/:token/accept', async (req, res) => {
  const token = req.params.token;
  let transfer = memoryTransfers.find(t => t.token === token);
  const dParam = (req.body && req.body.d) || req.query.d;

  if (!transfer && dParam) {
    const decoded = decodeTransferFallback(token, dParam);
    if (decoded) {
      transfer = decoded.transfer;
      memoryTransfers.unshift(transfer);
    }
  }

  if (!transfer) {
    return res.status(404).json({ error: 'Transfer link not found.' });
  }

  const { email, password, displayName } = req.body || {};
  const authUser = getRequestUser(req);
  let recipientUser = null;

  // Resolve recipient user:
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    recipientUser = memoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (!recipientUser) {
      recipientUser = {
        id: 'user-' + Date.now(),
        email: cleanEmail,
        password: (password && password.trim()) || '12345',
        display_name: (displayName && displayName.trim()) || transfer.recipient_name || cleanEmail.split('@')[0],
        city: 'Milano',
        country: 'United States',
        days_left: 30,
        wallet_passes: 0,
        settings: {
          enableAppleWallet: false,
          useGoogleWallet: false,
          showTransferAccepted: false,
          acceptedByName: 'Mary Flores',
          showBlankPage: false,
          enableTransferFee: false,
          transferFeeAmount: '$50.47'
        },
        created_at: new Date().toISOString()
      };
      memoryUsers.push(recipientUser);
    }
  } else if (authUser && authUser.id !== DEFAULT_USER_ID) {
    recipientUser = authUser;
  } else if (transfer.email_or_phone && transfer.email_or_phone.includes('@')) {
    const cleanEmail = transfer.email_or_phone.trim().toLowerCase();
    recipientUser = memoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (!recipientUser) {
      recipientUser = {
        id: 'user-' + Date.now(),
        email: cleanEmail,
        password: '12345',
        display_name: transfer.recipient_name || cleanEmail.split('@')[0],
        city: 'Milano',
        country: 'United States',
        days_left: 30,
        wallet_passes: 0,
        settings: {
          enableAppleWallet: false,
          useGoogleWallet: false,
          showTransferAccepted: false,
          acceptedByName: 'Mary Flores',
          showBlankPage: false,
          enableTransferFee: false,
          transferFeeAmount: '$50.47'
        },
        created_at: new Date().toISOString()
      };
      memoryUsers.push(recipientUser);
    }
  } else {
    recipientUser = authUser;
  }

  const origEvent = memoryEvents.find(e => e.id === transfer.event_id) || memoryEvents[0];

  // Check if recipient already has an event record for this concert/artist
  let recipientEvent = memoryEvents.find(e => e.user_id === recipientUser.id && (e.id === transfer.event_id || e.artist_name === origEvent.artist_name));

  if (!recipientEvent) {
    recipientEvent = {
      ...origEvent,
      id: Date.now() + Math.floor(Math.random() * 1000),
      user_id: recipientUser.id,
      ticket_count: transfer.ticket_ids.length,
      is_hidden: false,
      updated_at: new Date().toISOString()
    };
    memoryEvents.unshift(recipientEvent);
  } else {
    recipientEvent.ticket_count = (recipientEvent.ticket_count || 0) + transfer.ticket_ids.length;
  }

  // Assign tickets to recipientUser
  const existingTix = memoryTickets.filter(t => transfer.ticket_ids && transfer.ticket_ids.includes(t.id));
  if (existingTix.length > 0) {
    existingTix.forEach(t => {
      t.user_id = recipientUser.id;
      t.event_id = recipientEvent.id;
      t.status = 'active';
      t.transferred_to_name = null;
      t.transferred_to_contact = null;
      t.transferred_at = null;
      t.transfer_token = null;
    });
  } else {
    // Generate new active tickets for recipient
    const count = (transfer.ticket_ids && transfer.ticket_ids.length) || 1;
    for (let i = 1; i <= count; i++) {
      memoryTickets.push({
        id: Date.now() + i,
        event_id: recipientEvent.id,
        user_id: recipientUser.id,
        seat_label: `${recipientEvent.section || 'GA'}${i}`,
        seat_number: i,
        section: recipientEvent.section || 'GA',
        row_name: recipientEvent.row_name || 'GA',
        status: 'active',
        barcode_code: `819204810294${i}102`
      });
    }
  }

  transfer.status = 'accepted';
  transfer.accepted_by_user_id = recipientUser.id;
  transfer.accepted_at = new Date().toISOString();
  saveStore();
  await dbUpsertUser(recipientUser);

  res.json({
    success: true,
    user: {
      id: recipientUser.id,
      email: recipientUser.email,
      display_name: recipientUser.display_name,
      city: recipientUser.city,
      country: recipientUser.country,
      wallet_passes: recipientUser.wallet_passes,
      settings: recipientUser.settings
    },
    event: recipientEvent,
    transferredCount: transfer.ticket_ids.length,
    message: 'Tickets accepted! They are now in your Ticketmaster account.'
  });
});

// Site Favicon APIs
app.get('/api/favicon', (req, res) => {
  const activeEvent = memoryEvents[0];
  res.json({ success: true, faviconUrl: siteFaviconUrl || activeEvent?.favicon_url || '' });
});

app.post('/api/favicon', async (req, res) => {
  const { faviconUrl } = req.body || {};
  siteFaviconUrl = typeof faviconUrl === 'string' ? faviconUrl : '';
  memoryEvents.forEach(ev => {
    ev.favicon_url = siteFaviconUrl;
  });
  saveStore();
  res.json({ success: true, faviconUrl: siteFaviconUrl });
});

// Gmail & Email Settings APIs
app.get('/api/settings/email', (req, res) => {
  res.json(mailer.getEmailConfig());
});

app.post('/api/settings/email', (req, res) => {
  const { user, pass } = req.body;
  const config = mailer.updateEmailConfig(user, pass);
  res.json({ success: true, config });
});

app.post('/api/settings/test-email', async (req, res) => {
  const { recipient } = req.body;
  try {
    const info = await mailer.sendTestEmail(recipient);
    res.json({ success: true, message: `Test email sent successfully to ${recipient || 'configured Gmail'}!`, info });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/transfers', (req, res) => {
  const user = getRequestUser(req);
  const list = memoryTransfers.filter(t => t.user_id === user.id);
  res.json(list);
});

// Confirmation Email mockup
app.post('/api/send-confirmation-email', (req, res) => {
  const { eventId, recipientEmail } = req.body;
  if (!recipientEmail) return res.status(400).json({ error: 'Recipient email is required.' });

  res.json({
    success: true,
    message: `Confirmation email sent successfully to ${recipientEmail}!`
  });
});

// Legacy single-event compatibility endpoints
app.get('/api/event', (req, res) => {
  const user = getRequestUser(req);
  const ev = memoryEvents.find(e => e.user_id === user.id) || memoryEvents[0];
  res.json(ev);
});

app.put('/api/event', (req, res) => {
  const user = getRequestUser(req);
  const ev = memoryEvents.find(e => e.user_id === user.id) || memoryEvents[0];
  Object.assign(ev, req.body, { updated_at: new Date().toISOString() });
  res.json({ success: true, event: ev });
});

app.get('/api/tickets', (req, res) => {
  const user = getRequestUser(req);
  const ev = memoryEvents.find(e => e.user_id === user.id) || memoryEvents[0];
  const tix = memoryTickets.filter(t => t.event_id === ev.id);
  res.json(tix);
});

app.post('/api/transfer', (req, res) => {
  const user = getRequestUser(req);
  const ev = memoryEvents.find(e => e.user_id === user.id) || memoryEvents[0];
  req.params.id = ev.id;
  return app._router.handle(req, res);
});

// ----------------------------------------------------------------
// Server Boot
// ----------------------------------------------------------------
async function init() {
  try {
    const { data, error } = await supabase.from('events').select('id').limit(1);
    if (!error) {
      console.log('[Supabase] Connected to live Supabase database.');
      await syncFromSupabase();
    }
  } catch (err) {}

  app.listen(PORT, () => {
    console.log(`\n🎟️ Ticketmaster App running at http://localhost:${PORT}\n`);
  });
}

init();
