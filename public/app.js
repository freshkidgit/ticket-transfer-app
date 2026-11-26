// app.js — Complete Client State, Multi-User Auth, Event CRUD & 2FA Transfer Flow

// State
let currentUser = {
  id: 'user-toom-001',
  email: 'toom41170@gmail.com',
  display_name: 'Serena',
  city: 'Zagreb',
  country: 'Croatia',
  days_left: 22,
  wallet_passes: 0,
  settings: {
    appLayout: 'american',
    language: 'en',
    paymentMethod: 'ngn',
    enableAppleWallet: false,
    useGoogleWallet: false,
    showTransferAccepted: false,
    acceptedByName: 'Mary Flores',
    showBlankPage: false,
    showLayout2Countdown: false,
    enableTransferFee: false,
    transferFeeAmount: '$50.47'
  }
};

let userEvents = [];
let activeEvent = null;
let activeTickets = [];
let selectedTransferTicketIds = [];
let currentPassQuantity = 2;
let newPosterBase64 = '';
let currentEventType = 'Standard';
let transferCode = '663100';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check stored user session
  const storedUser = localStorage.getItem('tm_user');
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {}
  }

  await loadUserData();
  await loadUserEvents();
  renderAllViews();
});

// API helper with user ID header
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': currentUser.id
  };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(endpoint, options);
    return await res.json();
  } catch (err) {
    console.warn(`[API] ${endpoint} failed:`, err);
    return null;
  }
}

// ----------------------------------------------------------------
// User & Event Data Fetchers
// ----------------------------------------------------------------
async function loadUserData() {
  const data = await apiCall('/api/auth/me');
  if (data && data.id) {
    currentUser = { ...currentUser, ...data };
    localStorage.setItem('tm_user', JSON.stringify(currentUser));
  }
}

async function loadUserEvents() {
  const list = await apiCall('/api/events');
  if (Array.isArray(list) && list.length > 0) {
    userEvents = list;
  } else {
    // Fallback default
    userEvents = [
      {
        id: 1,
        artist_name: 'U2: THE GREATEST SHOW ON EARTH WORLD TOUR',
        tour_name: 'The Greatest Show on Earth World Tour',
        event_type: 'Standard',
        badge_text: 'Artist Presale',
        section: 'GA',
        venue_name: 'San Siro Stadium',
        venue_city: 'Milano',
        event_date: 'Mon, Jul 05, 2027 • 7:30 PM',
        purchase_date: 'Thu, Oct 29, 2026',
        entrance_details: 'Gate 4 Entrance',
        days_until: 221,
        order_number: '5-85630/UT5',
        artist_image: '/assets/u2_banner.jpg',
        ticket_count: 4,
        is_hidden: false
      },
      {
        id: 2,
        artist_name: 'STRAY KIDS WORLD TOUR [RUN IT ARNHEM]',
        tour_name: '[RUN IT ARNHEM]',
        event_type: 'Standard',
        badge_text: 'VIP Package',
        section: 'SEC 102',
        venue_name: 'GelreDome',
        venue_city: 'Arnhem',
        event_date: 'Tue, Jul 27, 2027 • 7:30 PM',
        purchase_date: 'Mon, Nov 02, 2026',
        entrance_details: 'North Entrance',
        days_until: 243,
        order_number: '7-99120/SKZ',
        artist_image: '/assets/straykids_banner.jpg',
        ticket_count: 2,
        is_hidden: false
      }
    ];
  }
}

// ----------------------------------------------------------------
// Render Views
// ----------------------------------------------------------------
function renderAllViews() {
  renderHome();
  renderWatchlistProfile();
  renderMyEvents();
  renderAccountTab();
  checkWatchlistAuth();
  // Update country flag on render
  const c = TM_COUNTRIES.find(x => x.code === selectedCountryCode) || TM_COUNTRIES[0];
  const flagEl = document.getElementById('countryFlagEmoji');
  if (flagEl) flagEl.textContent = c.flag;
}

function renderHome() {
  const city = currentUser.city || 'Zagreb';
  const cityEl = document.getElementById('cityDisplayHeader');
  if (cityEl) cityEl.textContent = city;

  const trendingTitle = document.getElementById('trendingTitle');
  if (trendingTitle) trendingTitle.textContent = `Trending In ${city}`;
}

function renderWatchlist() {
  const name = currentUser.display_name || 'Toom';
  const email = currentUser.email || 'toom41170@gmail.com';
  const initials = name.slice(0, 2).toUpperCase();

  const pscAvatar = document.getElementById('pscAvatar');
  if (pscAvatar) pscAvatar.textContent = initials;

  const pscName = document.getElementById('pscName');
  if (pscName) pscName.textContent = name;

  const pscEmail = document.getElementById('pscEmail');
  if (pscEmail) pscEmail.textContent = email;

  const daysNum = document.getElementById('pscDaysNum');
  if (daysNum) daysNum.textContent = currentUser.days_left || 22;

  // Confirmation email dropdown options
  const selectEl = document.getElementById('emailEventSelect');
  if (selectEl) {
    selectEl.innerHTML = '<option value="">Choose an event</option>';
    userEvents.forEach(ev => {
      selectEl.innerHTML += `<option value="${ev.id}">${ev.artist_name}</option>`;
    });
  }

  // Populate subviews inputs
  const plDisplay = document.getElementById('plDisplayName');
  if (plDisplay) plDisplay.value = name;
  const plMail = document.getElementById('plEmail');
  if (plMail) plMail.value = email;
  const plCity = document.getElementById('plCity');
  if (plCity) plCity.value = currentUser.city || '';
  const plCountry = document.getElementById('plCountry');
  if (plCountry) plCountry.value = currentUser.country || '';

  // Settings inputs & toggles
  const s = currentUser.settings || {};
  const setCheck = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  };
  setCheck('toggleAppleWallet', s.enableAppleWallet);
  setCheck('toggleGoogleWallet', s.useGoogleWallet);
  setCheck('toggleTransferAccepted', s.showTransferAccepted);
  setCheck('toggleBlankPage', s.showBlankPage);
  setCheck('toggleTransferFee', s.enableTransferFee);

  const accByName = document.getElementById('settingAcceptedByName');
  if (accByName) accByName.value = s.acceptedByName || 'Mary Flores';

  const feeAmt = document.getElementById('settingTransferFeeAmount');
  if (feeAmt) feeAmt.value = s.transferFeeAmount || '$50.47';

  const passCount = document.getElementById('settingsPassesCount');
  if (passCount) passCount.textContent = currentUser.wallet_passes || 0;

  renderManageEventsList();
}

