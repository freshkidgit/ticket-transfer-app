/**
 * Admin Panel & Database Manager JavaScript
 * Protected by Passcode: 12345
 */

let currentEvent = null;

// Presets data
const presets = {
  conan: {
    artist_name: 'Conan Gray',
    tour_name: 'Superache Tour',
    badge_text: 'Verified Fan Onsale',
    venue_name: 'Arrow',
    venue_city: 'Allentown, PA',
    event_date: 'Sat, Aug 15, 7:00 PM',
    section: 'Floor',
    row_name: '0',
    seat_type: 'General Admission',
    ticket_price: 89.50,
    service_fee: 18.25,
    order_number: '28-49201/PHL',
    artist_image: '/assets/conan_banner.jpg',
    map_image: '/assets/venue_map_crop.png',
    ticket_count: 4
  },
  taylor: {
    artist_name: 'Taylor Swift',
    tour_name: 'The Eras Tour',
    badge_text: 'Verified Fan Presale',
    venue_name: 'Lincoln Financial Field',
    venue_city: 'Philadelphia, PA',
    event_date: 'Sun, Sep 20, 6:30 PM',
    section: 'Floor A',
    row_name: '3',
    seat_type: 'VIP Floor Reserved',
    ticket_price: 249.00,
    service_fee: 38.50,
    order_number: '14-89320/PHI',
    artist_image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
    map_image: '/assets/venue_map_crop.png',
    ticket_count: 2
  },
  billie: {
    artist_name: 'Billie Eilish',
    tour_name: 'Hit Me Hard and Soft: The Tour',
    badge_text: 'Official Platinum',
    venue_name: 'Barclays Center',
    venue_city: 'Brooklyn, NY',
    event_date: 'Fri, Oct 11, 7:30 PM',
    section: '108',
    row_name: '12',
    seat_type: 'Lower Bowl Reserved',
    ticket_price: 135.00,
    service_fee: 24.10,
    order_number: '39-10294/NYC',
    artist_image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
    map_image: '/assets/venue_map_crop.png',
    ticket_count: 4
  },
  drake: {
    artist_name: 'Drake',
    tour_name: "It's All A Blur Tour",
    badge_text: 'Verified Fan Onsale',
    venue_name: 'Madison Square Garden',
    venue_city: 'New York, NY',
    event_date: 'Wed, Nov 18, 8:00 PM',
    section: 'GA Floor',
    row_name: 'GA',
    seat_type: 'General Admission Floor',
    ticket_price: 195.00,
    service_fee: 31.00,
    order_number: '55-39201/MSG',
    artist_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    map_image: '/assets/venue_map_crop.png',
    ticket_count: 4
  }
};

// ================================================================
// PASSCODE AUTHENTICATION (Password: 12345)
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

function checkAuth() {
  const isAuth = sessionStorage.getItem('tm_admin_auth') === '12345';
  const lockOverlay = document.getElementById('adminLockOverlay');
  const mainContainer = document.getElementById('adminMainContainer');

  if (isAuth) {
    if (lockOverlay) lockOverlay.style.display = 'none';
    if (mainContainer) mainContainer.style.display = 'block';
    loadAdminData();
  } else {
    if (lockOverlay) lockOverlay.style.display = 'flex';
    if (mainContainer) mainContainer.style.display = 'none';
    const passInput = document.getElementById('adminPassInput');
    if (passInput) passInput.focus();
  }
}

