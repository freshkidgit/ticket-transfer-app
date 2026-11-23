/**
 * Ticketmaster Mobile Ticket & Transfer Experience
 * Connects to Supabase Backend API
 */

// Application State
let eventData = null;
let ticketsList = [];
let currentSlideIndex = 0;
let selectedTicketIds = new Set();
let countdownInterval = null;

// DOM Elements
const carouselTrack = document.getElementById('carouselTrack');
const paginationDots = document.getElementById('paginationDots');
const venueNameText = document.getElementById('venueNameText');
const venueCityText = document.getElementById('venueCityText');
const googleMapIframe = document.getElementById('googleMapIframe');
const googleMapsDirectionsLink = document.getElementById('googleMapsDirectionsLink');
const mapBadgeVenue = document.getElementById('mapBadgeVenue');

// Transfer Sheet Elements
const transferBackdrop = document.getElementById('transferBackdrop');
const transferModal = document.getElementById('transferModal');
const stepSelectTickets = document.getElementById('stepSelectTickets');
const stepTransferTo = document.getElementById('stepTransferTo');
const stepTransferForm = document.getElementById('stepTransferForm');
const stepSending = document.getElementById('stepSending');
const stepSuccess = document.getElementById('stepSuccess');

const transferBtn = document.getElementById('transferBtn');
const sheetCloseBtn1 = document.getElementById('sheetCloseBtn1');
const sheetCloseBtn2 = document.getElementById('sheetCloseBtn2');
const sheetCloseBtn3 = document.getElementById('sheetCloseBtn3');

const sheetSecRowText = document.getElementById('sheetSecRowText');
const sheetTicketTotalCount = document.getElementById('sheetTicketTotalCount');
const seatCardsCarousel = document.getElementById('seatCardsCarousel');
const selectedCountLabel = document.getElementById('selectedCountLabel');
const transferToBtn = document.getElementById('transferToBtn');

const optManualRecipient = document.getElementById('optManualRecipient');
const optSelectContacts = document.getElementById('optSelectContacts');
const backToStep1Btn = document.getElementById('backToStep1Btn');
const backToStep2Btn = document.getElementById('backToStep2Btn');

const formSelectedTitle = document.getElementById('formSelectedTitle');
const formSelectedSubtitle = document.getElementById('formSelectedSubtitle');
const submitTransferBtn = document.getElementById('submitTransferBtn');
const transferForm = document.getElementById('transferForm');

const inputFirstName = document.getElementById('inputFirstName');
const inputLastName = document.getElementById('inputLastName');
const inputEmailOrPhone = document.getElementById('inputEmailOrPhone');
const inputNote = document.getElementById('inputNote');

const finishTransferBtn = document.getElementById('finishTransferBtn');
const successRecipientName = document.getElementById('successRecipientName');
const successRecipientContact = document.getElementById('successRecipientContact');
const successTicketList = document.getElementById('successTicketList');

// Ticket Details Modal
const detailsBackdrop = document.getElementById('detailsBackdrop');
const detailsModal = document.getElementById('detailsModal');
const detailsBody = document.getElementById('detailsBody');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');

// Secret Admin Access Elements
const secretAdminTrigger = document.getElementById('secretAdminTrigger');
const secretPinModal = document.getElementById('secretPinModal');
const secretAuthBackdrop = document.getElementById('secretAuthBackdrop');
const secretPinInput = document.getElementById('secretPinInput');
const pinErrorMessage = document.getElementById('pinErrorMessage');

// ====================================================
// INITIALIZATION
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  setupTouchCarousel();
  setupSecretTrigger();
});

// Apply custom favicon and home screen touch icons
function applyFavicon(url) {
  if (!url) return;

  // Update browser tab favicon
  const siteFavicon = document.getElementById('site-favicon');
  if (siteFavicon) siteFavicon.href = url;

  // Update iOS Home Screen Touch Icon
  let appleIcon = document.getElementById('apple-touch-icon');
  if (appleIcon) {
    appleIcon.href = url;
  } else {
    appleIcon = document.createElement('link');
    appleIcon.id = 'apple-touch-icon';
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = url;
    document.head.appendChild(appleIcon);
  }

  let applePrecomposed = document.getElementById('apple-touch-icon-precomposed');
  if (applePrecomposed) {
    applePrecomposed.href = url;
  } else {
    applePrecomposed = document.createElement('link');
    applePrecomposed.id = 'apple-touch-icon-precomposed';
    applePrecomposed.rel = 'apple-touch-icon-precomposed';
    applePrecomposed.href = url;
    document.head.appendChild(applePrecomposed);
  }
}