function renderManageEventsList() {
  const container = document.getElementById('manageEventsList');
  if (!container) return;

  container.innerHTML = userEvents.map(ev => `
    <div class="me-card">
      <div class="me-top">
        <div class="me-thumb" style="background-image: url('${ev.artist_image || '/assets/u2_banner.jpg'}');"></div>
        <div class="me-info">
          <div class="me-title">${ev.artist_name}</div>
          <div class="me-date">${ev.event_date}</div>
          <div class="me-venue">${ev.venue_name} - ${ev.venue_city || ''}</div>
        </div>
        <button class="me-eye-btn" onclick="toggleEventVisibility(${ev.id})" title="${ev.is_hidden ? 'Show on My Tickets' : 'Hide from My Tickets'}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${ev.is_hidden ? '#9ca3af' : '#111111'}" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
            ${ev.is_hidden ? '<line x1="2" y1="2" x2="22" y2="22" stroke="#e11d48" stroke-width="2.5"></line>' : ''}
          </svg>
        </button>
      </div>
      <div class="me-actions-row">
        <button class="me-act-btn" onclick="editEvent(${ev.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          Edit
        </button>
        <button class="me-act-btn" onclick="openEventById(${ev.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          View
        </button>
        <button class="me-act-btn delete" onclick="deleteEvent(${ev.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

function renderMyEvents() {
  const visibleEvents = userEvents.filter(e => !e.is_hidden);
  const hero = visibleEvents[0] || userEvents[0];

  const upCount = document.getElementById('upcomingCount');
  if (upCount) upCount.textContent = visibleEvents.length;

  if (hero) {
    const countdownEl = document.getElementById('hecCountdown');
    if (countdownEl) countdownEl.textContent = `Next Event: ${hero.days_until || 221} days`;

    const poster = document.getElementById('hecPoster');
    if (poster) poster.style.backgroundImage = `url('${hero.artist_image || '/assets/u2_banner.jpg'}')`;

    const dateBadge = document.getElementById('hecDateBadge');
    if (dateBadge) dateBadge.textContent = hero.event_date;

    const titleEl = document.getElementById('hecEventTitle');
    if (titleEl) titleEl.textContent = hero.artist_name;

    const venueEl = document.getElementById('hecVenue');
    if (venueEl) venueEl.textContent = `${hero.venue_name} - ${hero.venue_city || ''}`;
  }

  // All upcoming list (all after the first one)
  const allList = document.getElementById('allUpcomingList');
  if (allList) {
    const remaining = visibleEvents.slice(1);
    if (remaining.length === 0) {
      allList.innerHTML = `
        <div class="upcoming-mini-card" onclick="openEventById(${hero?.id || 1})">
          <div class="umc-thumb" style="background-image: url('${hero?.artist_image || '/assets/u2_banner.jpg'}');"></div>
          <div class="umc-body">
            <div class="umc-date">${hero?.event_date || ''}</div>
            <div class="umc-title">${hero?.artist_name || ''}</div>
            <div class="umc-venue">${hero?.venue_name || ''}</div>
          </div>
        </div>
      `;
    } else {
      allList.innerHTML = remaining.map(ev => `
        <div class="upcoming-mini-card" onclick="openEventById(${ev.id})">
          <div class="umc-thumb" style="background-image: url('${ev.artist_image || '/assets/straykids_banner.jpg'}');"></div>
          <div class="umc-body">
            <div class="umc-date">${ev.event_date}</div>
            <div class="umc-title">${ev.artist_name}</div>
            <div class="umc-venue">${ev.venue_name} - ${ev.venue_city || ''}</div>
          </div>
        </div>
      `).join('');
    }
  }
}

function renderAccountTab() {
  const name = currentUser.display_name || 'Toom';
  const email = currentUser.email || 'toom41170@gmail.com';
  const initials = name.slice(0, 2).toUpperCase();

  const avatar = document.getElementById('accTabAvatar');
  if (avatar) avatar.textContent = initials;
  const nameEl = document.getElementById('accTabName');
  if (nameEl) nameEl.textContent = name;
  const emailEl = document.getElementById('accTabEmail');
  if (emailEl) emailEl.textContent = email;
  const locEl = document.getElementById('accTabLocation');
  if (locEl) locEl.textContent = `📍 ${currentUser.city || 'Los Angeles'}, ${currentUser.country || 'United States'}`;
}

// ----------------------------------------------------------------
// Tab Navigation
// ----------------------------------------------------------------
function switchMainTab(viewId) {
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add('active');

  const btnMap = {
    'viewHome': 'btnTabHome',
    'viewWatchlist': 'btnTabWatchlist',
    'viewTickets': 'btnTabTickets',
    'viewAccount': 'btnTabAccount'
  };
  const activeBtn = document.getElementById(btnMap[viewId]);
  if (activeBtn) activeBtn.classList.add('active');

  if (viewId === 'viewWatchlist') {
    const hasCustomAccount = localStorage.getItem('tm_has_account');
    if (!hasCustomAccount) {
      openAuthModal('register');
    }
  }
}

function switchManageSubtab(tab) {
  const btnAcc = document.getElementById('segAccountBtn');
  const btnTr = document.getElementById('segTransfersBtn');
  const viewAcc = document.getElementById('manageAccountSubtab');
  const viewTr = document.getElementById('manageTransfersSubtab');

  if (tab === 'account') {
    btnAcc.classList.add('active');
    btnTr.classList.remove('active');
    viewAcc.style.display = 'block';
    viewTr.style.display = 'none';
  } else {
    btnTr.classList.add('active');
    btnAcc.classList.remove('active');
    viewAcc.style.display = 'none';
    viewTr.style.display = 'block';
    loadTransferHistory();
  }
}

function switchEventsTab(tab) {
  const btnUp = document.getElementById('tabUpcoming');
  const btnPast = document.getElementById('tabPast');
  const viewUp = document.getElementById('upcomingEventsContainer');
  const viewPast = document.getElementById('pastEventsContainer');

  if (tab === 'upcoming') {
    btnUp.classList.add('active');
    btnPast.classList.remove('active');
    viewUp.style.display = 'block';
    viewPast.style.display = 'none';
  } else {
    btnPast.classList.add('active');
    btnUp.classList.remove('active');
    viewUp.style.display = 'none';
    viewPast.style.display = 'block';
  }
}

// ----------------------------------------------------------------
// Manage Subviews (Create Event, Manage Events, Profile, Settings)
// ----------------------------------------------------------------
function openManageSubView(name) {
  const map = {
    'createEvent': 'subViewCreateEvent',
    'manageEvents': 'subViewManageEvents',
    'profileLocation': 'subViewProfileLocation',
    'settings': 'subViewSettings'
  };
  const el = document.getElementById(map[name]);
  if (el) el.classList.add('open');
}

function closeManageSubView(name) {
  const map = {
    'createEvent': 'subViewCreateEvent',
    'manageEvents': 'subViewManageEvents',
    'profileLocation': 'subViewProfileLocation',
    'settings': 'subViewSettings'
  };
  const el = document.getElementById(map[name]);
  if (el) el.classList.remove('open');
}

// ----------------------------------------------------------------
// Event Details Modal & Seat Information
// ----------------------------------------------------------------
async function openEventById(id) {
  let ev = userEvents.find(e => e.id === id);
  if (!ev) ev = userEvents[0];
  activeEvent = ev;

  // Load tickets for event
  const tix = await apiCall(`/api/events/${ev.id}/tickets`);
  activeTickets = Array.isArray(tix) && tix.length > 0 ? tix : [
    { id: 101, seat_label: 'GA1', seat_number: 1, section: ev.section || 'GA', status: 'active', barcode_code: '8192048102941102' },
    { id: 102, seat_label: 'GA2', seat_number: 2, section: ev.section || 'GA', status: 'active', barcode_code: '8192048102942102' },
    { id: 103, seat_label: 'GA3', seat_number: 3, section: ev.section || 'GA', status: 'active', barcode_code: '8192048102943102' },
    { id: 104, seat_label: 'GA4', seat_number: 4, section: ev.section || 'GA', status: 'active', barcode_code: '8192048102944102' }
  ];

  renderEventDetailsModal();
  document.getElementById('eventDetailsModal').classList.add('open');
}

function openHeroEvent() {
  const hero = userEvents.find(e => !e.is_hidden) || userEvents[0];
  if (hero) openEventById(hero.id);
}

function closeEventDetails() {
  document.getElementById('eventDetailsModal').classList.remove('open');
}

function renderEventDetailsModal() {
  if (!activeEvent) return;

  const s = currentUser.settings || {};
  const isEuropean = s.appLayout === 'european';

  const amView = document.getElementById('americanEventView');
  const euView = document.getElementById('europeanEventView');

  if (isEuropean) {
    if (amView) amView.style.display = 'none';
    if (euView) euView.style.display = 'block';

    const etcBadge = document.getElementById('etcBadgeText');
    if (etcBadge) etcBadge.textContent = activeEvent.badge_text || 'STAY Membership Presale';

    const etcSec = document.getElementById('etcSecVal');
    if (etcSec) etcSec.textContent = activeTickets[0]?.section || activeEvent.section || 'VIP1';

    const etcRow = document.getElementById('etcRowVal');
    if (etcRow) etcRow.textContent = activeEvent.row_name || 'VIP';

    const etcSeat = document.getElementById('etcSeatVal');
    if (etcSeat) etcSeat.textContent = activeTickets[0]?.seat_number || activeTickets[0]?.seat_label || '1';

    const etcBanner = document.getElementById('etcBannerWrap');
    if (etcBanner) etcBanner.style.backgroundImage = `url('${activeEvent.artist_image || '/assets/straykids_banner.jpg'}')`;

    const etcTitle = document.getElementById('etcTitle');
    if (etcTitle) etcTitle.textContent = activeEvent.artist_name;

    const etcMeta = document.getElementById('etcMeta');
    if (etcMeta) etcMeta.textContent = `${activeEvent.event_date} • ${activeEvent.venue_name}, ${activeEvent.venue_city || ''}`;

    const evmVenue = document.getElementById('evmVenueTitle');
    if (evmVenue) evmVenue.textContent = `${activeEvent.venue_name}, ${activeEvent.venue_city || ''}`;
  } else {
    if (amView) amView.style.display = 'block';
    if (euView) euView.style.display = 'none';

    const banner = document.getElementById('edmBanner');
    if (banner) banner.style.backgroundImage = `url('${activeEvent.artist_image || '/assets/u2_banner.jpg'}')`;

    document.getElementById('edmDateBadge').textContent = activeEvent.event_date;
    document.getElementById('edmTitle').textContent = activeEvent.artist_name;
    document.getElementById('edmVenue').textContent = `${activeEvent.venue_name} - ${activeEvent.venue_city || ''}`;
    document.getElementById('edmTicketCount').innerHTML = `🎟️ x${activeTickets.length}`;

    document.getElementById('edmOrderNum').textContent = `Order #${activeEvent.order_number || '5-85630/UT5'}`;
    document.getElementById('edmOrderTix').textContent = `x${activeTickets.length} Tickets`;

    const seatsContainer = document.getElementById('edmSeatsList');
    if (seatsContainer) {
      seatsContainer.innerHTML = activeTickets.map((t, idx) => `
        <div class="seat-card-item" onclick="openTicketInfoSheet(${t.id})">
          <div class="sci-top">${activeEvent.badge_text || 'Artist Presale'}</div>
          <div class="sci-row">
            <div>
              <div class="sci-section-label">SECTION</div>
              <div class="sci-sec-val">${t.section || 'GA'}</div>
            </div>
            <div>
              <div class="sci-sec-val">${t.seat_label || 'GA' + (idx + 1)}</div>
            </div>
          </div>
          ${s.showTransferAccepted ? `
            <div class="sci-transfer-accepted-badge">
              ✓ Transfer Accepted by ${s.acceptedByName || 'Mary Flores'}
            </div>
          ` : ''}
        </div>
      `).join('');
    }

    const dmcVenue = document.getElementById('dmcVenueName');
    if (dmcVenue) dmcVenue.textContent = activeEvent.venue_name || 'San Siro Stadium';

    const ygtThumb = document.getElementById('ygtThumb');
    if (ygtThumb) ygtThumb.style.backgroundImage = `url('${activeEvent.artist_image || '/assets/u2_banner.jpg'}')`;

    const ygtDate = document.getElementById('ygtDate');
    if (ygtDate) ygtDate.textContent = activeEvent.event_date;

    const ygtTitle = document.getElementById('ygtTitle');
    if (ygtTitle) ygtTitle.textContent = activeEvent.artist_name;

    const ygtVenue = document.getElementById('ygtVenue');
    if (ygtVenue) ygtVenue.textContent = `${activeEvent.venue_name} - ${activeEvent.venue_city || ''}`;
  }
}

