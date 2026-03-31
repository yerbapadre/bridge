# Bridge

Task manager for juggling multiple work streams at once.

Built for the "parallelization command center" workflow — one main track plus several side tracks running in parallel.

- Track-based organization
- Tasks with subtasks
- Dependencies that auto-block downstream work
- Board view (all tracks) and Active view (current focus)
- Terminal session linking (Ghostty integration)
- Theme customization
- Desktop app via Tauri + SQLite

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

**Board** — Kanban columns for all tracks. Main track has a ★.

**Active** — Just the tasks you can work on right now (ready or in progress).

**Settings** — Change colors. Persists across sessions.

## Task States

- **Blocked** 🔴 — dependencies aren't done yet
- **Ready** 🔵 — can start now
- **In Progress** 🟢 — working on it
- **Done** ✅ — finished

Tasks auto-block when their dependencies aren't complete.

## Terminal Integration

Link Ghostty terminal sessions to tasks. When you're juggling multiple terminals across different work streams, this lets you:

- Associate terminals with specific tasks
- Instantly focus the right terminal when switching contexts
- See which terminals are linked to each task

Click the link icon on a task to associate a terminal. Click the terminal icon to focus it. Uses Ghostty's native AppleScript API (no accessibility permissions needed).

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for architecture, database schema, and how to add features.

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Rust (Tauri)
- **Database:** SQLite
- **Build:** Vite

## Website

`/website` has a landing page for distribution. Deploys to Cloudflare Pages — see [website/README.md](./website/README.md).

## License

Personal project. No license.