// Fetch event and ticket data from Supabase backend
async function loadData() {
  try {
    const [eventRes, ticketsRes] = await Promise.all([
      fetch('/api/event'),
      fetch('/api/tickets')
    ]);

    eventData = await eventRes.json();
    ticketsList = await ticketsRes.json();

    if (eventData.favicon_url) {
      applyFavicon(eventData.favicon_url);
    }

    renderUI();
  } catch (err) {
    console.error('Error loading ticket data:', err);
  }
}

// ====================================================
// UI RENDERING
// ====================================================
function renderUI() {
  if (!eventData || !ticketsList) return;

  // Update venue info
  if (venueNameText) venueNameText.textContent = eventData.venue_name;
  if (venueCityText) venueCityText.textContent = eventData.venue_city;
  if (mapBadgeVenue) mapBadgeVenue.textContent = eventData.venue_name;

  // Real Google Maps Integration
  const locationQuery = `${eventData.venue_name || 'Arrow'}, ${eventData.venue_city || 'Allentown, PA'}`;
  if (googleMapIframe) {
    googleMapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }
  if (googleMapsDirectionsLink) {
    googleMapsDirectionsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;
  }

  // Render Carousel Cards
  renderCarousel();

  // Render Transfer Sheet Step 1 Seat Selectors
  renderSeatSelectorCards();

  // Start live countdown
  startCountdown();
}

function renderCarousel() {
  carouselTrack.innerHTML = '';
  paginationDots.innerHTML = '';

  ticketsList.forEach((ticket, index) => {
    const slide = document.createElement('div');
    slide.className = 'ticket-card-slide';

    const isPending = ticket.status === 'transfer_pending';

    slide.innerHTML = `
      <div class="ticket-card" data-ticket-id="${ticket.id}">
        <!-- Top Blue Header -->
        <div class="card-blue-header">
          <div class="header-top-row">
            <span class="onsale-badge">${escapeHtml(eventData.badge_text || 'Verified Fan Onsale')}</span>
            <button class="info-circle-btn" onclick="openDetailsModal(${ticket.id})" aria-label="Info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </button>
          </div>
          <div class="header-seat-row">
            <span class="sec-title"><small>SEC</small>${escapeHtml(ticket.section || eventData.section || 'Floor')}</span>
            <span class="seat-type-label">${escapeHtml(eventData.seat_type || 'General Admission')}</span>
          </div>
        </div>

        <!-- Transfer Pending Alert Banner -->
        ${isPending ? `
          <div class="card-transfer-banner">
            <span class="transfer-pill">Transfer Pending to ${escapeHtml(ticket.transferred_to_name || 'Recipient')}</span>
            <button class="cancel-transfer-link" onclick="cancelTransfer(${ticket.id})">Cancel</button>
          </div>
        ` : ''}

        <!-- Artist Hero Image (uploaded file or default) -->
        <div class="card-artist-hero">
          <img src="${escapeHtml(eventData.artist_image || '/assets/conan_banner.jpg')}" alt="${escapeHtml(eventData.artist_name)}" class="hero-img">
          <div class="hero-gradient-overlay">
            <h2 class="artist-name">${escapeHtml(eventData.artist_name)}</h2>
            <p class="event-datetime-venue">${escapeHtml(eventData.event_date)} • ${escapeHtml(eventData.venue_name)}</p>
          </div>
        </div>

        <!-- White Bottom Section with Live Countdown -->
        <div class="card-white-bottom">
          <div class="ready-label">Ticket will be ready in:</div>
          <div class="countdown-grid" id="countdownGrid_${ticket.id}">
            <div class="countdown-col">
              <span class="countdown-num cd-day">03</span>
              <span class="countdown-unit">DAY</span>
            </div>
            <div class="countdown-col">
              <span class="countdown-num cd-hour">05</span>
              <span class="countdown-unit">HOUR</span>
            </div>
            <div class="countdown-col">
              <span class="countdown-num cd-min">48</span>
              <span class="countdown-unit">MIN</span>
            </div>
            <div class="countdown-col">
              <span class="countdown-num cd-sec">31</span>
              <span class="countdown-unit">SECONDS</span>
            </div>
          </div>
          <button class="ticket-details-link" onclick="openDetailsModal(${ticket.id})">
            Ticket Details
          </button>
        </div>
      </div>
    `;

    carouselTrack.appendChild(slide);

    // Create pagination dot
    const dot = document.createElement('div');
    dot.className = `dot ${index === currentSlideIndex ? 'active' : ''}`;
    dot.onclick = () => goToSlide(index);
    paginationDots.appendChild(dot);
  });

  goToSlide(currentSlideIndex);
}