function openDirections() {
  const venue = activeEvent?.venue_name || 'San Siro Stadium';
  const city = activeEvent?.venue_city || 'Milano';
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue + ', ' + city)}`, '_blank');
}

function shareEvent() {
  if (navigator.share) {
    navigator.share({
      title: activeEvent?.artist_name || 'My Tickets',
      text: `I got tickets to ${activeEvent?.artist_name || 'the event'}!`,
      url: window.location.href
    }).catch(() => {});
  } else {
    alert("✓ Link copied! Share you're going with friends and family.");
  }
}

function handleViewTicketsClick() {
  const s = currentUser.settings || {};
  if (s.showBlankPage) {
    document.getElementById('blankPageOverlay').classList.add('open');
  } else {
    if (!activeEvent) openHeroEvent();
    else openBarcodeModal();
  }
}

function closeBlankPage() {
  document.getElementById('blankPageOverlay').classList.remove('open');
}

function switchEdmTab(tab) {
  const btnTix = document.getElementById('edmTabTickets');
  const btnExt = document.getElementById('edmTabExtras');
  const viewTix = document.getElementById('edmContentTickets');
  const viewExt = document.getElementById('edmContentExtras');

  if (tab === 'tickets') {
    btnTix.classList.add('active');
    btnExt.classList.remove('active');
    viewTix.style.display = 'block';
    viewExt.style.display = 'none';
  } else {
    btnExt.classList.add('active');
    btnTix.classList.remove('active');
    viewTix.style.display = 'none';
    viewExt.style.display = 'block';
  }
}

// ----------------------------------------------------------------
// Ticket Information Sheet (Frame 255)
// ----------------------------------------------------------------
function openTicketInfoSheet(ticketId) {
  if (!activeEvent) return;

  document.getElementById('tiEntranceDetails').textContent = `${activeEvent.entrance_details || 'Gate 4 Entrance'}. Please arrive early for security checks and digital ticket verification.`;
  document.getElementById('tiOrderNum').textContent = activeEvent.order_number || '5-85630/UT5';
  document.getElementById('tiPurchaseDate').textContent = activeEvent.purchase_date || 'Thu, Oct 29, 2026';
  document.getElementById('tiVenueDesc').textContent = `Venue: ${activeEvent.venue_name}, ${activeEvent.venue_city || ''}. Terms & Conditions apply.`;

  document.getElementById('ticketInfoModal').classList.add('open');
}

function closeTicketInfo() {
  document.getElementById('ticketInfoModal').classList.remove('open');
}

function toggleAccordion(id) {
  const el = document.getElementById(id);
  const parent = el.parentElement;
  if (parent.classList.contains('open')) {
    parent.classList.remove('open');
    el.style.display = 'none';
  } else {
    parent.classList.add('open');
    el.style.display = 'block';
  }
}

// ----------------------------------------------------------------
// Barcode Viewer
// ----------------------------------------------------------------
function openBarcodeModal() {
  if (!activeEvent) return;
  document.getElementById('bvmEventName').textContent = activeEvent.artist_name;
  document.getElementById('bvmSeatBadge').textContent = `SEC ${activeEvent.section || 'GA'} • ${activeTickets[0]?.seat_label || 'SEAT 1'}`;
  document.getElementById('bvmCodeText').textContent = activeTickets[0]?.barcode_code || '8192 0481 0294 1102';
  document.getElementById('barcodeViewModal').classList.add('open');
}

function closeBarcodeModal() {
  document.getElementById('barcodeViewModal').classList.remove('open');
}

// ----------------------------------------------------------------
// 2FA / Authentication & Transfer Flow (Frame 285, 301, 330, 355)
// ----------------------------------------------------------------
function startTransferFlow() {
  transferCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Show 2FA modal with spinner phase
  const modal = document.getElementById('auth2faModal');
  const spinnerPhase = document.getElementById('authSpinnerPhase');
  const codePhase = document.getElementById('authCodePhase');

  modal.classList.add('open');
  spinnerPhase.style.display = 'flex';
  codePhase.style.display = 'none';
  document.getElementById('twoFactorCodeInput').value = '';
  document.getElementById('confirmCodeBtn').classList.remove('active');
  document.getElementById('confirmCodeBtn').disabled = true;

  // After 1.2s spinner, reveal code screen and trigger simulated iOS SMS banner
  setTimeout(() => {
    spinnerPhase.style.display = 'none';
    codePhase.style.display = 'block';

    // Show simulated iOS notification
    const noti = document.getElementById('iosNotification');
    document.getElementById('iosNotiBody').textContent = `Your verification code is ${transferCode}. Don't share this code with anyone.`;
    noti.classList.add('show');

    // Auto-hide banner after 6s
    setTimeout(() => {
      noti.classList.remove('show');
    }, 6000);
  }, 1200);
}

