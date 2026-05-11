# Calendar Integration Research

## Overview

This document explores technical approaches for integrating calendar functionality into the time tracking application. The goal is to support reading and writing calendar events across multiple calendar services while avoiding vendor lock-in.

## Use Case

- Read personal and shared calendars (e.g., family calendar)
- Write time entries as calendar events
- Use calendar context to inform scheduling decisions

## Requirements Analysis

### Core Capabilities Needed
- ✓ Read calendar events
- ✓ Write calendar events
- ✓ Create recurring events
- ✓ Parse and understand recurring events
- ✓ Support alerts and reminders on events

## Standards & Protocols Overview

### RFC 5545 (iCalendar Format)
**Text-based calendar data format (`.ics` files)**

| Capability | Status | Notes |
|---|---|---|
| Read events | ✓ | Parse iCalendar text |
| Write events | ✓ | Generate iCalendar text |
| Recurring events | ✓ | RRULE/RDATE support |
| Parse recurring | ✓ | Requires library (rrule.js) |
| Alerts/Reminders | ✓ | VALARM component |
| Real-time sync | ✗ | Manual only |
| Multi-calendar | ✓ | One per file |

**Best for:** Import/export workflows, feed subscriptions

---

### CalDAV (RFC 4791)
**HTTP-based protocol for calendar operations (built on WebDAV)**

| Capability | Status | Notes |
|---|---|---|
| Read events | ✓ | Full query support via REPORT |
| Write events | ✓ | PUT/POST operations |
| Recurring events | ✓ | Native RRULE support |
| Parse recurring | ✓ | Server handles expansion |
| Alerts/Reminders | ✓ | VALARM in events |
| Real-time sync | ~ | Polling + REPORT queries |
| Multi-calendar | ✓ | Multiple per account |

**Supported by:**
- Nextcloud (self-hosted)
- OwnCloud (self-hosted)
- Apple Calendar / iCloud
- Fastmail, ProtonMail, DuckDuckGo
- Most corporate Exchange (via EWS-to-CalDAV bridges)

**How CalDAV works:**
- HTTP-based protocol (REST-like)
- Endpoints like `https://server.example.com/.well-known/caldav`
- Authentication: HTTP Basic/Digest, OAuth, or certificates
- Operations: `PROPFIND` (list), `REPORT` (search), `PUT` (create), `DELETE` (remove)
- Data format: RFC 5545 iCalendar

**Reading events:**
```xml
POST /.well-known/caldav/principals/user/calendar/ HTTP/1.1
Content-Type: application/xml

<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="20260501T000000Z" end="20260502T000000Z"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>
```
Returns events in iCalendar format.

**Writing events:**
```
PUT /calendar/user/event-id.ics HTTP/1.1
Content-Type: text/calendar

BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your App//NONSGML v1.0//EN
BEGIN:VEVENT
UID:unique-id@yourapp.com
DTSTART:20260502T140000Z
DTEND:20260502T150000Z
SUMMARY:Time Entry: Debugging
DESCRIPTION:Fixed cache issue
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR
```

**Recurring events:**
```
BEGIN:VEVENT
...
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10
DTSTART:20260502T100000Z
...
END:VEVENT
```
Server handles expansion and recurrence logic.

---

### Google Calendar API
**Proprietary REST API with OAuth 2.0**

| Capability | Status | Notes |
|---|---|---|
| Read events | ✓ | Full API support |
| Write events | ✓ | Full API support |
| Recurring events | ✓ | Custom format |
| Parse recurring | ✓ | API handles expansion |
| Alerts/Reminders | ✓ | Email, popup, SMS |
| Real-time sync | ✓ | Webhooks available |
| Multi-calendar | ✓ | Multiple per account |

