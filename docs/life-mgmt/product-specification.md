# Product Specification

## Vision
A comprehensive, markdown-native solution for life management and planning that helps users align daily actions with long-term values and goals, organize work across projects and areas, and maintain awareness of habits, recurring commitments, and time-blocked schedules.

## Core Problem
Users struggle to connect their daily work and habits to their larger life goals, lack a unified place to manage multi-scale planning and recurring tasks, and need better visibility into how their time is allocated.

## Interaction Methods
Users can interact with the system in multiple ways:
- **Direct markdown editing** — edit files in any text editor (Obsidian, VS Code, etc.)
- **Web app** — browser interface with responsive mobile PWA version
- **CLI** — command-line interface, designed to work with AI agents (Claude, etc.) for bulk operations
- **AI-assisted** — Claude or other AI agents can make large-scale changes via CLI

## Primary Data Store
- **Format**: Markdown files (source of truth)
- **Backend**: Git-backed storage (GitHub or any remote Git repository)
- **Change tracking**: JSON structured format logs (timestamps, hashes, edit history) for app/CLI changes
- **File system awareness**: System detects external file edits via timestamps and file hashes

## File Organization: P-P-A-R-A

Top-level structure follows a modified P-A-R-A method (Tiago Forte):

```
Plans/
├── Values/                 (life goals, core values, foundational beliefs) [Future]
├── Annual/                 (yearly objectives and themes) [Future]
├── Quarterly/              (3-month focused initiatives) [Future]
├── Weekly/                 (week-level planning) [MVP]
└── Daily/                  (day-specific planning, tasks, reflection) [MVP]

Projects/                   (short-lived efforts, may span multiple files) [MVP]
Areas/                      (long-term areas of responsibility) [MVP]
Resources/                  (materials, references, templates) [Future]
Archives/                   (completed projects, obsolete resources) [Future]
```

## Core Features

### 1. Planning Hierarchy

#### Weekly Planning (MVP)
- Plan personal week with schedule, time blocks, habits, and reminders
- Include wake-up and sleep times
- Account for transition time between tasks and events
- View all habits and recurring reminders due that week
- Assign tasks to specific days

#### Daily Planning (MVP)
- View day's schedule, events, and time blocks
- See tasks due that day (from weekly plan, from projects, from inbox)
- See habits due that day (with reminders if not yet scheduled)
- See recurring reminders due that day
- Include wake-up and sleep times with time-blocked activities
- Manually add/remove tasks and habits
- Mark tasks and habits complete

#### Annual Plans (Future)
- Yearly objectives and themes
- Connect to quarterly and weekly planning

#### Quarterly Plans (Future)
- 3-month focused initiatives
- Connect to weekly planning

#### Values/Life Goals (Future)
- Core values and foundational beliefs
- Inform annual plans and reflection questions

### 2. Task System

#### Task Types
1. **Quick-capture tasks** — low context, urgent. Review daily if not completed within few days
2. **Project tasks** — associated with a specific project
3. **Area tasks** — associated with a specific area
4. **Recurring tasks** — scheduled at regular intervals

#### Task Data Model
- **Required**: Text description only
- **Optional fields**:
  - Due date
  - Start date
  - Time estimate (duration)
  - Tags (for project/area associations, custom contexts)
  - Project association
  - Area association
  - Context (at work, at home, at computer, errands, groceries, hardware store, online, custom)

#### Inbox (MVP)
- Centralized location for unassociated quick-capture tasks
- Rapid triage UI/CLI interface to process and categorize tasks
- Move tasks to daily plans, projects, or areas

#### Daily Task List (MVP)
- Show tasks scheduled for today
- Optionally show tasks coming due in next few days
- Show unscheduled items ready to work on
- Allow quick scheduling of inbox items into the day

### 3. Habits (MVP - Basic Version)

#### Habit Definition
- Distinct from tasks; frequency-based recurring commitments
- Optional completion tracking and streaks
- Can be simple (floss daily) or complex (exercise 1 hour on weekends)

#### Habit Properties
- **Frequency**: Daily, weekdays, weekends, multiple times per week, weekly, monthly, custom
- **Completion tracking**: Track exact time/date of completion
- **Optional fields**: Time estimate, notes, category

