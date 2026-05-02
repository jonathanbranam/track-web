# MVP Scope

## Vision
A markdown-native weekly and daily planning system that helps users organize their week, plan their day, track habits, and manage tasks from multiple sources (inbox, projects, areas, recurring tasks).

## In Scope for MVP

### 1. Weekly Planning
- [ ] View week layout with days and time slots
- [ ] Schedule tasks and events for specific days
- [ ] Display wake-up and sleep times
- [ ] Show all habits due that week
- [ ] Show all recurring reminders due that week
- [ ] Time-block tasks with duration estimates
- [ ] Account for transition time between activities
- [ ] Edit/add/remove tasks and habits from week view

### 2. Daily Planning
- [ ] View single day with time blocks
- [ ] Show tasks scheduled for that day
- [ ] Show habits due that day (with "add to plan" option if not scheduled)
- [ ] Show recurring reminders due that day
- [ ] Display wake-up and sleep times
- [ ] Time-block activities with durations
- [ ] Quick-add tasks from inbox to daily plan
- [ ] Mark tasks/habits complete
- [ ] Show unscheduled but ready-to-work tasks

### 3. Task System
- [ ] Task inbox for quick-capture tasks
- [ ] Task data model: description (required), due date, start date, time estimate, tags, context, project, area (all optional)
- [ ] Rapid triage UI for processing inbox
- [ ] Assign tasks to projects or areas
- [ ] Tag system for custom task contexts
- [ ] Task completion tracking
- [ ] Recurring task types: fixed-day, flexible-window, seasonal

### 4. Habits (Basic)
- [ ] Define habits with frequency (daily, weekdays, weekends, multiple times/week, weekly, custom)
- [ ] Track habit completion (simple: complete/not complete per day)
- [ ] Show habit reminders in weekly/weekly/daily planning
- [ ] Smart reminders: don't show if activity already scheduled
- [ ] Show overdue alerts with elapsed time
- [ ] Last completion date tracking

### 5. Projects
- [ ] Create and organize projects
- [ ] Associate tasks with projects
- [ ] Simple project planning (name, description, associated tasks)
- [ ] Archive completed projects

### 6. Areas
- [ ] Create and organize areas of responsibility
- [ ] Associate tasks with areas
- [ ] View tasks by area
- [ ] Freeform area organization

### 7. Recurring Reminders & Tasks
- [ ] Fixed-day recurring tasks (e.g., every Saturday)
- [ ] Flexible-window recurring tasks (e.g., every 6 months, show in window)
- [ ] Track completion of recurring tasks
- [ ] Show overdue status with elapsed time
- [ ] Display in weekly and daily planning views

### 8. File Organization
- [ ] P-P-A-R-A structure: Plans/Weekly, Plans/Daily, Projects/, Areas/
- [ ] Markdown files as source of truth
- [ ] Git-backed storage (GitHub or any Git repo)
- [ ] File naming conventions TBD
- [ ] Change log in JSON format for edits via UI/CLI

### 9. Interfaces
- [ ] Web app (React, responsive design)
- [ ] Mobile PWA version (same web app)
- [ ] CLI (basic operations: view, create, update, complete)
- [ ] Direct markdown editing (system detects and incorporates changes)

### 10. Data Persistence & Sync
- [ ] Markdown file storage
- [ ] Git-based version control
- [ ] Change tracking (JSON logs with timestamp, hash, source)
- [ ] Detect external file edits (timestamp/hash comparison)
- [ ] Sync UI changes back to markdown files
- [ ] Basic conflict resolution for concurrent edits

## Out of Scope for MVP

- ❌ Values/Life Goals documents
- ❌ Annual plans
- ❌ Quarterly plans
- ❌ End-of-day reflection (Marshall Goldsmith style)
- ❌ Calendar integration / two-way sync
- ❌ Inventory tracking
- ❌ Charts/analytics on habits or time allocation
- ❌ AI agent skills (local or API)
- ❌ Advanced analytics and insights
- ❌ Work/personal planning separation
- ❌ Streak tracking (basic completion only)
- ❌ Advanced time-blocking analytics

## Success Criteria for MVP

- User can create a weekly plan in <15 minutes
- User can create a daily plan in <10 minutes
- Tasks can be captured, triaged, and scheduled quickly
- Habits show appropriate reminders without spam
- Recurring tasks surface correctly based on frequency
- Data persists correctly in markdown + Git
- System works offline and syncs when reconnected
- Multiple interface types (web, CLI, direct edit) keep data consistent

---

**Document Status**: MVP scope defined. Technical implementation details pending.