**Limitations:**
- Vendor lock-in
- Google Calendar read-only CalDAV support (writes don't work)
- Requires OAuth 2.0 setup
- API quotas (1M requests/day free tier)

---

## Technical Implementation Paths

### Path 1: CalDAV Only (Vendor-Neutral)
**Best for: Supporting multiple open-source and commercial services**

**Supported services:**
- Nextcloud, OwnCloud (self-hosted)
- Apple iCloud
- Fastmail, ProtonMail, DuckDuckGo
- Any CalDAV-compliant server

**Advantages:**
- No vendor lock-in
- Single protocol supports all major features
- Works with self-hosted solutions
- iCalendar format is standardized

**Disadvantages:**
- No real-time push notifications (requires polling)
- Some servers have varying CalDAV compliance
- Requires supporting WebDAV/XML queries
- Recurring event handling delegated to server

**Node.js Libraries:**
- `tsdav` — Modern TypeScript CalDAV client, handles authentication and queries
- `caldav` — Older but functional, full WebDAV + CalDAV support
- `davclient.js` — Lightweight WebDAV/CalDAV

**Database Schema:**
```sql
CREATE TABLE calendar_credentials (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,  -- 'caldav'
  server_url TEXT NOT NULL,  -- https://nextcloud.example.com
  username TEXT,
  password_hash TEXT,  -- encrypted
  oauth_token TEXT,  -- if OAuth-based
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE calendar_subscriptions (
  id INTEGER PRIMARY KEY,
  credential_id INTEGER NOT NULL,
  calendar_path TEXT NOT NULL,  -- /.well-known/caldav/.../calendar
  calendar_name TEXT,
  is_writable BOOLEAN,
  created_at TEXT,
  FOREIGN KEY (credential_id) REFERENCES calendar_credentials(id)
);

CREATE TABLE calendar_event_links (
  id INTEGER PRIMARY KEY,
  entry_id INTEGER NOT NULL,
  calendar_subscription_id INTEGER NOT NULL,
  event_uid TEXT NOT NULL,  -- RFC 5545 UID
  event_etag TEXT,  -- For sync/conflict detection
  synced_at TEXT,
  FOREIGN KEY (entry_id) REFERENCES time_entries(id),
  FOREIGN KEY (calendar_subscription_id) REFERENCES calendar_subscriptions(id)
);
```

---

### Path 2: iCalendar Export/Import (Lightweight, One-Way)
**Best for: Simple export and subscription workflows**

**How it works:**
- Export time entries as `.ics` file
- User manually imports into any calendar, or subscribes to `.ics` feed
- Changes don't sync back (one-way)

**Advantages:**
- Minimal backend complexity
- Works with any calendar app
- No authentication needed (just file serving)
- Can be combined with read-only syncing

**Disadvantages:**
- Write is one-way only
- No bidirectional sync
- User must manually sync or subscribe to feed

**Node.js Libraries:**
- `ical.js` — Parse and generate RFC 5545, handles RRULE and VALARM
- `node-ical` — Simple ICS file parsing

**Implementation:**
```typescript
// Generate .ics from time entries
function generateCalendarFeed(entries: TimeEntry[]): string {
  const events = entries.map(entry => {
    return `BEGIN:VEVENT
UID:${entry.id}@yourapp.com
DTSTART:${entry.startedAt}
DTEND:${entry.endedAt}
SUMMARY:${entry.description}
DESCRIPTION:${entry.description}
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Time entry reminder
END:VALARM
END:VEVENT`;
  });

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your App//NONSGML v1.0//EN
${events.join('\n')}
END:VCALENDAR`;
}
```

**Serve as:**
- `/api/calendar/feed.ics` — Static export (user downloads)
- `/calendar/subscribe.ics` — Recurring subscription URL

---

### Path 3: Multi-Provider Architecture (Recommended)
**Best for: Supporting both open-source and commercial services**

**Architecture:**

```
Your Node.js App
    │
    ├─ Calendar Service Layer (abstraction)
    │   ├─ readEvents(from, to)
    │   ├─ writeEvent(event)
    │   ├─ updateEvent(id, event)
    │   └─ deleteEvent(id)
    │
    ├─ CalDAV Provider Implementation
    │   └─ tsdav library
    │
    ├─ Google Calendar Provider Implementation
    │   └─ googleapis library
    │
    └─ iCalendar Export Provider
        └─ ical.js library
```

**Interface definition:**
```typescript
interface CalendarEvent {
  uid?: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  recurrence?: RecurrenceRule;  // RRULE
  alarms?: Alarm[];
}

interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  byDay?: string[];  // MO, TU, WE, etc.
  count?: number;
  until?: Date;
  interval?: number;
}

interface Alarm {
  trigger: string;  // -PT15M format
  action: 'DISPLAY' | 'EMAIL' | 'AUDIO';
  description?: string;
}

interface CalendarProvider {
  readEvents(from: Date, to: Date): Promise<CalendarEvent[]>;
  writeEvent(event: CalendarEvent): Promise<string>;  // returns event ID/UID
  updateEvent(id: string, event: CalendarEvent): Promise<void>;
  deleteEvent(id: string): Promise<void>;
}

class CalDAVProvider implements CalendarProvider { ... }
class GoogleCalendarProvider implements CalendarProvider { ... }
class ICalendarExportProvider implements CalendarProvider { ... }
```

**Advantages:**
- Single codebase supports multiple services
- Easy to add new providers
- Internal format is standardized (iCalendar)
- Can mix providers (read from CalDAV, export as iCal, etc.)

**Disadvantages:**
- More complex implementation
- Each provider has different auth/error handling
- Need to handle provider-specific quirks

---

## Key Technical Challenges

### 1. Recurring Event Expansion
When reading recurring events, you get RRULE strings like:
```
RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20260630
```

You need to **expand** to actual occurrences within a date range.

**Libraries:**
- `rrule.js` — Parse and expand RRULE strings, timezone-aware
- `node-ical` — Includes recurrence logic

**Example:**
```typescript
import { rrulestr } from 'rrule';

