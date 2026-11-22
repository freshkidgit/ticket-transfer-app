# Ticketmaster Mobile Ticket & Transfer Web App

A complete, pixel-perfect recreation of the Ticketmaster mobile web ticket interface and multi-step transfer flow, backed by a persistent SQLite database and interactive Admin Dashboard.

## Features

- **Pixel-Perfect Ticketmaster Mobile UI**:
  - Top navigation bar with close "✕", "My Tickets", "Help", and "MY TICKETS" / "ADD-ONS" tabs.
  - Interactive ticket card carousel with touch swipe, mouse drag, and pagination dots.
  - "Verified Fan Onsale" header with section, row, and tier details.
  - Artist hero banner with gradient overlay, artist name, date, time, and venue.
  - **Live Countdown Timer**: Real-time ticking countdown (`DAY`, `HOUR`, `MIN`, `SECONDS`) down to the ticket availability timestamp.
  - **SafeTix™ Barcode & Ticket Details**: Animated moving blue laser scanner barcode, order number, and price breakdown.
  - **Action Buttons**: "Transfer" and "Sell".
  - **Venue Map**: Bottom location map card showing Arrow venue in Allentown, PA with directions link.
  - **Device Frame Toggle**: Switch between an iPhone mockup frame and full responsive view with one click.

- **Complete Multi-Step Transfer Flow (Matching Video)**:
  1. **Step 1 - Select Tickets to Transfer**: Safety notice, seat selection cards with blue toggle circles, dynamic "X Selected" counter, and active "TRANSFER TO >" button.
  2. **Step 2 - Transfer To Method**: "Select From Contacts" or "Manually Enter A Recipient" with paper plane illustration.
  3. **Step 3 - Recipient Form**: Inputs for First Name, Last Name, Email or Mobile Number, Note, and "TRANSFER X TICKETS" submit button.
  4. **Step 4 - Processing State**: Animated transfer spinner.
  5. **Step 5 - Transfer Sent Confirmation**: Success checkmark, recipient details, transferred seat summary, and status.
  - Transferred tickets update in real time in the database and display a "Transfer Pending to [Name]" banner on the ticket card with a one-click "Cancel Transfer" option.

- **Persistent SQLite Database (`tickets.db`)**:
  - `events`: Stores artist name, venue, city, date, countdown target, ticket prices, fees, order number, images.
  - `tickets`: Stores each individual ticket/seat, section, row, barcode, status (`active`, `transfer_pending`), and recipient info.
  - `transfers`: Stores full audit logs of transfers with timestamps, contact details, and notes.

- **Live Database Admin & Settings Manager (`/admin.html`)**:
  - Live edit artist name, venue, city, dates, prices, fees, order number, and images.
  - Live edit countdown target date & time with an interactive picker.
  - Dynamic ticket inventory sizing (change total tickets in order from 1 to 8).
  - One-click presets: *Conan Gray (Original Video)*, *Taylor Swift (The Eras Tour)*, *Billie Eilish*, *Drake*.
  - Live database inventory table with status indicators and transfer cancellation.
  - Full transfer history log table.
  - One-click "Reset Tickets" button.

## Quick Start

1. Start the server:
   ```bash
   node server.js
   ```

2. Open in your browser:
   - **Ticket Web App**: [http://localhost:3000](http://localhost:3000)
   - **Admin / Database Manager**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

3. API Endpoints:
   - `GET /api/event`: Fetch event information and countdown target.
   - `PUT /api/event`: Update event details, prices, venue, or countdown.
   - `GET /api/tickets`: Fetch all tickets and current statuses.
   - `POST /api/transfer`: Transfer selected tickets to a recipient.
   - `POST /api/transfer/cancel`: Cancel a pending transfer.
   - `POST /api/reset`: Reset all tickets to active and clear transfer logs.
   - `POST /api/tickets/update-count`: Resize the ticket order (1-8 tickets).
   - `GET /api/transfers`: View transfer history.
