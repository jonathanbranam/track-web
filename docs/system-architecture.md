# System Architecture

## Interaction Methods
Users can interact with the system in multiple ways:
- **Direct markdown editing** — edit files in any text editor (Obsidian, VS Code, etc.)
- **Web app** — browser interface with responsive mobile PWA version
- **CLI** — command-line interface, designed to work with AI agents (Claude) for bulk operations
- **AI-assisted** — Claude or other AI agents can make large-scale changes via CLI

## Primary Data Store
- **Format**: Markdown files (source of truth)
- **Backend**: Git-backed storage (GitHub or any remote Git repository)
- **Change tracking**: JSON structured format logs (timestamps, hashes, edit history) for app/CLI changes
- **File system awareness**: System detects external file edits via timestamps and file hashes to incorporate changes from any source

## File Organization: P-P-A-R-A

The system follows a modified version of Tiago Forte's P-A-R-A method:

```
Plans/
├── Values/                 (life goals, core values, foundational beliefs)
├── Annual/
├── Quarterly/
├── Weekly/
└── Daily/

Projects/                   (short-lived efforts, may span multiple files)
Areas/                      (long-term areas of responsibility)
Resources/                  (materials, references, templates needed for work)
Archives/                   (completed projects, obsolete resources, inactive areas)
```

### Plans Section
The Plans section contains the multi-level planning hierarchy:
- **Values** — life goals, core values, and foundational beliefs
- **Annual** — yearly objectives and themes
- **Quarterly** — 3-month focused initiatives
- **Weekly** — week-level priorities and goals
- **Daily** — day-specific tasks, focus, and end-of-day reflection

### Projects Section
Short-lived efforts with defined endpoints. Each project may span one or multiple markdown files.

### Areas Section
Long-term areas of responsibility. User-defined and mostly freeform structure.

### Resources Section
Materials, references, templates, and resources needed to support work across plans, projects, and areas.

### Archives Section
Completed projects, out-of-date resources, and areas no longer active.

---

**Status**: Overall structure outlined. Detailed file naming and nesting conventions pending.