const rrule = rrulestr('FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10', {
  dtstart: new Date('2026-05-02')
});
const occurrences = rrule.between(rangeStart, rangeEnd);
```

### 2. Timezone Handling
- Your app stores times in UTC, displays in US/Eastern (4 AM ET day boundary)
- Calendar events may have different timezones
- iCalendar TZID component defines event timezone
- Need careful conversion when reading/writing

**Solution:**
- Store all events in UTC
- Use `date-fns-tz` (already in your stack) for display
- Convert user's local timezone when creating events

### 3. Alerts and Reminders
**iCalendar format:**
```
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
```

**Important:** CalDAV servers store alarms, but **don't guarantee delivery**. The client (calendar app) is responsible.

**If you need in-app reminders:**
- Parse VALARM from events
- Store trigger times in your database
- Cron job checks upcoming events and sends push/email

**Google Calendar API:**
- Full proprietary support for email, popup, SMS reminders
- More reliable delivery

**iCalendar standard:**
- Defines VALARM but no delivery mechanism
- Works if events sync to client that processes alarms (Thunderbird, Apple Calendar, Nextcloud)

### 4. Conflict Resolution
When syncing bidirectionally, conflicts can occur:
- User creates time entry locally while adding calendar event manually
- Calendar event gets deleted but entry remains
- Event modified in both places simultaneously

**Strategies:**
- **Last-write-wins:** Track `synced_at` timestamps, use later version
- **Entry-of-record:** Time entries are authoritative, calendar is derived
- **Manual resolution:** Flag conflicts, let user choose

### 5. Token Management & Persistence
- OAuth tokens expire (access: 1 hour, refresh: long-lived)
- Must store tokens securely in database (encrypted)
- In-memory sessions won't persist across restarts
- Need refresh logic before token expiration

**Schema:**
```sql
CREATE TABLE oauth_tokens (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  provider TEXT,  -- 'google', 'caldav_nextcloud', etc.
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  expires_at TEXT,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Library Recommendations

### For CalDAV
- **`tsdav`** — TypeScript, handles auth (Basic/OAuth), queries, read/write
  - Pros: Modern, type-safe, active maintenance
  - Cons: Larger bundle
  - GitHub: https://github.com/natelindev/tsdav

- **`caldav`** — Lighter, pure WebDAV/CalDAV
  - Pros: Smaller, simple API
  - Cons: Less active maintenance
  - npm: caldav

### For iCalendar Parsing/Generation
- **`ical.js`** — RFC 5545 compliant, handles RRULE, VALARM
  - Pros: Comprehensive, recurrence support
  - Cons: Steeper learning curve
  - GitHub: https://github.com/mozilla-comm/ical.js

- **`node-ical`** — Simple parser
  - Pros: Easy to use
  - Cons: Limited features

### For RRULE Expansion
- **`rrule.js`** — RRULE parser and expander
  - Pros: Standalone, timezone-aware
  - Cons: Separate library to maintain
  - npm: rrule

### For Google Calendar
- **`googleapis`** — Official client library
  - Pros: Complete, well-documented, official support
  - Cons: Handles all Google APIs (larger bundle)
  - npm: googleapis

---

## Recommended Approach: CalDAV + Google Calendar

**Why this hybrid:**
1. CalDAV supports open-source (Nextcloud) and many commercial services
2. Google Calendar API provides real-time features and better recurring event handling
3. Both can use iCalendar as internal format
4. Single abstraction layer can support both

**Implementation roadmap:**
1. **Phase 1:** CalDAV provider (Nextcloud)
   - Handles most open-source + commercial calendars
   - No real-time sync (polling is acceptable)

2. **Phase 2:** Google Calendar provider (optional)
   - Add when real-time push becomes important
   - Supports Google users specifically

3. **Phase 3:** iCalendar export
   - Low-hanging fruit for any service
   - Allows users to manually import/subscribe

**Tech stack:**
- `tsdav` for CalDAV
- `googleapis` for Google Calendar (optional)
- `rrule` for recurring event expansion
- `ical.js` for iCalendar generation
- `date-fns-tz` for timezone handling (already in use)

---

## Open Questions

1. **Real-time sync priority:** Is polling acceptable, or is push/webhook important?
2. **Target services:** Nextcloud first? Google Calendar? Both?
3. **Bidirectional sync:** Do calendar edits update time entries, or one-way only?
4. **Conflict resolution:** How should simultaneous edits be handled?
5. **Recurring event complexity:** Do you need to handle recurrence edits (e.g., "skip this occurrence")?
6. **Alert delivery:** Are in-app reminders needed, or calendar-native only?
