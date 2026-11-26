// server.js — Express API with User Accounts, Multi-User Scoped Events, Settings & Ticket Management
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const supabase = require('./utils/supabase');

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
  },
  {
    id: 3,
    user_id: DEFAULT_USER_ID,
    artist_name: 'INDIVIDUAL GENERAL CORONA CAPITAL 2026',
    tour_name: 'Corona Capital 2026',
    event_type: 'Festival',
    badge_text: 'Individual General',
    section: 'General',
    row_name: '0',
    seat_type: 'General Admission',
    venue_name: 'Autódromo Hermanos Rodríguez',
    venue_city: 'Mexico City',
    event_date: 'Sun, Nov 22, 2026 • 3:00 PM',
    purchase_date: 'Fri, Sep 18, 2026',
    entrance_details: 'Puerta 9',
    countdown_target: new Date('2026-11-22T15:00:00Z').toISOString(),
    days_until: 0,
    ticket_price: 120.00,
    service_fee: 19.50,
    order_number: '3-44109/CC26',
    artist_image: '/assets/corona_banner.png',
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
  { id: 202, event_id: 2, user_id: DEFAULT_USER_ID, seat_label: 'SEAT 15', seat_number: 15, section: 'SEC 102', row_name: 'F', status: 'active', barcode_code: '9301294810291102' },
  // Corona Capital tickets (2)
  { id: 301, event_id: 3, user_id: DEFAULT_USER_ID, seat_label: 'GA 1', seat_number: 1, section: 'General', row_name: '0', status: 'active', barcode_code: '5819028491021101' },
  { id: 302, event_id: 3, user_id: DEFAULT_USER_ID, seat_label: 'GA 2', seat_number: 2, section: 'General', row_name: '0', status: 'active', barcode_code: '5819028491021102' }
];

let memoryTransfers = [];

// Helper to authenticate request
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
  // Default fallback user so app always functions smoothly
  return memoryUsers[0];
}

