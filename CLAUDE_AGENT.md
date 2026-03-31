# Claude Code Agent Guide - Bridge

**Read this FIRST when entering the codebase blind.**

This document is optimized for AI agents. It tells you EXACTLY where code is and what to modify for common tasks.

---

## 🚨 CRITICAL RULES - Read Before Any Changes

### Rule 1: CSS Variables ONLY
```tsx
❌ NEVER: className="bg-gray-800 text-blue-500"
✅ ALWAYS: className="bg-sidebar text-accent"
```
All colors use CSS variables defined in `src/index.css`. No exceptions.

### Rule 2: Status Update Pattern
```tsx
❌ NEVER:
await invoke("update_task", { id, input: { status: "done" } });
loadData();

✅ ALWAYS:
await invoke("update_task", { id, input: { status: "done" } });
await invoke("auto_update_task_statuses");  // THIS IS CRITICAL
loadData();
```
Skip `auto_update_task_statuses` and dependencies will break.

### Rule 3: Sidebar Layout
```tsx
❌ NEVER: <div className="min-h-screen flex">
✅ ALWAYS: <div className="h-screen flex overflow-hidden">
           <div className="flex-shrink-0 h-full">Sidebar</div>
           <div className="flex-1 overflow-y-auto h-full">Content</div>
```

### Rule 4: Task Card Borders
```tsx
❌ NEVER: className="border border-task-card border-status-ready"
✅ ALWAYS: className="border-t border-l border-r border-task-card border-b-4 border-status-ready"
```
Gray on 3 sides, colored bottom. Status classes use `border-bottom-color` with `!important`.

### Rule 5: Arrow Function Syntax
```tsx
❌ WRONG (causes "Unexpected token" error):
const renderTaskCard = (task: Task) => {
  return (
    <div>...</div>
  );
  // Missing closing brace for function!

✅ CORRECT:
const renderTaskCard = (task: Task) => {
  return (
    <div>...</div>
  );
};  // Note the }; closing the arrow function
```

---

## 📍 Code Location Map

### src/App.tsx (1143 lines total)

**Type Definitions (Lines 1-69)**
```
4-12:   Project interface
14-23:  Track interface
25-37:  Task interface
39-44:  TaskDependency interface
46-64:  ColorPreferences interface
66-68:  UserPreferences interface
```

**Main App Component (Lines 70-581)**
```
71-86:   State declarations (projects, tracks, tasks, UI state)
88-99:   loadProjects() - fetches all projects
101-127: loadAndApplyPreferences() - loads colors from backend
129-145: loadData() - fetches tracks/tasks/deps for current project
147-156: useEffect hooks - initial data load
158-177: createProject() - adds new project
179-199: createTrack() - adds track (auto-determines main/side)
201-220: createTask() - adds task or subtask
222-232: toggleTaskCollapsed() - tree expand/collapse
234-247: getNextStatus() - status transition logic
249-254: advanceTaskStatus() - advance to next status
256-267: updateTaskStatus() - set specific status + auto-update
269-276: deleteTask()
278-286: deleteTrack() - with confirmation
288-292: getTasksForTrack() - top-level tasks only
294-298: getSubtasks() - children of parent
300-302: hasSubtasks() - check for children
304-315: getStatusBorderColor() - IMPORTANT: returns CSS class name
317-328: getStatusText() - human-readable status
334-580: JSX render - sidebar + main content area
```

**Sidebar Structure (Lines 337-444)**
```
337-350: Header with collapse button
352-428: Projects section (collapsible list)
430-443: Settings button (sticks to bottom)
```

**Main Content Area (Lines 446-578)**
```
447-455: Page title/description
458-479: View tabs (Board/Active)
482-486: Error display
488-577: View switching (Settings/Board/Active)
```

**SettingsView Component (Lines 583-759)**
```
586-604: Color state initialization
606-618: Load preferences on mount
620-638: applyCSSColors() - updates CSS variables
640-656: updateColor() - saves color to backend
658-672: Conversion helpers (RGB ↔ Hex)
674-693: ColorInput component
695-759: Render (color sections + auto-save notice)
```