function verifyAdminPasscode(e) {
  e.preventDefault();
  const input = document.getElementById('adminPassInput');
  const errorEl = document.getElementById('adminLockError');
  const val = input.value.trim();

  // Password requirement: 12345
  if (val === '12345') {
    sessionStorage.setItem('tm_admin_auth', '12345');
    errorEl.textContent = '';
    checkAuth();
  } else {
    errorEl.textContent = 'Incorrect passcode.';
    input.select();
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('tm_admin_auth');
  checkAuth();
}

// ================================================================
// LOAD DATA FROM SUPABASE
// ================================================================
async function loadAdminData() {
  try {
    const [eventRes, ticketsRes, transfersRes] = await Promise.all([
      fetch('/api/event'),
      fetch('/api/tickets'),
      fetch('/api/transfers')
    ]);

    currentEvent = await eventRes.json();
    const tickets = await ticketsRes.json();
    const transfers = await transfersRes.json();

    populateForm(currentEvent);
    renderTicketsTable(tickets);
    renderTransfersTable(transfers);
    try {
      const favRes = await fetch('/api/favicon');
      const favData = await favRes.json();
      if (favData && favData.faviconUrl) {
        currentEvent = { ...(currentEvent || {}), favicon_url: favData.faviconUrl };
      }
    } catch (e) {}
    applyCurrentFavicon(currentEvent);
    loadGmailSettings();
    loadAdminUsers();
  } catch (err) {
    console.error('Error loading admin data:', err);
  }
}

function populateForm(event) {
  if (!event) return;
  document.getElementById('artist_name').value = event.artist_name || '';
  document.getElementById('tour_name').value = event.tour_name || '';
  document.getElementById('badge_text').value = event.badge_text || 'Verified Fan Onsale';
  document.getElementById('venue_name').value = event.venue_name || '';
  document.getElementById('venue_city').value = event.venue_city || '';
  document.getElementById('event_date').value = event.event_date || '';
  document.getElementById('section').value = event.section || 'Floor';
  document.getElementById('row_name').value = event.row_name || '0';
  document.getElementById('seat_type').value = event.seat_type || 'General Admission';
  document.getElementById('ticket_price').value = (event.ticket_price || 89.5).toFixed(2);
  document.getElementById('service_fee').value = (event.service_fee || 18.25).toFixed(2);
  document.getElementById('order_number').value = event.order_number || '28-49201/PHL';
  document.getElementById('artist_image').value = event.artist_image || '/assets/conan_banner.jpg';
  document.getElementById('ticket_count').value = String(event.ticket_count || 4);

  if (event.countdown_target) {
    const dt = new Date(event.countdown_target);
    const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('countdown_target').value = localIso;
  }

  updateImagePreview();
  updateMapPreview();
}

// ================================================================
// FILE UPLOAD FOR BACKGROUND IMAGE
// ================================================================
function handleBgFileUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    document.getElementById('artist_image').value = dataUrl;
    updateImagePreview();
    showAlert('Image uploaded! Click "Save All Changes" to sync to Supabase.');
  };
  reader.readAsDataURL(file);
}

function updateImagePreview() {
  const url = document.getElementById('artist_image').value;
  const img = document.getElementById('imgPreview');
  if (url && img) {
    img.src = url;
  }
}

// ================================================================
// REAL GOOGLE MAPS PREVIEW
// ================================================================
function updateMapPreview() {
  const venue = document.getElementById('venue_name').value.trim();
  const city = document.getElementById('venue_city').value.trim();
  const query = `${venue || 'Arrow'}, ${city || 'Allentown, PA'}`;
  const iframe = document.getElementById('adminMapIframe');
  if (iframe) {
    iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }
}