// Carousel Slide Transition
function goToSlide(index) {
  if (index < 0) index = 0;
  if (index >= ticketsList.length) index = ticketsList.length - 1;
  currentSlideIndex = index;

  carouselTrack.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

  const dots = paginationDots.querySelectorAll('.dot');
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentSlideIndex);
  });
}

// Touch & Mouse Drag for Carousel
function setupTouchCarousel() {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  const container = document.getElementById('carouselContainer');
  if (!container) return;

  container.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    const diff = startX - currentX;
    if (diff > 40) {
      goToSlide(currentSlideIndex + 1);
    } else if (diff < -40) {
      goToSlide(currentSlideIndex - 1);
    }
  });
}

// ====================================================
// LIVE COUNTDOWN TIMER
// ====================================================
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);

  function tick() {
    if (!eventData || !eventData.countdown_target) return;
    const target = new Date(eventData.countdown_target).getTime();
    const now = Date.now();
    let diff = Math.max(0, Math.floor((target - now) / 1000));

    const days = Math.floor(diff / 86400);
    diff %= 86400;
    const hours = Math.floor(diff / 3600);
    diff %= 3600;
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;

    const dayStr = String(days).padStart(2, '0');
    const hourStr = String(hours).padStart(2, '0');
    const minStr = String(mins).padStart(2, '0');
    const secStr = String(secs).padStart(2, '0');

    ticketsList.forEach((ticket) => {
      const grid = document.getElementById(`countdownGrid_${ticket.id}`);
      if (grid) {
        grid.querySelector('.cd-day').textContent = dayStr;
        grid.querySelector('.cd-hour').textContent = hourStr;
        grid.querySelector('.cd-min').textContent = minStr;
        grid.querySelector('.cd-sec').textContent = secStr;
      }
    });
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

// ====================================================
// TRANSFER BOTTOM SHEET MODAL
// ====================================================
function openTransferModal() {
  selectedTicketIds.clear();

  showStep(stepSelectTickets);

  if (sheetSecRowText) {
    sheetSecRowText.textContent = `Sec ${eventData.section || 'Floor'}, Row ${eventData.row_name || '0'}`;
  }
  if (sheetTicketTotalCount) {
    sheetTicketTotalCount.textContent = `${ticketsList.length} tickets`;
  }

  renderSeatSelectorCards();
  updateSelectedCount();

  transferBackdrop.classList.add('active');
  transferModal.classList.add('active');
}

function closeTransferModal() {
  transferBackdrop.classList.remove('active');
  transferModal.classList.remove('active');
}

function showStep(targetStep) {
  [stepSelectTickets, stepTransferTo, stepTransferForm, stepSending, stepSuccess].forEach(step => {
    if (step) step.classList.add('hidden');
  });
  if (targetStep) targetStep.classList.remove('hidden');
}

function renderSeatSelectorCards() {
  seatCardsCarousel.innerHTML = '';

  ticketsList.forEach((ticket) => {
    const isPending = ticket.status === 'transfer_pending';
    const isSelected = selectedTicketIds.has(ticket.id);

    const card = document.createElement('div');
    card.className = `seat-select-card ${isSelected ? 'selected' : ''} ${isPending ? 'disabled' : ''}`;
    card.setAttribute('data-seat-id', ticket.id);

    card.innerHTML = `
      <div class="seat-card-top">${escapeHtml(ticket.seat_label || 'SEAT')}</div>
      <div class="seat-card-body">
        <div class="seat-check-circle"></div>
      </div>
    `;

    if (!isPending) {
      card.onclick = () => toggleSeatSelection(ticket.id);
    }

    seatCardsCarousel.appendChild(card);
  });
}

function toggleSeatSelection(ticketId) {
  if (selectedTicketIds.has(ticketId)) {
    selectedTicketIds.delete(ticketId);
  } else {
    selectedTicketIds.add(ticketId);
  }

  const cards = seatCardsCarousel.querySelectorAll('.seat-select-card');
  cards.forEach(card => {
    const id = parseInt(card.getAttribute('data-seat-id'), 10);
    card.classList.toggle('selected', selectedTicketIds.has(id));
  });

  updateSelectedCount();
}

function updateSelectedCount() {
  const count = selectedTicketIds.size;
  selectedCountLabel.textContent = `${count} Selected`;

  if (count > 0) {
    transferToBtn.removeAttribute('disabled');
    transferToBtn.classList.add('active');
  } else {
    transferToBtn.setAttribute('disabled', 'true');
    transferToBtn.classList.remove('active');
  }
}

function proceedToTransferTo() {
  if (selectedTicketIds.size === 0) return;
  showStep(stepTransferTo);
}

function proceedToRecipientForm() {
  const count = selectedTicketIds.size;
  formSelectedTitle.textContent = `${count} Ticket${count > 1 ? 's' : ''} Selected`;
  formSelectedSubtitle.textContent = `Sec ${eventData.section || 'Floor'} Row ${eventData.row_name || '0'} Seat`;
  submitTransferBtn.textContent = `TRANSFER ${count} TICKET${count > 1 ? 'S' : ''}`;

  inputFirstName.value = '';
  inputLastName.value = '';
  inputEmailOrPhone.value = '';
  inputNote.value = '';

  showStep(stepTransferForm);
}

async function submitTransfer() {
  const firstName = inputFirstName.value.trim();
  const lastName = inputLastName.value.trim();
  const emailOrPhone = inputEmailOrPhone.value.trim();
  const note = inputNote.value.trim();

  if (!firstName || !lastName || !emailOrPhone) {
    alert('Please fill out all recipient details.');
    return;
  }

  showStep(stepSending);

  try {
    const res = await fetch('/api/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketIds: Array.from(selectedTicketIds),
        firstName,
        lastName,
        emailOrPhone,
        note
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Transfer failed');

    successRecipientName.textContent = `${firstName} ${lastName}`;
    successRecipientContact.textContent = emailOrPhone;
    
    const seatNumbers = ticketsList
      .filter(t => selectedTicketIds.has(t.id))
      .map(t => `Seat ${t.seat_number}`)
      .join(', ');
    successTicketList.textContent = seatNumbers || `${selectedTicketIds.size} Seats`;

    await loadData();

    setTimeout(() => {
      showStep(stepSuccess);
    }, 800);

  } catch (err) {
    alert('Error transferring tickets: ' + err.message);
    showStep(stepTransferForm);
  }
}

async function cancelTransfer(ticketId) {
  if (!confirm('Are you sure you want to cancel this transfer and keep the ticket?')) return;

  try {
    const res = await fetch('/api/transfer/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId })
    });
    const data = await res.json();
    if (data.success) {
      await loadData();
    }
  } catch (err) {
    alert('Error cancelling transfer: ' + err.message);
  }
}

// ====================================================
// TICKET DETAILS MODAL
// ====================================================
function openDetailsModal(ticketId) {
  const ticket = ticketsList.find(t => t.id === ticketId) || ticketsList[0];
  if (!ticket) return;

  const price = (eventData.ticket_price || 89.50).toFixed(2);
  const fee = (eventData.service_fee || 18.25).toFixed(2);
  const total = (parseFloat(price) + parseFloat(fee)).toFixed(2);

  detailsBody.innerHTML = `
    <div class="safetix-container">
      <div class="safetix-label">SafeTix™ Active Barcode</div>
      <div class="barcode-wrapper">
        <div class="safetix-scan-bar"></div>
      </div>
      <div class="barcode-number">${ticket.barcode_code || '8192 0481 0294 8102'}</div>
    </div>

    <table class="details-table">
      <tr><td>Event</td><td>${escapeHtml(eventData.artist_name)}</td></tr>
      <tr><td>Date & Time</td><td>${escapeHtml(eventData.event_date)}</td></tr>
      <tr><td>Venue</td><td>${escapeHtml(eventData.venue_name)}, ${escapeHtml(eventData.venue_city)}</td></tr>
      <tr><td>Section</td><td>${escapeHtml(ticket.section || 'Floor')}</td></tr>
      <tr><td>Row</td><td>${escapeHtml(ticket.row_name || '0')}</td></tr>
      <tr><td>Seat</td><td>${escapeHtml(ticket.seat_number || 'General Admission')}</td></tr>
      <tr><td>Order Number</td><td>${escapeHtml(eventData.order_number || '28-49201/PHL')}</td></tr>
      <tr><td>Ticket Price</td><td>$${price}</td></tr>
      <tr><td>Service Fee</td><td>$${fee}</td></tr>
      <tr><td>Total Paid</td><td>$${total}</td></tr>
      <tr><td>Status</td><td>${ticket.status === 'transfer_pending' ? 'Transfer Pending' : 'Valid for Entry'}</td></tr>
    </table>
  `;

  detailsBackdrop.classList.add('active');
  detailsModal.classList.add('active');
}

function closeDetailsModal() {
  detailsBackdrop.classList.remove('active');
  detailsModal.classList.remove('active');
}

// ====================================================
// SECRET ADMIN ACCESS (Password: 12345)
// ====================================================
let triggerClickCount = 0;
let triggerClickTimer = null;

function setupSecretTrigger() {
  if (!secretAdminTrigger) return;

  // Secret: Tap/click the "My Tickets" header 3 times in 1.5 seconds
  secretAdminTrigger.addEventListener('click', () => {
    triggerClickCount++;
    clearTimeout(triggerClickTimer);

    if (triggerClickCount >= 3) {
      triggerClickCount = 0;
      openSecretAuth();
    } else {
      triggerClickTimer = setTimeout(() => {
        triggerClickCount = 0;
      }, 1500);
    }
  });

  // Also support secret keyboard shortcut: Ctrl+Shift+A
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      openSecretAuth();
    }
  });
}