**ActiveView Component (Lines 761-856)**
```
770-777: Props interface
779-783: Filter active tasks (ready + in_progress)
785-787: getTrackName() helper
789-821: renderTaskCard() - CRITICAL: arrow function, must close with };
822-855: Render (grouped by in_progress and ready)
```

**TrackColumn Component (Lines 858-1142)**
```
858-878: Props interface
880-900: Component declaration + props destructuring
901-913: Menu state + click-outside handler
915-1070: renderTask() - RECURSIVE function for tree rendering
  924:     marginClass - indentation based on depth
  926-930: Outer task card with status border
  931-947: Task content (title, description, collapse button)
  948-1008: Three-dot menu (status submenu, delete)
  1010-1038: Action buttons (advance, add subtask)
  1040-1064: Subtask input (conditional render)
  1067:    Recursive call for subtasks
1072-1142: JSX render (track header + task list + add button)
```

### src/index.css

**CSS Variables (Lines 5-46)**
```
6-10:   Status colors (blocked, ready, in_progress, done)
12-16:  Background colors (primary, secondary, tertiary, quaternary)
18-22:  Text colors (primary, secondary, tertiary, quaternary)
24-26:  Border colors (primary, secondary)
28-31:  Accent colors (primary, hover, star)
33-45:  UI element colors (sidebar, inputs, buttons, etc.)
```

**Utility Classes (Lines 53-191)**
```
54-70:  Status border classes with glow (border-status-*)
72-78:  Status backgrounds and text
80-99:  Accent colors with glow effects
101-113: Section header colors
115-131: Track and task card colors
133-176: UI element utilities (sidebar, inputs, buttons, etc.)
178-191: Text color utilities
```

### src-tauri/src/main.rs

**Tauri Commands**
```
16-22:  create_track
24-27:  get_tracks
29-37:  update_track
39-42:  delete_track
44-50:  create_task
52-55:  get_tasks
57-64:  update_task
66-69:  delete_task
71-79:  add_dependency
81-87:  get_dependencies
89-92:  remove_dependency
94-97:  auto_update_task_statuses - RUNS DEPENDENCY LOGIC
99-105: create_project
107-110: get_projects
112-121: update_project
123-126: delete_project
128-132: get_preferences
134-147: save_preferences_command
```

### src-tauri/src/db.rs

**Key Functions** (file is large, these are critical)
```
run_migrations() - Schema setup, add migrations here
create_track() - Auto-positions tracks
create_task() - Sets depth based on parent
update_task() - Updates single task
auto_update_task_statuses() - CRITICAL: blocks tasks with incomplete deps
```

---

## 🎯 Common Tasks - Exact Steps

### Task 1: Add a New Color Variable

**Steps:**
1. Add to `:root` in `src/index.css` (lines 5-46)
   ```css
   --color-new-thing: 123 45 67;
   ```

2. Add utility class in `@layer utilities` (after line 53)
   ```css
   .bg-new-thing {
     background-color: rgb(var(--color-new-thing));
   }
   ```

3. Add to `ColorPreferences` interface in `src/App.tsx` (lines 46-64)
   ```tsx
   new_thing: string;
   ```

4. Add to color state in `SettingsView` (lines 586-604)
   ```tsx
   new_thing: "123 45 67",
   ```

5. Add to `applyCSSColors()` (lines 620-638)
   ```tsx
   document.documentElement.style.setProperty("--color-new-thing", colorPrefs.new_thing);
   ```

6. Add to Settings page UI (lines 695-749) - copy a `<ColorInput>` block

**Verification:**
- [ ] Settings page loads without error
- [ ] Can change color and see it apply immediately
- [ ] Restart app, color persists
- [ ] Check browser console for errors

---

### Task 2: Add a New Field to Task

**Steps:**

1. **Database** - `src-tauri/src/db.rs`
   - Find `run_migrations()` function
   - Add new migration:
     ```rust
     conn.execute("ALTER TABLE tasks ADD COLUMN new_field TEXT", [])?;
     ```
   - Increment version check

2. **Rust Type** - `src-tauri/src/db.rs`
   - Find `Task` struct
   - Add field:
     ```rust
     pub new_field: Option<String>,
     ```
   - Update SQL queries in `create_task()`, `get_tasks()`, `update_task()`