// ----------------------------------------------------------------
// Dynamic Server-Side Injection for iOS Home Screen & Favicon
// ----------------------------------------------------------------
app.get(['/', '/index.html'], async (req, res, next) => {
  try {
    const user = getRequestUser(req);
    const activeEvent = memoryEvents.find(e => e.user_id === user.id) || memoryEvents[0];
    const faviconUrl = activeEvent?.favicon_url || '';

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
  const iconSrc = activeEvent?.favicon_url || '/assets/apple-touch-icon.png';
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

app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------
// Authentication API
// ----------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName, city, country } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const existing = memoryUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
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

  // Seed default U2 event for this new user so their dashboard is ready immediately!
  const defaultEvent = {
    id: Date.now(),
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
  memoryEvents.push(defaultEvent);

  for (let i = 1; i <= 4; i++) {
    memoryTickets.push({
      id: Date.now() + i,
      event_id: defaultEvent.id,
      user_id: newUser.id,
      seat_label: `GA${i}`,
      seat_number: i,
      section: 'GA',
      row_name: `GA${i}`,
      status: 'active',
      barcode_code: `819204810294${i}102`
    });
  }

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

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = memoryUsers.find(
    u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password.trim()
  );

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

app.get('/api/auth/me', (req, res) => {
  const user = getRequestUser(req);
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

// Update Profile & Location
app.put('/api/user/profile', (req, res) => {
  const user = getRequestUser(req);
  const { display_name, email, city, country } = req.body;

  if (display_name !== undefined) user.display_name = display_name.trim();
  if (email !== undefined) user.email = email.trim();
  if (city !== undefined) user.city = city.trim();
  if (country !== undefined) user.country = country.trim();

  res.json({ success: true, user });
});

// Update Settings
app.put('/api/user/settings', (req, res) => {
  const user = getRequestUser(req);
  user.settings = {
    ...user.settings,
    ...req.body
  };
  res.json({ success: true, settings: user.settings });
});

// Flutterwave pass credit purchase
app.post('/api/user/buy-passes', (req, res) => {
  const user = getRequestUser(req);
  const qty = parseInt(req.body.quantity, 10) || 2;
  user.wallet_passes = (user.wallet_passes || 0) + qty;
  res.json({ success: true, wallet_passes: user.wallet_passes, added: qty });
});

// ----------------------------------------------------------------
// Events API (Scoped per User)
// ----------------------------------------------------------------
app.get('/api/events', (req, res) => {
  const user = getRequestUser(req);
  const userEvents = memoryEvents.filter(e => e.user_id === user.id);
  res.json(userEvents.length ? userEvents : memoryEvents);
});

app.get('/api/events/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const event = memoryEvents.find(e => e.id === id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const tickets = memoryTickets.filter(t => t.event_id === id);
  res.json({ ...event, tickets });
});

app.post('/api/events', (req, res) => {
  const user = getRequestUser(req);
  const {
    artist_name, tour_name, event_type, badge_text, section, row_name,
    venue_name, venue_city, event_date, purchase_date, entrance_details,
    artist_image, ticket_count, ticket_price
  } = req.body;

  if (!artist_name || !venue_name) {
    return res.status(400).json({ error: 'Event name and venue are required.' });
  }

  const newId = Date.now();
  const count = parseInt(ticket_count, 10) || 4;
  const newEvent = {
    id: newId,
    user_id: user.id,
    artist_name: artist_name.trim(),
    tour_name: tour_name ? tour_name.trim() : artist_name.trim(),
    event_type: event_type || 'Standard',
    badge_text: badge_text || 'Artist Presale',
    section: section || 'GA',
    row_name: row_name || '',
    seat_type: 'General Admission',
    venue_name: venue_name.trim(),
    venue_city: venue_city ? venue_city.trim() : user.city,
    event_date: event_date || 'Sat, Dec 12, 2026 • 8:00 PM',
    purchase_date: purchase_date || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    entrance_details: entrance_details || 'Gate 1',
    countdown_target: new Date(Date.now() + 14 * 86400000).toISOString(),
    days_until: 14,
    ticket_price: parseFloat(ticket_price) || 89.50,
    service_fee: 18.25,
    order_number: `5-${Math.floor(10000 + Math.random() * 90000)}/UT5`,
    artist_image: artist_image || '/assets/u2_banner.jpg',
    map_image: '/assets/venue_map_crop.png',
    favicon_url: '',
    ticket_count: count,
    is_hidden: false,
    updated_at: new Date().toISOString()
  };

  memoryEvents.unshift(newEvent);

  // Generate ticket seats
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

  res.json({ success: true, event: newEvent });
});

app.put('/api/events/:id', (req, res) => {
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

  res.json({ success: true, event });
});

app.delete('/api/events/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  memoryEvents = memoryEvents.filter(e => e.id !== id);
  memoryTickets = memoryTickets.filter(t => t.event_id !== id);
  res.json({ success: true, message: 'Event deleted successfully.' });
});

app.post('/api/events/:id/toggle-visibility', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const event = memoryEvents.find(e => e.id === id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  event.is_hidden = !event.is_hidden;
  res.json({ success: true, is_hidden: event.is_hidden });
});

// ----------------------------------------------------------------
// Tickets & Transfer API
// ----------------------------------------------------------------
app.get('/api/events/:id/tickets', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tickets = memoryTickets.filter(t => t.event_id === id);
  res.json(tickets);
});

app.post('/api/events/:id/transfer', (req, res) => {
  const user = getRequestUser(req);
  const eventId = parseInt(req.params.id, 10);
  const { ticketIds, firstName, lastName, emailOrPhone, note } = req.body;

  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one ticket.' });
  }

  const recipientName = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim();
  const contact = (emailOrPhone || '').trim();
  const now = new Date().toISOString();

  const transferRecord = {
    id: Date.now(),
    user_id: user.id,
    event_id: eventId,
    ticket_ids: ticketIds,
    first_name: firstName,
    last_name: lastName,
    recipient_name: recipientName,
    email_or_phone: contact,
    note: note || '',
    status: 'completed',
    created_at: now
  };
  memoryTransfers.unshift(transferRecord);

  // Update tickets
  memoryTickets.forEach(t => {
    if (ticketIds.includes(t.id)) {
      t.status = 'transferred';
      t.transferred_to_name = recipientName;
      t.transferred_to_contact = contact;
      t.transferred_at = now;
      t.transfer_note = note || '';
    }
  });

  res.json({
    success: true,
    transfer: transferRecord,
    transferredCount: ticketIds.length
  });
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
    if (!error) console.log('[Supabase] Connected to live Supabase database.');
  } catch (err) {}

  app.listen(PORT, () => {
    console.log(`\n🎟️ Ticketmaster App running at http://localhost:${PORT}\n`);
  });
}

init();
