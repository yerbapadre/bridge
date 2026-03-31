# Bridge - Development Guide

## Project Overview

Bridge is a task management desktop application built with Tauri, React, TypeScript, and SQLite. It uses a track-based system for managing parallel work streams with hierarchical tasks.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Desktop Framework**: Tauri (Rust backend)
- **Database**: SQLite via Rusqlite
- **Styling**: Tailwind CSS + Custom CSS Variables

## Architecture

### Data Model

```
Project (1) ──> (N) Track ──> (N) Task
                                 │
                                 └──> (N) Subtask (depth: 1-2)

TaskDependency: Task blocks → Task
```

#### Project
- Container for related tracks
- Fields: id, name, description, color, position, timestamps

#### Track
- Main workflow stream (only one) or side tracks (multiple)
- Types: "main" | "side"
- Fields: id, project_id, name, type, color, position, timestamps

#### Task
- Work item with hierarchical structure (max depth: 2)
- Statuses: "blocked" | "ready" | "in_progress" | "done"
- Fields: id, track_id, title, description, status, position, parent_task_id, depth, timestamps
- Status transitions: blocked → ready → in_progress → done

#### Task Dependencies
- One task can block another task
- Automatic status updates: if task has incomplete dependencies, auto-set to "blocked"

### Rust Backend (`src-tauri/`)

**Key Files:**
- `src/main.rs` - Tauri commands and app setup
- `src/db.rs` - Database logic, migrations, CRUD operations
- `Cargo.toml` - Rust dependencies

**Database Location:**
- App data dir: `~/.local/share/com.bridge.app/` (Linux)
- Files: `bridge.db` (SQLite) and `preferences.json` (user prefs)

**Tauri Commands:**
All database operations are exposed via Tauri commands:
- Projects: `create_project`, `get_projects`, `update_project`, `delete_project`
- Tracks: `create_track`, `get_tracks`, `update_track`, `delete_track`
- Tasks: `create_task`, `get_tasks`, `update_task`, `delete_task`
- Dependencies: `add_dependency`, `get_dependencies`, `remove_dependency`
- Auto-update: `auto_update_task_statuses` (runs after task updates)
- Preferences: `get_preferences`, `save_preferences_command`

### Frontend (`src/`)

**Key Files:**
- `src/App.tsx` - Main application component (1143 lines)
- `src/index.css` - CSS variables and Tailwind utilities
- `src/main.tsx` - React entry point

**Component Structure:**
```
App
├── Sidebar (collapsible)
│   ├── Projects list
│   └── Settings button
└── Main Content Area
    ├── Board View (TrackColumn components)
    ├── Active View (ActiveView component)
    └── Settings (SettingsView component)
```

## CSS Variable System

**CRITICAL**: All colors use CSS variables defined in `src/index.css`. Never use hardcoded Tailwind colors.

### Color Categories

**Status Colors** (RGB format):
```css
--color-status-blocked: 220 38 38       /* Urgent Red */
--color-status-ready: 79 70 229         /* Indigo Blue */
--color-status-in-progress: 20 158 158  /* Bright Cyan/Teal */
--color-status-done: 28 133 31          /* Forest Green */
```

**Background Colors**:
```css
--color-bg-primary: 247 249 251        /* Main Page */
--color-bg-secondary: 240 242 245      /* Content Area */
--color-bg-tertiary: 255 255 255       /* Cards/Tracks */
--color-bg-quaternary: 226 232 240     /* Elements */
```

**Text Colors**:
```css
--color-text-primary: 42 44 48         /* Headings */
--color-text-secondary: 74 82 92       /* Body */
--color-text-tertiary: 107 114 128     /* Labels */
--color-text-quaternary: 156 163 175   /* Disabled */
```

**UI Element Colors**:
```css
--color-sidebar-bg: 23 23 27
--color-sidebar-border: 55 65 81
--color-input-bg: 31 41 55
--color-input-border: 75 85 99
--color-button-secondary: 31 41 55
--color-task-card-border: 229 231 235
```

**Accent Colors**:
```css
--color-accent-primary: 20 122 122     /* Primary Action */
--color-accent-hover: 13 93 93         /* Hover State */
--color-accent-star: 245 158 11        /* Main Track Star */
```

### Using CSS Variables

Variables are in RGB format. Use like this:
```tsx
// Background
className="bg-sidebar"              // → background-color: rgb(23 23 27)

// Text
className="text-primary"            // → color: rgb(42 44 48)

// Border
className="border-sidebar"          // → border-color: rgb(55 65 81)

// Status borders (with glow effect)
className="border-status-ready"     // → bottom border + box-shadow
```

### Customization

Users can customize all colors via Settings page. Colors persist in `preferences.json` and are loaded on app start.

## Layout System

**Fixed Sidebar + Scrollable Content:**
```tsx
<div className="h-screen flex overflow-hidden">
  <div className="flex-shrink-0 h-full">Sidebar</div>
  <div className="flex-1 overflow-y-auto h-full">Main Content</div>
</div>
```

**Key Points:**
- Root container: `h-screen flex overflow-hidden`
- Sidebar: `flex-shrink-0` prevents it from being squeezed
- Main content: `overflow-y-auto` for scrolling
- Never use `min-h-screen` on root when you want fixed sidebar