3. **TypeScript Type** - `src/App.tsx` (lines 25-37)
   ```tsx
   interface Task {
     // ... existing fields
     new_field: string | null;
   }
   ```

4. **Update Input Type** - `src-tauri/src/db.rs`
   - Find `UpdateTaskInput` struct
   - Add optional field:
     ```rust
     pub new_field: Option<String>,
     ```

5. **UI** - `src/App.tsx`
   - Add input to task creation (around line 1042-1064 in TrackColumn)
   - Display in task card (around line 942-945)

**Verification:**
- [ ] Delete old `bridge.db` and restart (test migration)
- [ ] Create new task with field
- [ ] Update existing task
- [ ] Check SQLite file has new column

---

### Task 3: Add a New View

**Steps:**

1. **Update Type** - `src/App.tsx` line 82
   ```tsx
   const [currentView, setCurrentView] = useState<"board" | "active" | "settings" | "newview">("board");
   ```

2. **Create Component** - Add after line 856
   ```tsx
   interface NewViewProps {
     // props here
   }

   function NewView({ }: NewViewProps) {
     return (
       <div className="flex-1 overflow-y-auto">
         {/* content */}
       </div>
     );
   }
   ```

3. **Add Navigation** - Around lines 458-479
   ```tsx
   <button
     onClick={() => setCurrentView("newview")}
     className={`px-4 py-2 text-sm font-medium transition-colors ${
       currentView === "newview"
         ? "text-accent border-b-2 border-accent"
         : "text-tertiary hover:text-secondary"
     }`}
   >
     New View
   </button>
   ```

4. **Add Render** - Around line 488-577
   ```tsx
   {currentView === "newview" ? (
     <NewView {...props} />
   ) : currentView === "settings" ? (
     // ... rest
   ```

**Verification:**
- [ ] Tab appears in header
- [ ] Clicking tab switches view
- [ ] View renders correctly
- [ ] Switching back to other views works

---

### Task 4: Modify Task Card Appearance

**Location:** `src/App.tsx`
- **Board View:** Lines 926-1065 (TrackColumn → renderTask)
- **Active View:** Lines 792-820 (ActiveView → renderTaskCard)

**Example - Add Due Date Display:**

```tsx
// In renderTaskCard (Active View, around line 798)
<p className="text-base font-medium mb-1 text-primary">{task.title}</p>
{task.due_date && (
  <p className="text-xs text-error">Due: {task.due_date}</p>
)}

// In renderTask (Board View, around line 942)
<p className="text-sm font-medium leading-snug text-primary">{task.title}</p>
{task.due_date && (
  <p className="text-xs text-error mt-1">Due: {task.due_date}</p>
)}
```

**Verification:**
- [ ] Shows in both Board and Active views
- [ ] Styling matches existing elements
- [ ] Doesn't break layout

---

### Task 5: Add New Tauri Command

**Example: Archive a task**

1. **Rust Backend** - `src-tauri/src/main.rs`
   ```rust
   #[tauri::command]
   fn archive_task(state: State<AppState>, id: String) -> Result<(), String> {
       state.db.archive_task(&id).map_err(|e| e.to_string())
   }
   ```

2. **Register Command** - `src-tauri/src/main.rs` (around line 173)
   ```rust
   .invoke_handler(tauri::generate_handler![
       // ... existing commands
       archive_task,
   ])
   ```

3. **Database Method** - `src-tauri/src/db.rs`
   ```rust
   pub fn archive_task(&self, id: &str) -> Result<()> {
       self.conn.lock().unwrap().execute(
           "UPDATE tasks SET archived = 1 WHERE id = ?",
           params![id],
       )?;
       Ok(())
   }
   ```

4. **Frontend Call** - `src/App.tsx`
   ```tsx
   const archiveTask = async (taskId: string) => {
     try {
       await invoke("archive_task", { id: taskId });
       loadData();
     } catch (e) {
       setError(String(e));
     }
   };
   ```

**Verification:**
- [ ] Rust compiles without error
- [ ] Frontend TypeScript compiles
- [ ] Function executes when called
- [ ] Database updates correctly

---

## 🔍 State Flow Diagrams