function handleNotificationClick() {
  // Clicking the notification auto-fills the code!
  const input = document.getElementById('twoFactorCodeInput');
  if (input) {
    input.value = transferCode;
    handleCodeInput(transferCode);
  }
  document.getElementById('iosNotification').classList.remove('show');
}

function handleCodeInput(val) {
  const btn = document.getElementById('confirmCodeBtn');
  if (val.trim().length >= 4) {
    btn.classList.add('active');
    btn.disabled = false;
  } else {
    btn.classList.remove('active');
    btn.disabled = true;
  }
}

function submit2faCode() {
  close2faModal();
  openTransferStep1();
}

function close2faModal() {
  document.getElementById('auth2faModal').classList.remove('open');
  document.getElementById('iosNotification').classList.remove('show');
}

function openTransferStep1() {
  selectedTransferTicketIds = [];
  document.getElementById('tsSecName').textContent = `SEC: ${activeEvent.section || 'GA'}, ${activeEvent.seat_type || 'General Admission'}`;
  document.getElementById('tsTixCount').textContent = `🎟 ${activeTickets.length} Tickets`;

  const grid = document.getElementById('tsSeatsGrid');
  grid.innerHTML = activeTickets.map((t, idx) => `
    <div class="tdm-seat-card" id="seatCard_${t.id}" onclick="toggleSeatSelection(${t.id})">
      <div class="tsc-header">${t.seat_label || 'GA' + (idx + 1)}</div>
      <div class="tsc-body">
        <div class="tsc-radio"></div>
      </div>
    </div>
  `).join('');

  document.getElementById('transferStep1Modal').classList.add('open');
}

function toggleSeatSelection(ticketId) {
  const card = document.getElementById(`seatCard_${ticketId}`);
  if (selectedTransferTicketIds.includes(ticketId)) {
    selectedTransferTicketIds = selectedTransferTicketIds.filter(id => id !== ticketId);
    card.classList.remove('selected');
  } else {
    selectedTransferTicketIds.push(ticketId);
    card.classList.add('selected');
  }
}

function proceedToRecipientDetails() {
  if (selectedTransferTicketIds.length === 0) {
    alert('Please select at least one ticket to transfer.');
    return;
  }
  document.getElementById('transferStep1Modal').classList.remove('open');
  document.getElementById('finishTransferBtn').textContent = `Transfer ${selectedTransferTicketIds.length} Ticket${selectedTransferTicketIds.length > 1 ? 's' : ''}`;
  document.getElementById('transferStep2Modal').classList.add('open');
}

function backToStep1() {
  document.getElementById('transferStep2Modal').classList.remove('open');
  document.getElementById('transferStep1Modal').classList.add('open');
}

