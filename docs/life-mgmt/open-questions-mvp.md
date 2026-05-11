# Open Questions — MVP Phase

Questions that need clarification before or during MVP implementation. Organized by area.

## File Organization & Structure

- [ ] What is the exact file naming convention for weekly plans? (e.g., `2026-W18.md`, `week-18.md`, `2026-05-02-to-05-08.md`)
- [ ] What is the exact file naming convention for daily plans? (e.g., `2026-05-02.md`, `friday.md`, `2026-05-02-friday.md`)
- [ ] How are projects organized? One file per project, or multiple projects per file?
- [ ] How are areas organized? One file per area, or grouped by theme?
- [ ] Should there be an Inbox file or folder? Single `Inbox.md` or `Tasks/inbox.md`?
- [ ] How should the markdown structure look for weekly/daily plans? (Sections, lists, tables, free-form?)
- [ ] Should projects and areas have templates?

## Task System

- [ ] How are project and area associations encoded in markdown? (Tags, YAML frontmatter, links?)
- [ ] How are task contexts (at work, at home, at computer, etc.) encoded and filtered?
- [ ] Should tasks have priority levels (high/medium/low)?
- [ ] How are completed tasks removed/archived from daily/weekly views?
- [ ] Should task metadata be stored in task description or separate YAML/JSON?

## Habits

- [ ] How should habit frequency be encoded? (YAML, inline text, structured format?)
- [ ] How is habit completion tracked? (Daily checkbox, timestamp, separate log?)
- [ ] How should the system know if a habit is "already scheduled"? (Tag check, time-block match?)
- [ ] Should basic MVP include habit streak tracking?
- [ ] How are habit reminders surfaced in daily/weekly views?

## Recurring Tasks & Reminders

- [ ] How are recurring task rules encoded? (Cron-like syntax, natural language, structured format?)
- [ ] How is the "due window" for flexible-window tasks calculated?
- [ ] How is elapsed time tracked and displayed for overdue items?
- [ ] Should seasonal recurring tasks have a start/end month range?

## Time Blocking

- [ ] What time-block granularity? (15 min, 30 min, 1 hour, free-form?)
- [ ] How are time blocks represented in markdown? (Tables, YAML, text blocks?)
- [ ] Should the system calculate available time automatically?
- [ ] How should wake/sleep times be handled? (Single entry, time block, habit?)
- [ ] How are transitions handled? (Explicit time block, duration padding, assumption?)

## Data Model & Storage

- [ ] Should the change log be one file per day, one file per week, or one global file?
- [ ] What information goes in the change log? (timestamp, file path, change type, hash, source, user, diff?)
- [ ] How are Git commits created? (One per change, batched daily, manual?)
- [ ] Should the system commit automatically or require user action?
- [ ] How should conflict resolution work if the same file is edited externally and via UI simultaneously?

## Web App UI/UX

- [ ] What calendar/grid visualization for weekly and daily views?
- [ ] How should time blocks be displayed? (Gantt chart, calendar grid, list view?)
- [ ] How should habit reminders be surfaced? (Banner, sidebar, popup, section?)
- [ ] Should there be a "quick add" button for tasks, and where?
- [ ] How should the daily view transition to the next day? (Manual refresh, automatic, time-based?)

## CLI Design

- [ ] What commands are needed for MVP? (view-week, view-day, add-task, complete-task, add-habit, etc.)
- [ ] What format should CLI output use? (YAML, JSON, markdown, human-readable text?)
- [ ] Should the CLI support piping and shell composition?
- [ ] How should the CLI handle interactive prompts vs. flags?

## Interfaces & Sync

- [ ] How does the system detect that external markdown files have been edited?
- [ ] What happens if a file is edited externally while the web app is also editing it?
- [ ] Should the web app periodically check for external changes?
- [ ] How should users be notified of conflicts?
- [ ] Should the system support multiple users editing the same repo? (MVP: assume single user)

## Performance & Scaling

- [ ] How many tasks/habits can the system handle before performance degrades?
- [ ] Should archived/completed items be removed from active files to keep them small?
- [ ] How should the system scale if a user has years of history?

## Localization & Timezones

- [ ] Should the MVP support timezones other than the user's local?
- [ ] What date/time formats should be used in markdown files and UI?
- [ ] Should week start on Monday or Sunday?

## Accessibility & User Experience

- [ ] Should the MVP include keyboard shortcuts?
- [ ] Should there be an "undo" feature?
- [ ] How should the MVP handle daylight saving time changes?
- [ ] Should there be notifications/reminders for due tasks and habits?

---

**Total Questions**: 45  
**Status**: Open for discussion during MVP design and implementation.