### Task Creation Flow
```
User clicks "+ Add task"
  ↓
setSelectedTrackId(track.id)
  ↓
Input field appears (line 1104-1127 conditional render)
  ↓
User types title, presses Enter
  ↓
onCreateTask(trackId, null) called
  ↓
createTask() function (line 201-220)
  ↓
invoke("create_task", { input: {...} })
  ↓
Rust: create_task command (main.rs:44-50)
  ↓
Rust: db.create_task() (db.rs)
  ↓
SQLite INSERT
  ↓
Frontend: setNewTaskTitle(""), setSelectedTrackId(null)
  ↓
Frontend: loadData() (line 129-145)
  ↓
invoke("get_tasks") + "get_tracks" + "get_dependencies"
  ↓
setTasks(), setTracks(), setDependencies()
  ↓
React re-renders all components
  ↓
Task appears in UI
```

### Status Update Flow (with Dependencies)
```
User clicks "→" button on task
  ↓
advanceTaskStatus(taskId, currentStatus) (line 249-254)
  ↓
getNextStatus(currentStatus) (line 234-247)
  ↓
updateTaskStatus(taskId, nextStatus) (line 256-267)
  ↓
invoke("update_task", { id, input: { status }})
  ↓
Rust: update_task command
  ↓
SQLite UPDATE tasks SET status = ...
  ↓
invoke("auto_update_task_statuses") ← CRITICAL STEP
  ↓
Rust: auto_update_task_statuses() (db.rs)
  ↓
For each task:
  - Check if has incomplete dependencies
  - If yes: set status = "blocked"
  - If no: keep status as-is
  ↓
loadData() refreshes UI
  ↓
Task status changes, dependent tasks auto-block if needed
```

### Color Preference Flow
```
User changes color in Settings
  ↓
onChange fires on <input type="color">
  ↓
updateColor(colorKey, hexToRgb(value)) (line 640-656)
  ↓
setColors({ ...colors, [key]: value })
  ↓
document.documentElement.style.setProperty(cssVarName, value)
  ↓
UI updates immediately (CSS variable changed)
  ↓
invoke("save_preferences_command", { prefs: { colors }})
  ↓
Rust: save_preferences_command (main.rs:134-147)
  ↓
Write to preferences.json
  ↓
On next app start:
  loadAndApplyPreferences() (line 101-127)
  ↓
  invoke("get_preferences")
  ↓
  Apply all CSS variables
  ↓
  Colors restored
```

---

## 🏗️ Component Contracts

### App (Root Component)
**Manages:**
- All state (projects, tracks, tasks, dependencies)
- Data loading/saving
- View switching
- Sidebar collapse state

**Passes to children:**
- Task operations: create, update, delete, advance status
- Utility functions: getStatusBorderColor, getStatusText
- Data arrays: tasks, tracks
- Callbacks

**Never mutates state directly** - always via setState or loadData()

---

### TrackColumn
**Props (required):**
```typescript
track: Track                           // The track this column represents
tasks: Task[]                          // Top-level tasks ONLY (no subtasks)
onDeleteTrack: (id: string) => void
onCreateTask: (trackId, parentId?) => void
onUpdateTaskStatus: (id, status) => void
onDeleteTask: (id: string) => void
advanceTaskStatus: (id, currentStatus) => void
getStatusBorderColor: (status) => string
getStatusText: (status) => string
getSubtasks: (parentId) => Task[]     // For recursive rendering
hasSubtasks: (taskId) => boolean
collapsedTasks: Set<string>
toggleTaskCollapsed: (id) => void
selectedTrackId: string | null        // For inline input visibility
setSelectedTrackId: (id) => void
selectedParentTaskId: string | null
setSelectedParentTaskId: (id) => void
newTaskTitle: string
setNewTaskTitle: (title) => void
```

**Handles:**
- Rendering task tree (recursive via renderTask)
- Task menus (three-dot)
- Inline task creation (main + subtasks)
- Collapse/expand tree nodes

**CRITICAL:** renderTask() is recursive - calls itself for subtasks (line 1067)

---

### ActiveView
**Props (required):**
```typescript
tasks: Task[]                          // ALL tasks from all tracks
tracks: Track[]                        // For track name lookup
onUpdateTaskStatus: (id, status) => void
advanceTaskStatus: (id, currentStatus) => void
getStatusBorderColor: (status) => string
getStatusText: (status) => string
```