function closeTransferDrawers() {
  document.getElementById('transferStep1Modal').classList.remove('open');
  document.getElementById('transferStep2Modal').classList.remove('open');
  document.getElementById('feeInterruptionModal').classList.remove('open');
}

function toggleContactType() {
  const emailInput = document.getElementById('recipEmail');
  if (emailInput.type === 'email') {
    emailInput.type = 'tel';
    emailInput.placeholder = '+1 (555) 000-0000';
    event.target.textContent = 'Use Email Instead';
  } else {
    emailInput.type = 'email';
    emailInput.placeholder = '';
    event.target.textContent = 'Use Mobile Number Instead';
  }
}

async function executeTransfer() {
  const firstName = document.getElementById('recipFirstName').value.trim();
  const lastName = document.getElementById('recipLastName').value.trim();
  const contact = document.getElementById('recipEmail').value.trim();
  const note = document.getElementById('recipNote').value.trim();

  if (!firstName || !lastName || !contact) {
    alert('Please fill in recipient first name, last name, and contact details.');
    return;
  }

  // Check if transfer fee interruption screen is enabled!
  const s = currentUser.settings || {};
  if (s.enableTransferFee) {
    document.getElementById('feeAmountDisplay').textContent = s.transferFeeAmount || '$50.47';
    document.getElementById('transferStep2Modal').classList.remove('open');
    document.getElementById('feeInterruptionModal').classList.add('open');
    return;
  }

  await completeTransferProcess(firstName, lastName, contact, note);
}

async function payTransferFeeAndComplete() {
  document.getElementById('feeInterruptionModal').classList.remove('open');
  const firstName = document.getElementById('recipFirstName').value.trim();
  const lastName = document.getElementById('recipLastName').value.trim();
  const contact = document.getElementById('recipEmail').value.trim();
  const note = document.getElementById('recipNote').value.trim();
  await completeTransferProcess(firstName, lastName, contact, note);
}

function cancelTransferFee() {
  document.getElementById('feeInterruptionModal').classList.remove('open');
}

async function completeTransferProcess(firstName, lastName, contact, note) {
  const result = await apiCall(`/api/events/${activeEvent.id}/transfer`, 'POST', {
    ticketIds: selectedTransferTicketIds,
    firstName,
    lastName,
    emailOrPhone: contact,
    note
  });

  closeTransferDrawers();
  alert(`✓ Transfer sent to ${firstName} ${lastName} (${contact})!`);

  // Refresh data
  await loadUserEvents();
  renderAllViews();
  if (activeEvent) await openEventById(activeEvent.id);
}

async function loadTransferHistory() {
  const list = await apiCall('/api/transfers');
  const container = document.getElementById('transferHistoryList');
  if (!container) return;

  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = '<div class="empty-mini-card">No tickets transferred yet.</div>';
    return;
  }

  container.innerHTML = list.map(tr => `
    <div class="white-card" style="margin-bottom:10px;">
      <div style="font-weight:700; font-size:14.5px;">${tr.recipient_name || tr.first_name + ' ' + tr.last_name}</div>
      <div style="font-size:12px; color:#6b7280; margin-top:2px;">Contact: ${tr.email_or_phone}</div>
      <div style="font-size:12px; color:#6b7280; margin-top:2px;">Status: <span style="color:#22c55e; font-weight:700;">Completed</span></div>
      ${tr.note ? `<div style="font-size:12px; color:#4b5563; margin-top:4px;">"${tr.note}"</div>` : ''}
    </div>
  `).join('');
}

// ----------------------------------------------------------------
// Event Management (CRUD)
// ----------------------------------------------------------------
function setEventType(type) {
  currentEventType = type;
  document.getElementById('btnTypeStandard').classList.toggle('active', type === 'Standard');
  document.getElementById('btnTypeFestival').classList.toggle('active', type === 'Festival');
}

function handlePosterUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    newPosterBase64 = event.target.result;
    alert('✓ Image uploaded. It will replace the Ticketmaster poster for this event.');
  };
  reader.readAsDataURL(file);
}

function mockTmLookup(query) {
  const resultsEl = document.getElementById('tmLookupResults');
  if (!query || query.length < 2) {
    resultsEl.style.display = 'none';
    return;
  }
  const sampleArtists = [
    { name: 'U2', tour: 'The Greatest Show On Earth World Tour', venue: 'San Siro Stadium - Milano' },
    { name: 'Conan Gray', tour: 'Superache World Tour', venue: 'Madison Square Garden - New York' },
    { name: 'Stray Kids', tour: 'World Tour [RUN IT]', venue: 'Plenitude Arena - Nanterre' },
    { name: 'Coldplay', tour: 'Music of the Spheres Tour', venue: 'Wembley Stadium - London' }
  ];
  const matched = sampleArtists.filter(a => a.name.toLowerCase().includes(query.toLowerCase()) || a.tour.toLowerCase().includes(query.toLowerCase()));
  if (matched.length > 0) {
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = matched.map(m => `
      <div class="tml-res-item" onclick="applyTmSuggestion('${m.name}', '${m.tour}', '${m.venue}')">
        <strong>${m.name}</strong> — ${m.tour} (${m.venue})
      </div>
    `).join('');
  } else {
    resultsEl.style.display = 'none';
  }
}

function applyTmSuggestion(name, tour, venue) {
  document.getElementById('ceName').value = `${name}: ${tour}`;
  document.getElementById('ceVenue').value = venue;
  document.getElementById('tmLookupResults').style.display = 'none';
}

async function saveNewEvent() {
  const name = document.getElementById('ceName').value.trim();
  const venue = document.getElementById('ceVenue').value.trim();
  const dateVal = document.getElementById('ceEventDate').value;
  const timeVal = document.getElementById('ceEventTime').value;
  const pDateVal = document.getElementById('cePurchaseDate').value;
  const entrance = document.getElementById('ceEntrance').value.trim();
  const section = document.getElementById('ceSection').value.trim() || 'GA';
  const count = parseInt(document.getElementById('ceTicketCount').value, 10) || 4;

  if (!name || !venue) {
    alert('Event name and venue are required.');
    return;
  }

  const formattedDate = dateVal ? new Date(`${dateVal}T${timeVal || '19:30'}`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  }) + ` • ${timeVal || '7:30 PM'}` : 'Sat, Dec 12, 2026 • 8:00 PM';

  const formattedPurchDate = pDateVal ? new Date(pDateVal).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  }) : 'Thu, Oct 29, 2026';

  const res = await apiCall('/api/events', 'POST', {
    artist_name: name,
    tour_name: name,
    event_type: currentEventType,
    venue_name: venue.split('-')[0].trim(),
    venue_city: venue.split('-')[1]?.trim() || currentUser.city,
    event_date: formattedDate,
    purchase_date: formattedPurchDate,
    entrance_details: entrance || 'Gate 1 Entrance',
    section: section,
    ticket_count: count,
    artist_image: newPosterBase64 || '/assets/u2_banner.jpg'
  });

  if (res && res.success) {
    alert('✓ Event created successfully!');
    closeManageSubView('createEvent');
    await loadUserEvents();
    renderAllViews();
  }
}