// ================================================================
// PRESETS
// ================================================================
function applyPreset(key) {
  const p = presets[key];
  if (!p) return;

  document.querySelectorAll('.preset-pill').forEach(pill => pill.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');

  const targetDate = new Date(Date.now() + (3 * 86400 + 5 * 3600 + 48 * 60 + 31) * 1000);
  const localIso = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('countdown_target').value = localIso;

  document.getElementById('artist_name').value = p.artist_name;
  document.getElementById('tour_name').value = p.tour_name;
  document.getElementById('badge_text').value = p.badge_text;
  document.getElementById('venue_name').value = p.venue_name;
  document.getElementById('venue_city').value = p.venue_city;
  document.getElementById('event_date').value = p.event_date;
  document.getElementById('section').value = p.section;
  document.getElementById('row_name').value = p.row_name;
  document.getElementById('seat_type').value = p.seat_type;
  document.getElementById('ticket_price').value = p.ticket_price.toFixed(2);
  document.getElementById('service_fee').value = p.service_fee.toFixed(2);
  document.getElementById('order_number').value = p.order_number;
  document.getElementById('artist_image').value = p.artist_image;
  document.getElementById('ticket_count').value = String(p.ticket_count);

  updateImagePreview();
  updateMapPreview();
}

// ================================================================
// SAVE EVENT TO SUPABASE
// ================================================================
async function saveEventData(e) {
  e.preventDefault();

  const countdownVal = document.getElementById('countdown_target').value;
  const targetIso = countdownVal ? new Date(countdownVal).toISOString() : null;

  const payload = {
    artist_name: document.getElementById('artist_name').value.trim(),
    tour_name: document.getElementById('tour_name').value.trim(),
    badge_text: document.getElementById('badge_text').value.trim(),
    venue_name: document.getElementById('venue_name').value.trim(),
    venue_city: document.getElementById('venue_city').value.trim(),
    event_date: document.getElementById('event_date').value.trim(),
    countdown_target: targetIso,
    section: document.getElementById('section').value.trim(),
    row_name: document.getElementById('row_name').value.trim(),
    seat_type: document.getElementById('seat_type').value.trim(),
    ticket_price: parseFloat(document.getElementById('ticket_price').value) || 89.50,
    service_fee: parseFloat(document.getElementById('service_fee').value) || 18.25,
    order_number: document.getElementById('order_number').value.trim(),
    artist_image: document.getElementById('artist_image').value.trim()
  };

  try {
    const res = await fetch('/api/event', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save');

    showAlert('All changes saved to Supabase! The ticket website is updated.');
    loadAdminData();
  } catch (err) {
    alert('Error saving event: ' + err.message);
  }
}

// Update ticket count
async function updateTicketCount() {
  const count = parseInt(document.getElementById('ticket_count').value, 10);
  if (!confirm(`Update total tickets to ${count}? This will recreate the tickets in Supabase.`)) return;

  try {
    const res = await fetch('/api/tickets/update-count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count })
    });
    const data = await res.json();
    if (data.success) {
      showAlert(`Ticket inventory updated to ${count} tickets in Supabase.`);
      loadAdminData();
    }
  } catch (err) {
    alert('Error updating ticket count: ' + err.message);
  }
}

// Reset all tickets
async function resetAllTickets() {
  if (!confirm('Reset all tickets and delete transfer history?')) return;
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showAlert('All tickets restored to active state.');
      loadAdminData();
    }
  } catch (err) {
    alert('Reset failed: ' + err.message);
  }
}

// Cancel transfer
async function cancelTransfer(ticketId) {
  if (!confirm('Cancel transfer for this ticket?')) return;
  try {
    const res = await fetch('/api/transfer/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId })
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Transfer cancelled.');
      loadAdminData();
    }
  } catch (err) {
    alert('Cancel failed: ' + err.message);
  }
}