**Handles:**
- Filtering to active tasks only (ready + in_progress)
- Grouping by status
- Action buttons (Start Working, Complete, Block)

**Does NOT handle:**
- Task creation
- Deletion
- Subtask rendering

---

### SettingsView
**Props:** None (self-contained)

**Manages:**
- Color state (local)
- Loading preferences on mount
- Saving to backend on change

**Updates:**
- CSS variables directly (document.documentElement.style)
- Backend preferences (via invoke)

**Auto-saves** - no Save button needed

---

## ⚠️ Common Pitfalls

### Pitfall 1: Forgetting auto_update_task_statuses
**Symptom:** Tasks don't auto-block when dependency is marked incomplete

**Fix:** Always call after updating task:
```tsx
await invoke("update_task", { ... });
await invoke("auto_update_task_statuses");  // Don't forget!
loadData();
```

---

### Pitfall 2: Using Hardcoded Colors
**Symptom:** Color doesn't change in Settings, or breaks theme

**Wrong:**
```tsx
<div className="bg-gray-800 text-blue-500">
```

**Right:**
```tsx
<div className="bg-sidebar text-accent">
```

Check `src/index.css` lines 115-191 for all utility classes.

---

### Pitfall 3: Sidebar Gets Squeezed
**Symptom:** Main content area pushes sidebar smaller when it has lots of content

**Wrong:**
```tsx
<div className="min-h-screen flex">
  <div className="w-80">Sidebar</div>
  <div className="flex-1">Content</div>
</div>
```

**Right:**
```tsx
<div className="h-screen flex overflow-hidden">
  <div className="flex-shrink-0 h-full w-80">Sidebar</div>
  <div className="flex-1 overflow-y-auto h-full">Content</div>
</div>
```

Key: `flex-shrink-0` + `h-full` on sidebar, `overflow-y-auto` on content.

---

### Pitfall 4: Status Border Not Showing
**Symptom:** Task card has gray border on all sides, status color doesn't show

**Wrong:**
```tsx
<div className="border border-task-card border-status-ready">
```

**Right:**
```tsx
<div className="border-t border-l border-r border-task-card border-b-4 border-status-ready">
```

Status classes use `border-bottom-color` with `!important` to override.

---

### Pitfall 5: Arrow Function Not Closed
**Symptom:** Parse error "Unexpected token", Babel fails

**Wrong:**
```tsx
const renderTaskCard = (task: Task) => {
  return (
    <div>...</div>
  );
  // Missing }; !!!

const something = () => {
```

**Right:**
```tsx
const renderTaskCard = (task: Task) => {
  return (
    <div>...</div>
  );
};  // Close the arrow function

const something = () => {
```

Every `=>` needs a closing `}` (or implicit return).

---

### Pitfall 6: Passing All Tasks Instead of Filtered
**Symptom:** TrackColumn shows tasks from other tracks

**Wrong:**
```tsx
<TrackColumn
  track={mainTrack}
  tasks={tasks}  // All tasks!
/>
```

**Right:**
```tsx
<TrackColumn
  track={mainTrack}
  tasks={getTasksForTrack(mainTrack.id)}  // Filtered!
/>
```

TrackColumn expects only top-level tasks for its specific track.

---

## 📋 Verification Checklists

### After Modifying Task Schema
- [ ] Delete `bridge.db` from app data dir
- [ ] Restart app
- [ ] Create new project + track
- [ ] Add task with new field
- [ ] Update task
- [ ] Delete task
- [ ] Check SQLite file has correct schema
- [ ] No console errors

### After Adding CSS Variable
- [ ] Variable in `:root` (lines 5-46)
- [ ] Utility class exists (lines 53-191)
- [ ] In ColorPreferences interface (lines 46-64)
- [ ] In SettingsView state (lines 586-604)
- [ ] In applyCSSColors() (lines 620-638)
- [ ] In Settings page UI (lines 695-749)
- [ ] Can change color in Settings
- [ ] Change applies immediately
- [ ] Persists after restart

### After Adding New View
- [ ] currentView type updated (line 82)
- [ ] Component created with correct structure
- [ ] Navigation button added (lines 458-479)
- [ ] Render logic updated (lines 488-577)
- [ ] View switches correctly
- [ ] Other views still work
- [ ] No layout breaks