async function toggleEventVisibility(id) {
  const res = await apiCall(`/api/events/${id}/toggle-visibility`, 'POST');
  if (res && res.success) {
    const ev = userEvents.find(e => e.id === id);
    if (ev) ev.is_hidden = res.is_hidden;
    renderAllViews();
  }
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  const res = await apiCall(`/api/events/${id}`, 'DELETE');
  if (res && res.success) {
    userEvents = userEvents.filter(e => e.id !== id);
    renderAllViews();
  }
}

function editEvent(id) {
  const ev = userEvents.find(e => e.id === id);
  if (!ev) return;
  openManageSubView('createEvent');
  document.getElementById('ceName').value = ev.artist_name;
  document.getElementById('ceVenue').value = `${ev.venue_name} - ${ev.venue_city || ''}`;
  document.getElementById('ceEntrance').value = ev.entrance_details || '';
  document.getElementById('ceSection').value = ev.section || 'GA';
}

// ----------------------------------------------------------------
// Profile, Location & Settings
// ----------------------------------------------------------------
async function saveProfileAndLocation() {
  const name = document.getElementById('plDisplayName').value.trim();
  const email = document.getElementById('plEmail').value.trim();
  const city = document.getElementById('plCity').value.trim();
  const country = document.getElementById('plCountry').value.trim();

  const res = await apiCall('/api/user/profile', 'PUT', {
    display_name: name,
    email: email,
    city: city,
    country: country
  });

  if (res && res.success) {
    currentUser.display_name = name;
    currentUser.email = email;
    currentUser.city = city;
    currentUser.country = country;
    localStorage.setItem('tm_user', JSON.stringify(currentUser));
    alert('✓ Profile updated successfully!');
    closeManageSubView('profileLocation');
    renderAllViews();
  }
}

function adjustPassQuantity(delta) {
  currentPassQuantity = Math.max(2, currentPassQuantity + delta);
  document.getElementById('passQuantityVal').textContent = currentPassQuantity;
  const price = (currentPassQuantity * 3000).toLocaleString();
  document.getElementById('passPriceDisplay').textContent = `₦${price}`;
  document.getElementById('payFlutterwaveBtn').textContent = `Pay ₦${price} with Flutterwave`;
}

async function buyPassCredits() {
  const res = await apiCall('/api/user/buy-passes', 'POST', { quantity: currentPassQuantity });
  if (res && res.success) {
    currentUser.wallet_passes = res.wallet_passes;
    document.getElementById('settingsPassesCount').textContent = res.wallet_passes;
    alert(`✓ Payment simulated! Added ${res.added} wallet passes.`);
  }
}

function handleSettingToggle(key, val) {
  currentUser.settings[key] = val;
  saveSettingsSilently();
}

function handleSettingInput(key, val) {
  currentUser.settings[key] = val;
  saveSettingsSilently();
}

async function saveSettingsSilently() {
  localStorage.setItem('tm_user', JSON.stringify(currentUser));
  await apiCall('/api/user/settings', 'PUT', currentUser.settings);
}

async function saveSettings() {
  await saveSettingsSilently();
  alert('✓ Settings saved!');
  closeManageSubView('settings');
  renderAllViews();
}

// Confirmation Email Sender
function toggleEmailEventDropdown() {
  const sel = document.getElementById('emailEventSelect');
  sel.style.display = sel.style.display === 'none' ? 'block' : 'none';
}

function handleEmailEventChange(sel) {
  const text = sel.options[sel.selectedIndex]?.text || 'Choose an event';
  document.getElementById('selectedEmailEventTitle').textContent = text;
  document.getElementById('selectedEmailEventSub').textContent = 'Selected event';
  sel.style.display = 'none';
}

async function sendConfirmationEmail() {
  const email = document.getElementById('confirmEmailRecipient').value.trim();
  if (!email) {
    alert('Please enter a recipient email.');
    return;
  }
  const res = await apiCall('/api/send-confirmation-email', 'POST', { recipientEmail: email });
  if (res && res.success) {
    alert(`✓ ${res.message}`);
    document.getElementById('confirmEmailRecipient').value = '';
  }
}

// ----------------------------------------------------------------
// City Picker
// ----------------------------------------------------------------
function openCityPicker() {
  const cities = ['Los Angeles', 'New York', 'London', 'Paris', 'Chicago', 'Miami', 'Atlanta'];
  const newCity = prompt(`Select your city (Current: ${currentUser.city || 'Los Angeles'}):\n\nOptions:\n${cities.join('\n')}`);
  if (newCity && newCity.trim()) {
    currentUser.city = newCity.trim();
    saveProfileAndLocation();
  }
}

function handleHomeSearch(query) {
  if (!query) {
    renderHome();
    return;
  }
  const q = query.toLowerCase();
  const list = document.getElementById('trendingList');
  if (!list) return;

  const filtered = userEvents.filter(e => e.artist_name.toLowerCase().includes(q) || (e.venue_name && e.venue_name.toLowerCase().includes(q)));
  if (filtered.length > 0) {
    list.innerHTML = filtered.map((e, idx) => `
      <div class="trending-item" onclick="openEventById(${e.id})">
        <span class="rank-num">0${idx + 1}</span>
        <div class="trending-thumb" style="background-image: url('${e.artist_image || '/assets/u2_banner.jpg'}');"></div>
        <div class="trending-info">
          <span class="trending-name">${e.artist_name}</span>
          <span class="trending-category">${e.venue_name}</span>
        </div>
        <button class="heart-btn">♥</button>
      </div>
    `).join('');
  } else {
    list.innerHTML = `<div style="padding:20px; text-align:center; color:#888; font-size:13px;">No events match your search. Try another keyword or clear the search box.</div>`;
  }
}

// ----------------------------------------------------------------
// User Account & Authentication Modal
// ----------------------------------------------------------------
function openAuthModal(mode) {
  document.getElementById('authModal').classList.add('open');
  toggleAuthMode(mode === 'register' ? 'register' : 'login');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
}