#### Habit Behavior
- Show as reminder in weekly/daily planning if not yet scheduled
- Smart: if activity already planned (e.g., "run 1 hour Saturday"), don't show reminder
- Show overdue alerts with elapsed time ("You haven't exercised in 4 days")
- Basic tracking: completion count, last completion date

### 4. Recurring Tasks & Reminders (MVP)

#### Recurring Task Types
1. **Fixed-day** (e.g., recycling every Saturday)
   - Appears on same day each week
   - Can add to plan or skip
   
2. **Flexible-window** (e.g., furnace filter every 6 months)
   - Shows when due window approaches
   - User chooses which day to complete
   
3. **Seasonal** (e.g., garden prep in spring)
   - Surfaces during planning sessions
   - Often becomes a project with subtasks

#### Reminders (MVP)
- Show in daily/weekly planning when due
- Track last completion
- Show overdue status with elapsed time
- Example: "Furnace filter was due January 1st—3 weeks overdue"

### 5. Projects (MVP)

#### Project Definition
- Short-lived efforts with defined endpoints
- May span one or multiple markdown files
- Associated with tasks and reminders

#### Project Planning (Future Enhancement)
- Project planning documents with timeline, milestones, important dates
- Dates surface as reminders and tasks
- Example: House remodel with key milestone dates

#### Project Organization
- Live in Projects/ folder
- Can have associated task lists
- Can be tagged/categorized

### 6. Areas (MVP)

#### Area Definition
- Long-term areas of responsibility
- User-defined and mostly freeform structure
- Persistent context for ongoing work

#### Area Organization
- Live in Areas/ folder
- Can contain projects and recurring tasks
- Support notes and planning documents

### 7. Time Blocking & Scheduling

#### Features
- Weekly and daily time blocks for tasks, habits, events
- Account for wake-up and sleep times
- Include transition time between activities
- Visual representation of available time

#### Integration
- Show conflicts between scheduled items and time blocks
- Suggest time blocks based on task duration estimates
- Enable drag-and-drop rescheduling in UI

### 8. End-of-Day Reflection (Future)

#### Structure (Marshall Goldsmith's "Triggers" Method)
- Questions phrased as "Did I do my best today to [blank]?"
- Scale: 0-10 rating
- Optional comments space
- Optional journaling

#### Tracking
- Questions evolve over time (user-managed)
- Full history tracked
- Charts show progress over time

#### Connection to Values
- User defines relationship between reflection questions and values
- System can suggest generating questions from life goals/values
- AI agent can assist in developing reflection questions

### 9. Inventory Tracking (Future)

#### Capability
- Track quantities of items (furnace filters by size, groceries, supplies)
- Mark items as used
- Auto-trigger reorder reminders at threshold
- Applies to home maintenance and groceries

### 10. Calendar Integration (Future)

- Two-way sync with external calendars
- Display calendar events alongside tasks and habits in planning views
- Import schedule for work/personal calendar separation

### 11. AI Agent Skills (Future)

#### Integration
- Optional AI agent skills throughout planning process
- Skills installed locally in repo or parallel structure
- Compose and chain skills for complex operations
- Examples:
  - Generate reflection questions from values
  - Suggest weekly priorities based on goals
  - Analyze time allocation and suggest optimizations
  - Auto-generate project plans from descriptions

#### Future Enhancement
- Direct API integration with agents (beyond local CLI skills)

## Data Structure

### File Format
- Markdown files as source of truth
- JSON change logs for tracking edits (timestamps, hashes, edit type, user/interface)
- Git history for version control

### Relationships
- Tasks reference projects/areas via tags
- Weekly plans reference daily plans
- Habits embedded in weekly/daily views
- Recurring tasks surface in planning views based on frequency

## Change Tracking

### Edits Made Through UI/CLI
- JSON log with:
  - Timestamp
  - File path
  - Change type (create, update, delete, complete)
  - Content hash (before/after)
  - Source (web, CLI, AI agent, manual edit)
  
### External File Changes
- Detect changes via file timestamps and hashes
- Surface as "external edits" in change history
- Allow user to review and merge changes

## Success Metrics (Future)

- User completes weekly planning regularly
- Daily planning takes <10 minutes
- Task completion rate visible and trackable
- Habit streaks and completion visible
- Time-block accuracy (actual vs. planned)

---

**Document Status**: Complete specification including MVP and future features. Open questions in separate document.