### After Modifying Layout
- [ ] Sidebar stays fixed width
- [ ] Main content scrolls
- [ ] Sidebar doesn't scroll
- [ ] Works when collapsed
- [ ] Works when expanded
- [ ] Settings button stays at bottom
- [ ] No horizontal scrollbar

---

## 🚀 Quick Reference Patterns

### Invoke Tauri Command
```tsx
const result = await invoke<ReturnType>("command_name", {
  paramName: paramValue,
  input: { field1: "value" }
});
```

### Create New Task
```tsx
await invoke("create_task", {
  input: {
    track_id: trackId,
    title: "Task title",
    description: null,
    parent_task_id: parentId || null,
  },
});
await invoke("auto_update_task_statuses");
loadData();
```

### Update Task Status
```tsx
await invoke("update_task", {
  id: taskId,
  input: { status: newStatus },
});
await invoke("auto_update_task_statuses");
loadData();
```

### Add CSS Variable + Utility
```css
/* In :root */
--color-new-feature: 123 45 67;

/* In @layer utilities */
.bg-new-feature {
  background-color: rgb(var(--color-new-feature));
}
.text-new-feature {
  color: rgb(var(--color-new-feature));
}
.border-new-feature {
  border-color: rgb(var(--color-new-feature));
}
```

### Conditional Rendering with State
```tsx
{isAddingTask ? (
  <div className="flex gap-2">
    <input
      value={taskTitle}
      onChange={(e) => setTaskTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") createTask();
        if (e.key === "Escape") setIsAddingTask(false);
      }}
      autoFocus
      className="flex-1 bg-input border border-input rounded px-2 py-1 text-sm text-primary"
    />
    <button onClick={createTask} className="bg-accent px-3 py-1 rounded text-sm">
      Add
    </button>
  </div>
) : (
  <button onClick={() => setIsAddingTask(true)} className="...">
    + Add Task
  </button>
)}
```

### Recursive Task Rendering
```tsx
const renderTask = (task: Task, depth: number) => {
  const subtasks = getSubtasks(task.id);
  return (
    <div>
      <div className="task-card">{task.title}</div>
      {subtasks.map(subtask => renderTask(subtask, depth + 1))}
    </div>
  );
};
```

---

## 🎓 Learning the Codebase

**Step 1:** Read CRITICAL RULES at top of this file
**Step 2:** Skim Code Location Map for file structure
**Step 3:** Pick a Common Task that's similar to what you need
**Step 4:** Follow the exact steps, verify with checklist
**Step 5:** Check Pitfalls section if something breaks

**When stuck:**
1. Check State Flow Diagrams to understand data movement
2. Check Component Contracts to see what props are needed
3. Search for similar patterns in App.tsx
4. Verify CSS variables exist (lines 5-46 in index.css)
5. Check console for errors

**Reading order for new features:**
1. Database schema (src-tauri/src/db.rs)
2. Type definitions (src/App.tsx lines 1-69)
3. Relevant component (find in Code Location Map)
4. Similar existing feature (copy pattern)

---

## 🔧 Debugging Commands

**Check database:**
```bash
sqlite3 ~/.local/share/com.bridge.app/bridge.db
.schema
SELECT * FROM tasks;
```

**Check preferences:**
```bash
cat ~/.local/share/com.bridge.app/preferences.json
```

**Reset everything:**
```bash
rm -rf ~/.local/share/com.bridge.app/
npm run tauri dev
```

**Rust logs:**
Check terminal where `npm run tauri dev` is running

**Frontend logs:**
Open DevTools in app window (Cmd+Opt+I in dev mode)

---

## 🎯 Success Criteria

After making changes, the app should:
- [ ] Compile without TypeScript errors
- [ ] Compile Rust without errors
- [ ] Run without console errors
- [ ] Hot-reload shows changes
- [ ] All views still switch correctly
- [ ] Sidebar collapse/expand works
- [ ] Tasks can be created/updated/deleted
- [ ] Settings persist after restart
- [ ] No layout breaks

If any fail, check Pitfalls section above.

---

**This is a living document. When you encounter a new pitfall or pattern, add it here for the next agent.**