function renderTicketsTable(tickets) {
  const tbody = document.getElementById('ticketsTableBody');
  tbody.innerHTML = '';

  if (!tickets || tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">No tickets found.</td></tr>';
    return;
  }

  tickets.forEach(ticket => {
    const tr = document.createElement('tr');
    const isPending = ticket.status === 'transfer_pending';

    tr.innerHTML = `
      <td>#${ticket.id}</td>
      <td><strong>${ticket.seat_label} ${ticket.seat_number}</strong></td>
      <td>${ticket.section}</td>
      <td>Row ${ticket.row_name}</td>
      <td>
        <span class="status-badge ${ticket.status}">
          ${isPending ? 'Transfer Pending' : 'Active'}
        </span>
      </td>
      <td>${ticket.transferred_to_name ? `${ticket.transferred_to_name} (${ticket.transferred_to_contact || ''})` : '—'}</td>
      <td>
        ${isPending ? `<a class="action-link" onclick="cancelTransfer(${ticket.id})">Cancel Transfer</a>` : '—'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTransfersTable(transfers) {
  const tbody = document.getElementById('transfersTableBody');
  tbody.innerHTML = '';

  if (!transfers || transfers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">No transfer history yet.</td></tr>';
    return;
  }

  transfers.forEach(transfer => {
    const tr = document.createElement('tr');
    const dateFormatted = new Date(transfer.created_at).toLocaleString();

    tr.innerHTML = `
      <td>#${transfer.id}</td>
      <td><strong>${transfer.first_name} ${transfer.last_name}</strong></td>
      <td>${transfer.email_or_phone}</td>
      <td>${transfer.note || '—'}</td>
      <td><span class="status-badge ${transfer.status}">${transfer.status}</span></td>
      <td>${dateFormatted}</td>
      <td>
        ${transfer.claim_url ? `<a href="${transfer.claim_url}" target="_blank" class="action-link" style="margin-right:8px; color:#38bdf8;">🔗 View Claim</a>` : ''}
        ${transfer.status === 'pending' ? `<a class="action-link" style="color:#ef4444;" onclick="cancelBatchTransfer(${transfer.id})">Cancel Batch</a>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function cancelBatchTransfer(transferId) {
  if (!confirm('Cancel this entire transfer?')) return;
  try {
    const res = await fetch('/api/transfer/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transferId })
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Transfer cancelled.');
      loadAdminData();
    }
  } catch (err) {
    alert('Cancel failed: ' + err.message);
  }
}

// Favicon Management
let pendingFaviconDataUrl = null;

function applyCurrentFavicon(event) {
  const previewImg = document.getElementById('faviconPreviewImg');
  const emptyLabel = document.getElementById('faviconEmptyLabel');
  const clearBtn = document.getElementById('clearFaviconBtn');

  if (event && event.favicon_url) {
    previewImg.src = event.favicon_url;
    previewImg.style.display = 'block';
    if (emptyLabel) emptyLabel.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'inline-flex';
    setTabFavicon(event.favicon_url);
  } else {
    previewImg.style.display = 'none';
    if (emptyLabel) emptyLabel.style.display = 'block';
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

function setTabFavicon(url) {
  let link = document.getElementById('site-favicon');
  if (!link) {
    link = document.createElement('link');
    link.id = 'site-favicon';
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

function previewFavicon(input) {
  const file = input.files[0];
  if (!file) return;

  const nameEl = document.getElementById('faviconFileName');
  const saveBtn = document.getElementById('saveFaviconBtn');
  const previewImg = document.getElementById('faviconPreviewImg');
  const emptyLabel = document.getElementById('faviconEmptyLabel');
  nameEl.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

  const reader = new FileReader();
  reader.onload = (e) => {
    // Preserve the exact uploaded image bytes without resizing or adding padding
    pendingFaviconDataUrl = e.target.result;
    previewImg.src = pendingFaviconDataUrl;
    previewImg.style.display = 'block';
    if (emptyLabel) emptyLabel.style.display = 'none';
    saveBtn.removeAttribute('disabled');
  };
  reader.readAsDataURL(file);
}

async function saveFavicon() {
  if (!pendingFaviconDataUrl) return;

  try {
    const res = await fetch('/api/favicon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faviconUrl: pendingFaviconDataUrl })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save favicon');

    setTabFavicon(pendingFaviconDataUrl);
    document.getElementById('clearFaviconBtn').style.display = 'inline-flex';
    document.getElementById('saveFaviconBtn').setAttribute('disabled', 'true');
    document.getElementById('faviconFileName').textContent = '✅ Favicon saved to Supabase.';
    pendingFaviconDataUrl = null;

    showAlert('Favicon updated successfully!');
  } catch (err) {
    alert('Error saving favicon: ' + err.message);
  }
}

async function clearFavicon() {
  if (!confirm('Remove the custom favicon?')) return;

  try {
    const res = await fetch('/api/favicon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faviconUrl: '' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    const previewImg = document.getElementById('faviconPreviewImg');
    const emptyLabel = document.getElementById('faviconEmptyLabel');
    previewImg.style.display = 'none';
    if (emptyLabel) emptyLabel.style.display = 'block';
    document.getElementById('clearFaviconBtn').style.display = 'none';
    document.getElementById('faviconFileName').textContent = 'No file chosen.';
    document.getElementById('faviconFileInput').value = '';
    pendingFaviconDataUrl = null;

    showAlert('Favicon removed.');
  } catch (err) {
    alert('Error removing favicon: ' + err.message);
  }
}

function showAlert(msg) {
  const alertEl = document.getElementById('statusAlert');
  alertEl.textContent = msg;
  alertEl.style.display = 'block';
  setTimeout(() => {
    alertEl.style.display = 'none';
  }, 4000);
}

// ================================================================
// GMAIL SETTINGS & TESTING
// ================================================================
async function loadGmailSettings() {
  try {
    const res = await fetch('/api/settings/email');
    const data = await res.json();
    const notice = document.getElementById('gmailSettingsNotice');
    const userInput = document.getElementById('admin_gmail_user');

    if (data.user) {
      userInput.value = data.user;
    }

    if (data.isConfigured) {
      notice.innerHTML = `<span style="color:#22c55e;">✅ Gmail is active & configured (${data.maskedUser || data.user}). Real transfer emails will be sent.</span>`;
    } else {
      notice.innerHTML = `<span style="color:#f59e0b;">⚠️ Gmail not configured yet. Set your Gmail & 16-character App Password to enable live delivery.</span>`;
    }
  } catch (err) {
    console.warn('Error loading Gmail settings:', err);
  }
}

async function saveGmailSettings() {
  const user = document.getElementById('admin_gmail_user').value.trim();
  const pass = document.getElementById('admin_gmail_pass').value.trim();

  if (!user) {
    alert('Please enter your Gmail address.');
    return;
  }

  try {
    const res = await fetch('/api/settings/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass })
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Gmail settings saved successfully!');
      loadGmailSettings();
    } else {
      alert('Failed to save Gmail settings.');
    }
  } catch (err) {
    alert('Network error saving settings: ' + err.message);
  }
}

async function sendAdminTestEmail() {
  const recipient = document.getElementById('admin_test_recipient').value.trim();
  const notice = document.getElementById('gmailSettingsNotice');

  notice.innerHTML = `<span style="color:#38bdf8;">⏳ Sending test email...</span>`;

  try {
    const res = await fetch('/api/settings/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient })
    });
    const data = await res.json();

    if (data.success) {
      notice.innerHTML = `<span style="color:#22c55e;">✅ ${data.message}</span>`;
      showAlert('Test email dispatched successfully!');
    } else {
      notice.innerHTML = `<span style="color:#ef4444;">❌ Error: ${data.error}</span>`;
    }
  } catch (err) {
    notice.innerHTML = `<span style="color:#ef4444;">❌ Network error: ${err.message}</span>`;
  }
}

// ================================================================
// REGISTERED ACCOUNTS MANAGEMENT
// ================================================================
async function loadAdminUsers() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;
  try {
    const res = await fetch('/api/admin/users');
    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">No registered user accounts yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="font-weight:600;">${u.display_name || '-'}</td>
        <td>${u.email}</td>
        <td>${[u.city, u.country].filter(Boolean).join(', ') || '-'}</td>
        <td>${u.event_count || 0}</td>
        <td>
          <button onclick="deleteAdminUser('${u.id}', '${(u.email || '').replace(/'/g, "\\'")}')" style="background:#7f1d1d; color:#fecaca; border:1px solid #ef4444; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

async function deleteAdminUser(uid, email) {
  if (!confirm(`Permanently delete account "${email}" and all its events/tickets?`)) return;
  try {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showAlert(`Deleted account ${email}`);
      loadAdminUsers();
    } else {
      alert(data.error || 'Failed to delete user.');
    }
  } catch (err) {
    alert('Error deleting user: ' + err.message);
  }
}