function openSecretAuth() {
  secretPinInput.value = '';
  pinErrorMessage.textContent = '';
  secretAuthBackdrop.classList.add('active');
  secretPinModal.classList.add('active');
  setTimeout(() => secretPinInput.focus(), 150);
}

function closeSecretAuth() {
  secretAuthBackdrop.classList.remove('active');
  secretPinModal.classList.remove('active');
}

function handleSecretAuth(e) {
  e.preventDefault();
  const enteredPin = secretPinInput.value.trim();

  // Password requirement: 12345
  if (enteredPin === '12345') {
    sessionStorage.setItem('tm_admin_auth', '12345');
    window.location.href = '/admin.html';
  } else {
    pinErrorMessage.textContent = 'Incorrect passcode.';
    secretPinInput.select();
  }
}

// ====================================================
// EVENT LISTENERS
// ====================================================
function setupEventListeners() {
  if (transferBtn) transferBtn.onclick = openTransferModal;
  if (transferBackdrop) transferBackdrop.onclick = closeTransferModal;
  if (sheetCloseBtn1) sheetCloseBtn1.onclick = closeTransferModal;
  if (sheetCloseBtn2) sheetCloseBtn2.onclick = closeTransferModal;
  if (sheetCloseBtn3) sheetCloseBtn3.onclick = closeTransferModal;

  if (transferToBtn) transferToBtn.onclick = proceedToTransferTo;
  if (optManualRecipient) optManualRecipient.onclick = proceedToRecipientForm;
  if (optSelectContacts) {
    optSelectContacts.onclick = () => {
      inputFirstName.value = 'Alex';
      inputLastName.value = 'Rivera';
      inputEmailOrPhone.value = 'alex.rivera@icloud.com';
      inputNote.value = 'Conan Gray tickets!';
      proceedToRecipientForm();
    };
  }

  if (backToStep1Btn) backToStep1Btn.onclick = () => showStep(stepSelectTickets);
  if (backToStep2Btn) backToStep2Btn.onclick = () => showStep(stepTransferTo);
  if (finishTransferBtn) finishTransferBtn.onclick = closeTransferModal;

  if (transferForm) transferForm.onsubmit = submitTransfer;

  if (closeDetailsBtn) closeDetailsBtn.onclick = closeDetailsModal;
  if (detailsBackdrop) detailsBackdrop.onclick = closeDetailsModal;

  if (secretAuthBackdrop) secretAuthBackdrop.onclick = closeSecretAuth;

  const closeNavBtn = document.getElementById('closeNavBtn');
  if (closeNavBtn) {
    closeNavBtn.onclick = () => {
      console.log('Close navigation clicked');
    };
  }

  const helpNavBtn = document.getElementById('helpNavBtn');
  if (helpNavBtn) {
    helpNavBtn.onclick = () => {
      alert('Ticketmaster Support: Contact customer assistance for transfer and order inquiries.');
    };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