## Key Features

### 1. Collapsible Sidebar
- Toggle button collapses sidebar from 320px to 64px
- Icons center and enlarge when collapsed
- Settings button always sticks to bottom
- Project list hidden when collapsed

### 2. Views
- **Board View**: Kanban-style columns for each track
- **Active View**: Grid of tasks that are "ready" or "in_progress"
- **Settings**: Color customization interface

### 3. Task Management
- Click `→` button to advance task status
- Three-dot menu for status change or delete
- Subtasks (max 2 levels deep)
- Collapsible task tree
- Status-colored bottom borders with glow effects

### 4. Track Types
- **Main Track**: Marked with ★, only one per project, cannot be deleted
- **Side Tracks**: Multiple allowed, can be deleted
- Max 8 tracks total per project

### 5. Task Card Borders
```tsx
// Pattern: gray borders on top/left/right, colored bottom border
className="border-t border-l border-r border-task-card border-b-4 border-status-ready"
```

The status classes use `border-bottom-color` with `!important` to override.

## State Management

All state is in `App.tsx` using React useState:
- `projects`, `currentProjectId`
- `tracks`, `tasks`, `dependencies`
- `sidebarCollapsed`, `projectsExpanded`
- `currentView`: "board" | "active" | "settings"
- `collapsedTasks`: Set<string> for task tree state
- `selectedTrackId`, `selectedParentTaskId`: for inline task creation

## Common Patterns

### Loading Data
```tsx
const loadData = async () => {
  const data = await invoke<Type>("command_name", { param: value });
  setState(data);
};
```

### Creating Items
```tsx
const create = async () => {
  await invoke("create_command", {
    input: { field1, field2 }
  });
  loadData(); // Refresh
};
```

### Status Updates
```tsx
await invoke("update_task", { id, input: { status: newStatus } });
await invoke("auto_update_task_statuses"); // Critical: runs dependency logic
loadData();
```

## Development Workflow

```bash
# Install dependencies
npm install

# Run dev server (starts Rust backend + Vite frontend)
npm run tauri dev

# Build for production
npm run tauri build
```

## Database Migrations

Migrations are in `src-tauri/src/db.rs` in the `run_migrations()` function. To add a new migration:

1. Add SQL in `run_migrations()`
2. Increment version check
3. Test on clean database

## Adding New Features

### Adding a New Field to Tasks

1. **Database**: Update schema in `db.rs` migrations
2. **Rust**: Update `Task` struct and SQL queries
3. **TypeScript**: Update `Task` interface in `App.tsx`
4. **UI**: Add field to forms and display

### Adding a New Color Variable

1. Add to `:root` in `src/index.css`
2. Add utility class in `@layer utilities`
3. Add to `ColorPreferences` interface
4. Add to Settings page color inputs
5. Add to preference loading/saving logic

### Adding a New View

1. Create component function in `App.tsx`
2. Add to `currentView` type union
3. Add navigation button
4. Add conditional render in main content area

## Known Limitations

- Max 8 tracks per project
- Max 2 levels of task nesting (parent → child → grandchild)
- SQLite is single-file, no multi-user support
- No undo/redo functionality

## File Structure

```
bridge/
├── src/                    # React frontend
│   ├── App.tsx            # Main component (all UI logic)
│   ├── index.css          # CSS variables + Tailwind
│   └── main.tsx           # React entry
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Tauri commands
│   │   └── db.rs          # Database logic
│   ├── icons/             # App icons
│   ├── Cargo.toml         # Rust deps
│   └── tauri.conf.json    # Tauri config
├── package.json           # Node deps
└── tailwind.config.js     # Tailwind config
```

## Debugging Tips

### Frontend Errors
- Check browser devtools console (Cmd+Opt+I in dev mode)
- Vite HMR errors show in terminal and browser

### Backend Errors
- Check terminal output where `npm run tauri dev` is running
- Rust panics will crash the app

### Database Issues
- Database location: Check Tauri app data dir for your OS
- Reset DB: Delete `bridge.db` file and restart app
- Check SQL syntax in `db.rs`

### Syntax Errors
- Missing braces: Look for arrow functions `() => {}` missing closing `}`
- React: Every `<Component>` needs `</Component>`
- TSX: JavaScript expressions need `{}`

## Next Steps / TODO

Potential features to add:
- [ ] Drag-and-drop task reordering
- [ ] Task search/filter
- [ ] Due dates and reminders
- [ ] Task notes/comments
- [ ] Export to JSON/CSV
- [ ] Dark mode toggle (currently light mode only)
- [ ] Keyboard shortcuts
- [ ] Multi-project dashboard
- [ ] Task time tracking
- [ ] Undo/redo stack

## Important Notes

1. **Always run `auto_update_task_statuses` after task updates** - this maintains dependency logic
2. **Never hardcode colors** - always use CSS variables
3. **Sidebar must be `flex-shrink-0`** - or it will get squeezed
4. **Status borders use `border-bottom-color`** - not `border-color`, with `!important`
5. **Preferences persist** - stored in `preferences.json`, loaded on startup
6. **Main track is special** - can't be deleted, marked with ★

## Contact

For questions or issues, refer to the git history or check the original implementation in `App.tsx` and `db.rs` for patterns.