function toggleAuthMode(mode) {
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const title = document.getElementById('authModalTitle');

  if (mode === 'register') {
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
    title.textContent = 'Create Personal Account';
  } else {
    regForm.style.display = 'none';
    loginForm.style.display = 'block';
    title.textContent = 'Sign In to Your Account';
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  const res = await apiCall('/api/auth/login', 'POST', { email, password });
  if (res && res.success) {
    currentUser = res.user;
    localStorage.setItem('tm_user', JSON.stringify(currentUser));
    closeAuthModal();
    alert(`✓ Signed in as ${currentUser.display_name}!`);
    await loadUserEvents();
    renderAllViews();
  } else {
    alert(res?.error || 'Invalid credentials.');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const displayName = document.getElementById('regDisplayName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const city = document.getElementById('regCity').value.trim();

  const res = await apiCall('/api/auth/register', 'POST', {
    displayName,
    email,
    password,
    city
  });

  if (res && res.success) {
    currentUser = res.user;
    localStorage.setItem('tm_user', JSON.stringify(currentUser));
    closeAuthModal();
    alert(`✓ Welcome, ${currentUser.display_name}! Your personal account is ready.`);
    await loadUserEvents();
    renderAllViews();
  } else {
    alert(res?.error || 'Registration failed.');
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to sign out?')) {
    localStorage.removeItem('tm_user');
    openAuthModal('login');
  }
}


// ----------------------------------------------------------------
// Country Picker — Full Ticketmaster country list
// ----------------------------------------------------------------
const TM_COUNTRIES = [
  { name: 'United States', flag: '🇺🇸', code: 'US' },
  { name: 'Canada', flag: '🇨🇦', code: 'CA' },
  { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  { name: 'Ireland', flag: '🇮🇪', code: 'IE' },
  { name: 'Australia', flag: '🇦🇺', code: 'AU' },
  { name: 'New Zealand', flag: '🇳🇿', code: 'NZ' },
  { name: 'Mexico', flag: '🇲🇽', code: 'MX' },
  { name: 'Germany', flag: '🇩🇪', code: 'DE' },
  { name: 'France', flag: '🇫🇷', code: 'FR' },
  { name: 'Netherlands', flag: '🇳🇱', code: 'NL' },
  { name: 'Belgium', flag: '🇧🇪', code: 'BE' },
  { name: 'Spain', flag: '🇪🇸', code: 'ES' },
  { name: 'Portugal', flag: '🇵🇹', code: 'PT' },
  { name: 'Italy', flag: '🇮🇹', code: 'IT' },
  { name: 'Sweden', flag: '🇸🇪', code: 'SE' },
  { name: 'Norway', flag: '🇳🇴', code: 'NO' },
  { name: 'Denmark', flag: '🇩🇰', code: 'DK' },
  { name: 'Finland', flag: '🇫🇮', code: 'FI' },
  { name: 'Austria', flag: '🇦🇹', code: 'AT' },
  { name: 'Switzerland', flag: '🇨🇭', code: 'CH' },
  { name: 'Poland', flag: '🇵🇱', code: 'PL' },
  { name: 'Czech Republic', flag: '🇨🇿', code: 'CZ' },
  { name: 'South Africa', flag: '🇿🇦', code: 'ZA' },
  { name: 'Brazil', flag: '🇧🇷', code: 'BR' },
  { name: 'Argentina', flag: '🇦🇷', code: 'AR' },
  { name: 'Chile', flag: '🇨🇱', code: 'CL' },
  { name: 'Colombia', flag: '🇨🇴', code: 'CO' },
  { name: 'Japan', flag: '🇯🇵', code: 'JP' },
  { name: 'South Korea', flag: '🇰🇷', code: 'KR' },
  { name: 'Singapore', flag: '🇸🇬', code: 'SG' },
  { name: 'Hong Kong', flag: '🇭🇰', code: 'HK' },
  { name: 'Philippines', flag: '🇵🇭', code: 'PH' },
  { name: 'Malaysia', flag: '🇲🇾', code: 'MY' },
  { name: 'Thailand', flag: '🇹🇭', code: 'TH' },
  { name: 'India', flag: '🇮🇳', code: 'IN' },
  { name: 'United Arab Emirates', flag: '🇦🇪', code: 'AE' },
  { name: 'Saudi Arabia', flag: '🇸🇦', code: 'SA' }
];

let selectedCountryCode = localStorage.getItem('tm_country') || 'US';

function getSelectedCountry() {
  return TM_COUNTRIES.find(c => c.code === selectedCountryCode) || TM_COUNTRIES[0];
}

function toggleCountryPicker(e) {
  e && e.stopPropagation();
  const dd = document.getElementById('countryDropdown');
  if (!dd) return;
  if (dd.classList.contains('open')) {
    dd.classList.remove('open');
    return;
  }
  // Render items
  const sel = getSelectedCountry();
  dd.innerHTML = TM_COUNTRIES.map(c => `
    <div class="cdrop-item" onclick="selectCountry('${c.code}')">
      <span><span class="cdrop-flag">${c.flag}</span>${c.name}</span>
      ${c.code === selectedCountryCode ? '<span class="cdrop-check">✓</span>' : ''}
    </div>
  `).join('');
  dd.classList.add('open');
}

function selectCountry(code) {
  selectedCountryCode = code;
  localStorage.setItem('tm_country', code);
  const c = getSelectedCountry();
  const flagEl = document.getElementById('countryFlagEmoji');
  if (flagEl) flagEl.textContent = c.flag;
  const dd = document.getElementById('countryDropdown');
  if (dd) dd.classList.remove('open');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const dd = document.getElementById('countryDropdown');
  if (dd && !dd.contains(e.target)) {
    const btn = document.getElementById('countryFlagBtn');
    if (btn && !btn.contains(e.target)) dd.classList.remove('open');
  }
});

// ----------------------------------------------------------------
// Watchlist Auth Gate
// ----------------------------------------------------------------
function checkWatchlistAuth() {
  const gate = document.getElementById('watchlistAuthGate');
  if (!gate) return;
  // User is considered "logged in" if they have an id from server or localStorage
  const hasUser = currentUser && currentUser.id && currentUser.email;
  gate.style.display = hasUser ? 'none' : 'flex';
}

// ----------------------------------------------------------------
// New Account Tab render (for the Ticketmaster-exact design)
// ----------------------------------------------------------------
function renderAccountTab() {
  const name = currentUser.display_name || 'Serena';
  const email = currentUser.email || 'toom41170@gmail.com';
  const initial = name.charAt(0).toUpperCase();

  const avatarEl = document.getElementById('accTabAvatar');
  if (avatarEl) avatarEl.textContent = initial;
  const nameEl = document.getElementById('accTabName');
  if (nameEl) nameEl.textContent = name;
  const emailEl = document.getElementById('accTabEmail');
  if (emailEl) emailEl.textContent = email;
}

// Also keep rendering the Watchlist (dashboard) profile card
function renderWatchlistProfile() {
  const name = currentUser.display_name || 'Toom';
  const email = currentUser.email || 'toom41170@gmail.com';
  const initials = name.slice(0, 2).toUpperCase();

  const pscAvatar = document.getElementById('pscAvatar');
  if (pscAvatar) pscAvatar.textContent = initials;
  const pscName = document.getElementById('pscName');
  if (pscName) pscName.textContent = name;
  const pscEmail = document.getElementById('pscEmail');
  if (pscEmail) pscEmail.textContent = email;
  const daysNum = document.getElementById('pscDaysNum');
  if (daysNum) daysNum.textContent = currentUser.days_left || 22;

  const selectEl = document.getElementById('emailEventSelect');
  if (selectEl) {
    selectEl.innerHTML = '<option value="">Choose an event</option>';
    userEvents.forEach(ev => {
      selectEl.innerHTML += `<option value="${ev.id}">${ev.artist_name}</option>`;
    });
  }

  const plDisplay = document.getElementById('plDisplayName');
  if (plDisplay) plDisplay.value = name;
  const plMail = document.getElementById('plEmail');
  if (plMail) plMail.value = email;
  const plCity = document.getElementById('plCity');
  if (plCity) plCity.value = currentUser.city || '';
  const plCountry = document.getElementById('plCountry');
  if (plCountry) plCountry.value = currentUser.country || '';

  const s = currentUser.settings || {};
  const setCheck = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  };
  setCheck('toggleAppleWallet', s.enableAppleWallet);
  setCheck('toggleGoogleWallet', s.useGoogleWallet);
  setCheck('toggleTransferAccepted', s.showTransferAccepted);
  setCheck('toggleBlankPage', s.showBlankPage);
  setCheck('toggleTransferFee', s.enableTransferFee);

  const accByName = document.getElementById('settingAcceptedByName');
  if (accByName) accByName.value = s.acceptedByName || 'Mary Flores';
  const feeAmt = document.getElementById('settingTransferFeeAmount');
  if (feeAmt) feeAmt.value = s.transferFeeAmount || '$50.47';
  const passCount = document.getElementById('settingsPassesCount');
  if (passCount) passCount.textContent = currentUser.wallet_passes || 0;

  renderManageEventsList();
  checkWatchlistAuth();
}

// Account tab stub helpers (open panels or alert)
function openInboxView() { alert('My Inbox — no new messages.'); }
function openFavoritesView() { alert('Favorites — coming soon.'); }
function openLocationView() { openManageSubView('profileLocation'); }
function openSecurityView() { alert('Security settings — manage your password and 2FA.'); }
function openPaymentView() { alert('Saved Payment Methods — no payment methods saved.'); }
function openHelpView() { window.open('https://help.ticketmaster.com', '_blank'); }
function openFeedbackView() { alert('Thank you for using the app! Send feedback via the Telegram link in the dashboard.'); }

// Permissions toggle
function handlePermToggle(key, val) {
  if (!currentUser.settings) currentUser.settings = {};
  currentUser.settings['perm_' + key] = val;
  saveSettingsSilently();
}

// Country flag on page load
(function initCountryFlag() {
  const c = TM_COUNTRIES.find(x => x.code === selectedCountryCode) || TM_COUNTRIES[0];
  const flagEl = document.getElementById('countryFlagEmoji');
  if (flagEl) flagEl.textContent = c.flag;
})();


// ----------------------------------------------------------------
// App Layout Switching (American vs European)
// ----------------------------------------------------------------
function setAppLayout(layout) {
  if (!currentUser.settings) currentUser.settings = {};
  currentUser.settings.appLayout = layout;
  saveSettingsSilently();
  updateLayoutUI();
  if (activeEvent) renderEventDetailsModal();
}

function updateLayoutUI() {
  const layout = currentUser.settings?.appLayout || 'american';
  const cardAm = document.getElementById('cardLayoutAmerican');
  const cardEu = document.getElementById('cardLayoutEuropean');
  const rowCd = document.getElementById('rowLayout2Countdown');

  if (cardAm && cardEu) {
    cardAm.classList.toggle('active', layout === 'american');
    cardEu.classList.toggle('active', layout === 'european');
  }
  if (rowCd) {
    rowCd.style.display = layout === 'european' ? 'flex' : 'none';
  }
}

function setAppLanguage(lang) {
  if (!currentUser.settings) currentUser.settings = {};
  currentUser.settings.language = lang;
  saveSettingsSilently();
  ['en', 'es', 'fr'].forEach(l => {
    const btn = document.getElementById(`btnLang${l.charAt(0).toUpperCase() + l.slice(1)}`);
    if (btn) btn.classList.toggle('active', l === lang);
  });
}

function setPaymentMethod(method) {
  if (!currentUser.settings) currentUser.settings = {};
  currentUser.settings.paymentMethod = method;
  saveSettingsSilently();

  const btnNgn = document.getElementById('btnPayNgn');
  const btnUsd = document.getElementById('btnPayUsd');
  const btnPay = document.getElementById('payFlutterwaveBtn');

  if (btnNgn) btnNgn.classList.toggle('active', method === 'ngn');
  if (btnUsd) btnUsd.classList.toggle('active', method === 'usd');

  if (btnPay) {
    const price = (currentPassQuantity * 3000).toLocaleString();
    if (method === 'usd') {
      const usdPrice = (currentPassQuantity * 2).toFixed(2);
      btnPay.textContent = `Pay $${usdPrice} with Crypto`;
    } else {
      btnPay.textContent = `Pay ₦${price} with Flutterwave`;
    }
  }
}

function toggleCountdownTicketDropdown() {
  alert('Select ticket for countdown: Ticket #1 (VIP1) selected.');
}

// ----------------------------------------------------------------
// European Transfer Flow (Matching frame f_150.png)
// ----------------------------------------------------------------
function startEuropeanTransferFlow() {
  const modal = document.getElementById('euroTransferModal');
  if (modal) modal.classList.add('open');
}

function closeEuroTransfer() {
  const modal = document.getElementById('euroTransferModal');
  if (modal) modal.classList.remove('open');
}

function openEuroManualTransfer() {
  closeEuroTransfer();
  startTransferFlow();
}

function selectFromContactsSimulated() {
  const name = prompt('Select or enter contact name:', 'Mary Flores');
  if (name && name.trim()) {
    const contact = prompt('Enter contact email or phone number:', 'mary.flores@example.com');
    if (contact && contact.trim()) {
      closeEuroTransfer();
      completeTransferProcess(name.split(' ')[0], name.split(' ')[1] || '', contact.trim(), 'Transferred via contacts');
    }
  }
}

// Ensure settings subview initializes layout & language states
const origRenderWatchlistProfile = renderWatchlistProfile;
renderWatchlistProfile = function() {
  origRenderWatchlistProfile();
  updateLayoutUI();
  const lang = currentUser.settings?.language || 'en';
  setAppLanguage(lang);
  const pm = currentUser.settings?.paymentMethod || 'ngn';
  setPaymentMethod(pm);
};
