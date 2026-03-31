# Bridge

A desktop task management application for parallel work streams.

## What is Bridge?

Bridge helps you manage multiple tracks of work simultaneously. It's designed for the "parallelization command center" workflow where you need to juggle a main track plus several side tracks.

**Key Features:**
- Track-based task organization (main + side tracks)
- Hierarchical tasks with subtasks
- Task dependencies and automatic status management
- Customizable color themes
- Board view and Active view
- SQLite persistence
- Cross-platform desktop app (Tauri)

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Views

### Board View
Kanban-style columns showing all tracks and their tasks. Main track marked with ★.

### Active View
Grid showing only tasks that are "ready" or "in progress" - your current focus items.

### Settings
Customize all application colors. Changes persist across sessions.

## Task States

- **Blocked** 🔴 - Has incomplete dependencies
- **Ready** 🔵 - Available to start
- **In Progress** 🟢 - Currently working on
- **Done** ✅ - Completed

Tasks automatically advance through states, and the system auto-blocks tasks when their dependencies aren't complete.

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for complete development guide including:
- Architecture details
- CSS variable system
- Database schema
- Adding new features
- Common patterns

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Rust (Tauri)
- **Database:** SQLite
- **Build:** Vite

## Website

The `/website` directory contains a landing page for distributing the app. See [website/README.md](./website/README.md) for deployment instructions to Cloudflare Pages.

## License

Personal project - no license specified.
