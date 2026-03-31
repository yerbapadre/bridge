# Terminal Quick View - Implementation Plan

## Overview
Add a "quick view" feature for Ghostty terminal sessions linked to tasks. Users can create new terminals, send commands, and view output without switching away from Bridge.

---

## Current State (Already Implemented)

### Database Schema (`src-tauri/src/db.rs`)
```sql
CREATE TABLE terminal_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    terminal_app TEXT NOT NULL,
    terminal_uuid TEXT,
    window_title TEXT,
    working_dir TEXT,
    created_at INTEGER NOT NULL,
    last_focused_at INTEGER,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

**Rust Struct:**
```rust
pub struct TerminalSession {
    pub id: String,
    pub task_id: String,
    pub terminal_app: String,
    pub terminal_uuid: String,
    pub window_title: String,
    pub working_dir: Option<String>,
    pub created_at: i64,
    pub last_focused_at: Option<i64>,
}

pub struct CreateTerminalSessionInput {
    pub task_id: String,
    pub terminal_app: String,
    pub terminal_uuid: String,
    pub window_title: String,
    pub working_dir: Option<String>,
}
```

**TypeScript Interface (`src/types/terminal.ts`):**
```typescript
export interface TerminalSession {
  id: string;
  task_id: string;
  terminal_app: string;
  terminal_uuid: string | null;
  window_title: string | null;
  working_dir: string | null;
  created_at: number;
  last_focused_at: number | null;
}

export interface GhosttyWindow {
  id: string;
  title: string;
  working_dir: string | null;
}
```

### Rust Backend (`src-tauri/src/main.rs`)

**Existing Tauri Commands:**
- ✅ `list_ghostty_windows()` - Line 320-378
  - Returns `Vec<GhosttyWindow>`
  - Uses AppleScript: `every terminal` from Ghostty
  - Parses: `id:(id of t as string), title:(name of t)`
- ✅ `create_terminal_session(state, input)` - Line 234-239
  - Takes `CreateTerminalSessionInput`
  - Calls `state.db.create_terminal_session(input)`
  - Returns `TerminalSession`
- ✅ `get_terminal_sessions(state, task_id)` - Line 242-244
  - Returns `Vec<TerminalSession>` for a task
- ✅ `get_all_terminal_sessions(state)` - Line 247-249
  - Returns all sessions across all tasks
- ✅ `update_terminal_session_focus(state, id)` - Line 252-254
  - Updates `last_focused_at` timestamp
- ✅ `delete_terminal_session(state, id)` - Line 257-259
  - Removes terminal session link
- ✅ `focus_ghostty_window(window_title)` - Line 272-310
  - Uses AppleScript: `focus item 1 of matches`
  - Matches by `name` (window title)
  - Properly escapes input via `escape_applescript_string()`
- ✅ `escape_applescript_string(s)` - Line 263-269
  - Escapes: `\`, `"`, `\n`, `\r`, `\t`
  - **CRITICAL:** Use this for ALL user input in AppleScript

**Current Dependencies (`Cargo.toml`):**
```toml
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.32", features = ["bundled"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
chrono = "0.4"
```

### Frontend (`src/App.tsx`, `src/hooks/useTerminals.ts`, `src/lib/api.ts`)

**API Layer (`src/lib/api.ts`):**
```typescript
// Existing functions (lines 143-177)
export async function getTerminalSessions(taskId: string): Promise<TerminalSession[]>
export async function getAllTerminalSessions(): Promise<TerminalSession[]>
export async function createTerminalSession(input: {...}): Promise<void>
export async function deleteTerminalSession(id: string): Promise<void>
export async function updateTerminalSessionFocus(id: string): Promise<void>
export async function listGhosttyWindows(): Promise<GhosttyWindow[]>
export async function focusGhosttyWindow(windowTitle: string): Promise<void>
```

**Custom Hook (`src/hooks/useTerminals.ts`):**
```typescript
export function useTerminals(focusTask: Task | null) {
  // State
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([]);
  const [allTerminalSessions, setAllTerminalSessions] = useState<TerminalSession[]>([]);
  const [availableWindows, setAvailableWindows] = useState<GhosttyWindow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Functions
  const loadTerminalSessions = async (taskId: string) => {...}
  const loadAllTerminalSessions = async () => {...}
  const loadAvailableWindows = async (): Promise<boolean> => {...}
  const linkTerminalWindow = async (window, taskId): Promise<boolean> => {...}
  const focusTerminalSession = async (session): Promise<void> => {...}
  const deleteTerminalSession = async (sessionId, taskId): Promise<void> => {...}

  // Auto-load sessions when focusTask changes
  useEffect(() => {
    if (focusTask) loadTerminalSessions(focusTask.id);
  }, [focusTask]);

  return { ... };
}
```

**UI Components (`src/App.tsx`):**
- ✅ State: `showLinkTerminalModal` (line 92)
- ✅ Modal Implementation (lines 719-763):
  - Pattern: Fixed overlay with centered card
  - `bg-black bg-opacity-50` overlay
  - `bg-tertiary rounded-lg` card
  - `onClick` outside closes modal
  - `stopPropagation` on card prevents close
- ✅ Hook Usage: `useTerminals(focusTask)` (line 77)
- ✅ Terminal link button on task cards
- ✅ Terminal icons with click-to-focus
- ✅ Multiple terminals per task support

**Modal Pattern (Reference for New Modals):**
```typescript
// State
const [showModal, setShowModal] = useState(false);

// JSX
{showModal && (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    onClick={() => setShowModal(false)}
  >
    <div
      className="bg-tertiary rounded-lg p-6 max-w-md w-full mx-4 border border-border-primary"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-bold text-primary mb-4">Modal Title</h3>
      {/* Content */}
      <button
        onClick={() => setShowModal(false)}
        className="mt-4 w-full px-4 py-2 bg-button-secondary hover:bg-button-secondary-hover text-secondary rounded"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

---

## Prerequisites & Environment

### Software Requirements
- **Ghostty:** Version 1.2.0+ (for Accessibility API) or 1.3.0+ (for full AppleScript support)
- **macOS:** 10.15+ (Catalina or later) for modern Accessibility APIs
- **Tauri:** Version 2.x (already installed)
- **Rust:** 1.70+ (for building Tauri)
- **Node.js:** 18+ (for frontend)

### Ghostty Configuration
Add to `~/.config/ghostty/config` (or Ghostty config location):
```
# Enable Accessibility API (required for reading terminal output)
# Default: true in v1.2.0+, but verify it's not disabled
macos-accessibility = true

# AppleScript support (default: true in v1.3.0+)
macos-applescript = true
```

### macOS Permissions Needed
1. **Automation Permissions** (for AppleScript)
   - System Settings → Privacy & Security → Automation
   - Allow Bridge to control Ghostty
   - **Auto-prompted** when first using AppleScript commands

2. **Accessibility Permissions** (for reading terminal output)
   - System Settings → Privacy & Security → Accessibility
   - Add Bridge to allowed apps
   - **Must be manually granted** - requires user action

### Ghostty Bundle Identifier
```
com.mitchellh.ghostty
```
Use this for all macOS API calls that need bundle ID filtering.

---

## New Feature Set

### 1. Create New Terminal from Task ⭐
**User Action:** Click "New Terminal" button on task
**Behavior:**
- Creates new Ghostty window/tab with:
  - Working directory set to task's context (or project directory)
  - Window title set to task name
  - Optionally run initial command
- Automatically links the new terminal to the task
- Focuses the new terminal

**Use Case:** Start work on a task that needs a dedicated terminal session

---

### 2. Send Commands to Terminal ⭐
**User Action:** Type command in quick view input field, press Enter
**Behavior:**
- Sends command + Enter key to linked terminal
- Terminal executes the command
- Quick view refreshes to show new output

**Use Case:** Send commands without leaving Bridge (e.g., run tests, start dev server)

---

### 3. Read Terminal Output ⭐
**User Action:** Open quick view modal
**Behavior:**
- Displays last N lines of terminal buffer (default: 20 lines)
- Shows ANSI colors (styled as HTML)
- Auto-scrolls to bottom
- Refresh button to update

**Technical:** Uses macOS Accessibility API (requires user permission)

**Use Case:** Check test results, error messages, command output

---

### 4. Quick View Modal ⭐
**UI Components:**
- **Header:** Terminal name, working directory, focus button
- **Output Display:** Scrollable terminal output with monospace font
- **Input Field:** Send commands
- **Actions:** Focus terminal, refresh output, unlink, close modal

**Keyboard Shortcuts:**
- `Cmd+Enter` - Send command
- `Cmd+R` - Refresh output
- `Esc` - Close modal

---

### 5. Enhanced Terminal Picker
**Current:** List of existing terminals
**New:**
- "Create New Terminal" option at top
- Configure working directory before creating
- Set initial command (optional)

---

## Technical Implementation

### Phase 1: Create New Terminals (Easy - Day 1)

#### AppleScript Documentation

**Creating Windows with Configuration:**

From [Ghostty AppleScript Docs](https://ghostty.org/docs/features/applescript):

```applescript
tell application "Ghostty"
    set cfg to new surface configuration
    set initial working directory of cfg to "/Users/jake/projects"
    set font size of cfg to 13
    set command of cfg to "npm run dev"
    set environment variables of cfg to {"EDITOR=nvim", "NODE_ENV=development"}

    set win to new window with configuration cfg

    -- Get info about the new terminal
    set newTerm to focused terminal of selected tab of win
    set termId to id of newTerm as string
    set termTitle to name of newTerm

    return {id:termId, title:termTitle}
end tell
```

**Expected Output Format:**
```
id:550E8400-E29B-41D4-A716-446655440000, title:npm run dev
```

**Configuration Fields Available:**
- `initial working directory` (string) - Full path
- `command` (string) - Shell command to run
- `font size` (integer) - Font size
- `environment variables` (list of strings) - `{"KEY=value", ...}`
- `initial input` (string) - Text to send on startup
- `wait after command` (boolean) - Keep window open after command exits

#### Rust Backend - New Commands

**`create_ghostty_window()`**

*Location:* Add to `src-tauri/src/main.rs` after line 378

```rust
#[derive(Debug, serde::Deserialize)]
struct CreateGhosttyWindowInput {
    task_id: String,
    task_title: String,
    working_directory: Option<String>,
    initial_command: Option<String>,
}

#[tauri::command]
fn create_ghostty_window(
    state: State<AppState>,
    input: CreateGhosttyWindowInput,
) -> Result<TerminalSession, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        // Default to home directory if none specified
        let working_dir = input.working_directory
            .unwrap_or_else(|| std::env::var("HOME").unwrap_or_else(|_| "/".to_string()));

        // Escape values for AppleScript
        let escaped_dir = escape_applescript_string(&working_dir);
        let escaped_title = escape_applescript_string(&input.task_title);

        // Build configuration
        let mut config_lines = vec![
            "set cfg to new surface configuration".to_string(),
            format!("set initial working directory of cfg to \"{}\"", escaped_dir),
        ];

        // Add command if provided
        if let Some(cmd) = &input.initial_command {
            let escaped_cmd = escape_applescript_string(cmd);
            config_lines.push(format!("set command of cfg to \"{}\"", escaped_cmd));
        }

        // Build full AppleScript
        let script = format!(
            r#"
            tell application "Ghostty"
                {}
                set win to new window with configuration cfg

                -- Get the new terminal's info
                set newTerm to focused terminal of selected tab of win
                set termId to id of newTerm as string
                set termTitle to name of newTerm

                return "id:" & termId & ", title:" & termTitle
            end tell
            "#,
            config_lines.join("\n                ")
        );

        // Execute AppleScript
        let output = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

        if !output.status.success() {
            return Err(format!("AppleScript failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        // Parse response: "id:UUID, title:Title"
        let result = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = result.trim().split(", ").collect();

        let terminal_uuid = parts.get(0)
            .and_then(|s| s.strip_prefix("id:"))
            .unwrap_or("")
            .to_string();

        let window_title = parts.get(1)
            .and_then(|s| s.strip_prefix("title:"))
            .unwrap_or(&escaped_title)
            .to_string();

        // Create terminal session record
        let session = state.db.create_terminal_session(CreateTerminalSessionInput {
            task_id: input.task_id,
            terminal_app: "ghostty".to_string(),
            terminal_uuid,
            window_title,
            working_dir: Some(working_dir),
        })?;

        Ok(session)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Ghostty AppleScript is only supported on macOS".to_string())
    }
}
```

**Register Command:**

*Location:* `src-tauri/src/main.rs` line 415+

Find the existing `.invoke_handler()` block and add the new commands:
```rust
.invoke_handler(tauri::generate_handler![
    create_track,
    get_tracks,
    update_track,
    delete_track,
    // ... all existing commands ...
    list_ghostty_windows,
    focus_ghostty_window,
    create_ghostty_window,       // ← Add this
    send_command_to_terminal,    // ← Add this
    read_terminal_output,        // ← Add this (Phase 3)
    check_accessibility_permission,  // ← Add this (Phase 5)
    open_accessibility_settings,     // ← Add this (Phase 5)
])
```

**Add Rust Type Exports:**

*Location:* `src-tauri/src/main.rs` line 5

Add new input types to the `use db::` statement:
```rust
use db::{
    ActiveTimer, CreateProjectInput, CreateTaskInput, CreateTerminalSessionInput,
    CreateThemeInput, CreateTrackInput, Database, TerminalSession, TimeLog,
    UpdateTaskInput, UserPreferences,
    // Add if creating new types:
    // CreateGhosttyWindowInput, SendCommandInput, TerminalOutput
};
```

Or define inline in main.rs (recommended for these simple types):
```rust
// Add after line 15 (after AppState definition)
#[derive(Debug, serde::Deserialize)]
struct CreateGhosttyWindowInput {
    task_id: String,
    task_title: String,
    working_directory: Option<String>,
    initial_command: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
struct SendCommandInput {
    terminal_name: String,
    command: String,
}

#[derive(Debug, serde::Serialize)]
struct TerminalOutput {
    lines: Vec<String>,
    full_text: String,
}
```

#### Frontend - API Layer Updates

**Add to `src/lib/api.ts` (after line 177):**
```typescript
export async function createGhosttyWindow(input: {
  task_id: string;
  task_title: string;
  working_directory?: string;
  initial_command?: string;
}): Promise<TerminalSession> {
  return invoke<TerminalSession>("create_ghostty_window", { input });
}
```

#### Frontend - Hook Updates

**Add to `src/hooks/useTerminals.ts` (after line 58):**
```typescript
const createNewTerminal = async (
  taskId: string,
  taskTitle: string,
  workingDirectory?: string,
  initialCommand?: string
): Promise<TerminalSession | null> => {
  try {
    const session = await api.createGhosttyWindow({
      task_id: taskId,
      task_title: taskTitle,
      working_directory: workingDirectory,
      initial_command: initialCommand,
    });
    await loadTerminalSessions(taskId);
    return session;
  } catch (e) {
    setError(String(e));
    return null;
  }
};

// Add to return statement (around line 100)
return {
  // ... existing returns ...
  createNewTerminal,  // Add this
};
```

#### Frontend - UI Changes

**Step 1: Import hook functions**

*Location:* `src/App.tsx` line 77

Update `useTerminals` destructuring to include new functions:
```typescript
const {
  terminalSessions,
  allTerminalSessions,
  availableWindows,
  loadAllTerminalSessions,
  loadAvailableWindows,
  linkTerminalWindow,
  focusTerminalSession,
  deleteTerminalSession,
  deleteTerminalSessionFromAllView,
  createNewTerminal,  // ← Add this
  sendCommandToTerminal,  // ← Add this (Phase 2)
  readTerminalOutput,  // ← Add this (Phase 3)
  error: terminalsError,
  setError: setTerminalsError,
} = useTerminals(focusTask);
```

**Step 2: Add state for new modals**

*Location:* `src/App.tsx` after line 92

Add new state variables:
```typescript
const [showLinkTerminalModal, setShowLinkTerminalModal] = useState(false);
const [showCreateTerminalModal, setShowCreateTerminalModal] = useState(false);  // ← Add
const [createTerminalTaskId, setCreateTerminalTaskId] = useState<string | null>(null);  // ← Add
const [newTerminalWorkingDir, setNewTerminalWorkingDir] = useState("");  // ← Add
const [newTerminalInitialCmd, setNewTerminalInitialCmd] = useState("");  // ← Add
const [quickViewSession, setQuickViewSession] = useState<TerminalSession | null>(null);  // ← Add (Phase 4)
const [quickViewCommand, setQuickViewCommand] = useState("");  // ← Add (Phase 4)
const [terminalOutput, setTerminalOutput] = useState<string[]>([]);  // ← Add (Phase 4)
```

**Step 3: Add handler functions**

*Location:* `src/App.tsx` after the existing `handleLinkTerminalWindow` function

```typescript
const handleOpenCreateTerminalModal = async (taskId: string) => {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  setCreateTerminalTaskId(taskId);
  // Pre-fill with project working directory if available
  setNewTerminalWorkingDir(/* could get from project settings */);
  setShowCreateTerminalModal(true);
};

const handleCreateTerminal = async () => {
  if (!createTerminalTaskId) return;

  const task = tasks.find(t => t.id === createTerminalTaskId);
  if (!task) return;

  const session = await createNewTerminal(
    createTerminalTaskId,
    task.title,
    newTerminalWorkingDir || undefined,
    newTerminalInitialCmd || undefined
  );

  if (session) {
    setShowCreateTerminalModal(false);
    setNewTerminalWorkingDir("");
    setNewTerminalInitialCmd("");
    setCreateTerminalTaskId(null);
    await loadData(); // Refresh task list
  }
};
```

**Step 4: Add UI button in task cards**

*Location:* Find where terminal link buttons are rendered in task cards (search for "linkTerminalWindow" in App.tsx)

Add adjacent to existing terminal link button:
```tsx
{/* Existing terminal icons */}
{terminalSessions.filter(s => s.task_id === task.id).map(session => (
  <button key={session.id} onClick={() => focusTerminalSession(session)}>
    {/* Terminal icon */}
  </button>
))}

{/* NEW: Create terminal button */}
<button
  onClick={() => handleOpenCreateTerminalModal(task.id)}
  className="text-tertiary hover:text-primary"
  title="Create new terminal"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4v16m8-8H4" />
  </svg>
</button>
```

**Step 5: Add modal component**

*Location:* `src/App.tsx` after line 763 (after existing `showLinkTerminalModal` modal)

**Create Terminal Modal:**
```tsx
{createTerminalModalTaskId && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h2>Create New Terminal</h2>

      <label>Working Directory</label>
      <input
        value={newTerminalWorkingDir}
        onChange={(e) => setNewTerminalWorkingDir(e.target.value)}
        placeholder="/path/to/project"
      />

      <label>Initial Command (Optional)</label>
      <input
        value={newTerminalInitialCmd}
        onChange={(e) => setNewTerminalInitialCmd(e.target.value)}
        placeholder="npm run dev"
      />

      <div className="actions">
        <button onClick={handleCreateTerminal}>Create & Link</button>
        <button onClick={() => setCreateTerminalModalTaskId(null)}>Cancel</button>
      </div>
    </div>
  </div>
)}
```

**Handler:**
```tsx
const handleCreateTerminal = async () => {
  const task = tasks.find(t => t.id === createTerminalModalTaskId);

  const session = await invoke<TerminalSession>('create_ghostty_window', {
    input: {
      taskId: task.id,
      taskTitle: task.title,
      workingDirectory: newTerminalWorkingDir || undefined,
      initialCommand: newTerminalInitialCmd || undefined,
    }
  });

  setCreateTerminalModalTaskId(null);
  loadData(); // Refresh to show new terminal link
};
```

---

### Phase 2: Send Commands (Easy - Day 1)

#### Rust Backend - New Command

**`send_command_to_terminal()`**
```rust
#[derive(Debug, serde::Deserialize)]
struct SendCommandInput {
    terminal_name: String,  // Window title to match
    command: String,
}

#[tauri::command]
fn send_command_to_terminal(input: SendCommandInput) -> Result<(), String> {
    let escaped_title = escape_applescript_string(&input.terminal_name);
    let escaped_cmd = escape_applescript_string(&input.command);

    let script = format!(r#"
        tell application "Ghostty"
            set matches to every terminal whose name is "{}"
            if (count of matches) > 0 then
                set t to item 1 of matches
                input text "{}" to t
                send key "enter" to t
            end if
        end tell
    "#, escaped_title, escaped_cmd);

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

    if !output.status.success() {
        return Err(format!("AppleScript failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    Ok(())
}
```

---

### Phase 3: Read Terminal Output (Moderate - Days 2-3)

#### Prerequisites
1. User grants Accessibility permissions in System Settings
2. Ghostty has `macos-accessibility = true` in config (enabled by default in v1.2.0+)

#### macOS Accessibility API - Technical Details

**Ghostty's AXUIElement Hierarchy:**
```
AXApplication (Ghostty)
  └─ AXWindow (title: "window name")
      └─ AXGroup (tab container)
          └─ AXGroup (tab content)
              └─ AXTextArea (terminal output)
                  ├─ role: AXTextArea
                  ├─ value: String (full buffer content)
                  ├─ selectedText: String
                  ├─ visibleCharacterRange: CFRange
                  └─ numberOfCharacters: Int
```

**Key Attributes to Query:**
- `kAXValueAttribute` (CFString) - Full terminal text buffer
- `kAXSelectedTextAttribute` (CFString) - Currently selected text
- `kAXVisibleCharacterRangeAttribute` (CFRange) - Visible portion
- `kAXNumberOfCharactersAttribute` (CFNumber) - Total characters
- `kAXRoleAttribute` (CFString) - Element type (look for "AXTextArea")

**Finding the Terminal Element:**
1. Get running app by bundle ID: `com.mitchellh.ghostty`
2. Get windows: `AXUIElementCopyAttributeValue(app, kAXWindowsAttribute, ...)`
3. Filter by window title (match terminal session's `window_title`)
4. Traverse children to find `AXTextArea` role
5. Read `kAXValueAttribute` to get text content

**C Functions Needed (from ApplicationServices framework):**
```c
AXUIElementRef AXUIElementCreateApplication(pid_t pid);
AXError AXUIElementCopyAttributeValue(AXUIElementRef, CFStringRef, CFTypeRef*);
AXError AXUIElementCopyAttributeNames(AXUIElementRef, CFArrayRef*);
Boolean AXIsProcessTrustedWithOptions(CFDictionaryRef);
```

**Required Rust Dependencies:**
```toml
# Add to Cargo.toml [dependencies]
cocoa = "0.25"
objc = "0.2"
core-foundation = "0.9"
```

#### Rust Backend - Accessibility API Integration

**Option A: Pure Rust (using cocoa crate)**
```rust
// Add dependencies to Cargo.toml:
// cocoa = "0.25"
// objc = "0.2"

use cocoa::base::{id, nil};
use cocoa::foundation::NSString;
use objc::runtime::{Class, Object};
use objc::{msg_send, sel, sel_impl};

#[derive(Debug, serde::Serialize)]
struct TerminalOutput {
    lines: Vec<String>,
    cursor_position: (usize, usize),
}

#[tauri::command]
fn read_terminal_output(terminal_name: String, num_lines: usize) -> Result<TerminalOutput, String> {
    #[cfg(target_os = "macos")]
    {
        unsafe {
            // 1. Get Ghostty app
            let running_apps_class = Class::get("NSRunningApplication").unwrap();
            let apps: id = msg_send![running_apps_class, runningApplicationsWithBundleIdentifier:
                NSString::alloc(nil).init_str("com.mitchellh.ghostty")];

            if apps == nil {
                return Err("Ghostty is not running".to_string());
            }

            let app: id = msg_send![apps, firstObject];
            let pid: i32 = msg_send![app, processIdentifier];

            // 2. Create AXUIElement for Ghostty
            let ax_app = AXUIElementCreateApplication(pid);

            // 3. Navigate hierarchy: App -> Windows -> Tabs -> Terminal
            // Get windows
            let mut windows_ref: CFTypeRef = std::ptr::null();
            AXUIElementCopyAttributeValue(
                ax_app,
                kAXWindowsAttribute,
                &mut windows_ref
            );

            // 4. Find terminal with matching title
            // ... (traverse windows, check titles)

            // 5. Get terminal text area element
            let mut value_ref: CFTypeRef = std::ptr::null();
            AXUIElementCopyAttributeValue(
                terminal_element,
                kAXValueAttribute,
                &mut value_ref
            );

            // 6. Extract text as string
            let text = /* CFString to String conversion */;

            // 7. Parse lines (split by \n, take last N lines)
            let all_lines: Vec<String> = text.lines()
                .map(|s| s.to_string())
                .collect();

            let lines = all_lines.iter()
                .rev()
                .take(num_lines)
                .rev()
                .cloned()
                .collect();

            Ok(TerminalOutput {
                lines,
                cursor_position: (0, 0), // TODO: Get cursor position
            })
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Accessibility API only supported on macOS".to_string())
    }
}
```

**Option B: Swift Bridge (cleaner, recommended)**

Create `src-tauri/src/accessibility.swift`:
```swift
import Cocoa
import ApplicationServices

@objc public class GhosttyAccessibility: NSObject {
    @objc public static func readTerminalOutput(
        terminalName: String,
        numLines: Int
    ) -> [String: Any]? {
        // 1. Get Ghostty process
        let apps = NSRunningApplication.runningApplications(
            withBundleIdentifier: "com.mitchellh.ghostty"
        )
        guard let app = apps.first else { return nil }

        // 2. Create AXUIElement
        let axApp = AXUIElementCreateApplication(app.processIdentifier)

        // 3. Get windows
        var windowsValue: CFTypeRef?
        AXUIElementCopyAttributeValue(
            axApp,
            kAXWindowsAttribute as CFString,
            &windowsValue
        )
        guard let windows = windowsValue as? [AXUIElement] else { return nil }

        // 4. Find terminal by title
        for window in windows {
            var titleValue: CFTypeRef?
            AXUIElementCopyAttributeValue(
                window,
                kAXTitleAttribute as CFString,
                &titleValue
            )

            if let title = titleValue as? String, title == terminalName {
                // 5. Navigate to terminal text area
                // Window -> Group (tab) -> TextArea (terminal)
                var childrenValue: CFTypeRef?
                AXUIElementCopyAttributeValue(
                    window,
                    kAXChildrenAttribute as CFString,
                    &childrenValue
                )

                // ... traverse to find AXTextArea role

                // 6. Get text value
                var textValue: CFTypeRef?
                AXUIElementCopyAttributeValue(
                    textArea,
                    kAXValueAttribute as CFString,
                    &textValue
                )

                guard let text = textValue as? String else { return nil }

                // 7. Split into lines and take last N
                let allLines = text.components(separatedBy: "\n")
                let lines = Array(allLines.suffix(numLines))

                return [
                    "lines": lines,
                    "full_text": text
                ]
            }
        }

        return nil
    }
}
```

Then expose to Rust via Swift/C interop or use `swift-bridge` crate.

#### Frontend - Display Output

```tsx
const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

const refreshTerminalOutput = async (session: TerminalSession) => {
  try {
    const output = await invoke<{lines: string[]}>('read_terminal_output', {
      terminalName: session.window_title,
      numLines: 20
    });
    setTerminalOutput(output.lines);
  } catch (err) {
    // Check if permission error
    if (err.includes('accessibility')) {
      showAccessibilityPermissionPrompt();
    }
  }
};
```

---

### Phase 4: Quick View Modal (Easy - Day 3)

#### Frontend UI

```tsx
{quickViewSession && (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    onClick={() => setQuickViewSession(null)}
  >
    <div
      className="bg-secondary rounded-lg shadow-lg w-[800px] h-[600px] flex flex-col mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar">
        <div>
          <h2 className="text-lg font-semibold text-primary">
            {quickViewSession.window_title}
          </h2>
          <p className="text-sm text-tertiary">
            {quickViewSession.working_dir || 'No working directory'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refreshTerminalOutput(quickViewSession)}
            className="px-3 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover"
            title="Refresh (Cmd+R)"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => focusTerminalSession(quickViewSession)}
            className="px-3 py-1 rounded bg-accent-primary hover:bg-accent-hover text-white"
          >
            Focus Terminal
          </button>
          <button
            onClick={() => setQuickViewSession(null)}
            className="px-3 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Output Display */}
      <div
        className="flex-1 overflow-y-auto p-4 bg-[#1a1b26] font-mono text-sm"
        style={{
          fontFamily: 'SF Mono, Monaco, Consolas, monospace',
          lineHeight: '1.5'
        }}
      >
        {terminalOutput.length === 0 ? (
          <div className="text-gray-500 italic">
            No output yet. Send a command to see results.
          </div>
        ) : (
          terminalOutput.map((line, i) => (
            <div
              key={i}
              className="text-gray-100"
              dangerouslySetInnerHTML={{
                __html: parseAnsiToHtml(line)  // Convert ANSI codes to HTML
              }}
            />
          ))
        )}
      </div>

      {/* Input Field */}
      <div className="p-4 border-t border-sidebar">
        <div className="flex gap-2">
          <input
            type="text"
            value={quickViewCommand}
            onChange={(e) => setQuickViewCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendCommand();
              }
            }}
            placeholder="Type command and press Enter..."
            className="flex-1 px-3 py-2 rounded bg-input-bg border border-input-border text-primary focus:outline-none focus:border-accent-primary"
          />
          <button
            onClick={handleSendCommand}
            className="px-4 py-2 rounded bg-accent-primary hover:bg-accent-hover text-white font-medium"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-tertiary mt-2">
          Tip: Press Cmd+Enter to send, Cmd+R to refresh, Esc to close
        </p>
      </div>
    </div>
  </div>
)}
```

**Helper: Parse ANSI to HTML**
```tsx
const parseAnsiToHtml = (text: string): string => {
  // Simple ANSI color code parser
  // Convert common codes: \x1b[31m (red), \x1b[32m (green), etc.
  return text
    .replace(/\x1b\[31m/g, '<span style="color: #ff6b6b">')  // Red
    .replace(/\x1b\[32m/g, '<span style="color: #51cf66">')  // Green
    .replace(/\x1b\[33m/g, '<span style="color: #ffd43b">')  // Yellow
    .replace(/\x1b\[34m/g, '<span style="color: #4dabf7">')  // Blue
    .replace(/\x1b\[35m/g, '<span style="color: #da77f2">')  // Magenta
    .replace(/\x1b\[36m/g, '<span style="color: #4fd1c5">')  // Cyan
    .replace(/\x1b\[0m/g, '</span>')                         // Reset
    .replace(/\x1b\[[0-9;]+m/g, '');                         // Strip others
};
```

**Handler: Send Command**
```tsx
const handleSendCommand = async () => {
  if (!quickViewCommand.trim() || !quickViewSession) return;

  try {
    await invoke('send_command_to_terminal', {
      input: {
        terminalName: quickViewSession.window_title,
        command: quickViewCommand
      }
    });

    setQuickViewCommand('');

    // Wait 500ms for command to execute, then refresh output
    setTimeout(() => {
      refreshTerminalOutput(quickViewSession);
    }, 500);
  } catch (err) {
    console.error('Failed to send command:', err);
    alert('Failed to send command: ' + err);
  }
};
```

---

### Phase 5: Accessibility Permission Handling (Easy - Day 4)

#### Frontend - Permission Check & Prompt

```tsx
const [accessibilityGranted, setAccessibilityGranted] = useState<boolean | null>(null);

useEffect(() => {
  checkAccessibilityPermission();
}, []);

const checkAccessibilityPermission = async () => {
  try {
    const granted = await invoke<boolean>('check_accessibility_permission');
    setAccessibilityGranted(granted);
  } catch (err) {
    setAccessibilityGranted(false);
  }
};

{accessibilityGranted === false && (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
    <div className="flex items-start">
      <div className="flex-shrink-0">⚠️</div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-yellow-800">
          Accessibility Permission Required
        </h3>
        <p className="mt-2 text-sm text-yellow-700">
          To read terminal output, Bridge needs Accessibility permissions.
        </p>
        <button
          onClick={openAccessibilitySettings}
          className="mt-3 text-sm font-medium text-yellow-800 underline"
        >
          Open System Settings →
        </button>
      </div>
    </div>
  </div>
)}
```

#### Rust Backend - Permission Check

```rust
#[tauri::command]
fn check_accessibility_permission() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::base::nil;
        use objc::runtime::Class;
        use objc::{msg_send, sel, sel_impl};

        unsafe {
            let options_class = Class::get("NSDictionary").unwrap();
            let options: id = msg_send![options_class, dictionary];

            // Check if trusted
            let trusted: bool = AXIsProcessTrustedWithOptions(options as CFDictionaryRef);
            Ok(trusted)
        }
    }

    #[cfg(not(target_os = "macos"))]
    Ok(false)
}

#[tauri::command]
fn open_accessibility_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    Err("Not supported on this platform".to_string())
}
```

---

## Enhanced Features (Future)

### 1. Live Output Streaming
- Poll Accessibility API every 2 seconds
- Show new lines as they appear
- Indicator for "new output available"

### 2. Claude Message Detection
- Parse terminal output to identify Claude Code messages
- Look for markers: ` `, `<thinking>`, tool use blocks
- Highlight Claude responses with different background color
- "Jump to last Claude message" button

### 3. Terminal Session History
- Store command history per terminal session
- "Recent commands" dropdown for quick re-run
- Command autocomplete based on history

### 4. Split View
- Show multiple terminal outputs side-by-side
- Compare outputs from different sessions
- Useful for monitoring multiple dev servers

### 5. Output Filtering
- Search/filter output by keyword
- Highlight matches
- "Show only errors" toggle (grep for ERROR, FAIL, etc.)

### 6. Terminal Templates
- Pre-configured terminal setups (working dir, initial commands)
- "Frontend Dev" template: cd to src/, run `npm run dev`
- "Test Runner" template: cd to root, run `npm test -- --watch`

---

## Implementation Timeline

### Day 1: Create Terminals & Send Commands
- [ ] Implement `create_ghostty_window()` Rust command
- [ ] Add "Create New Terminal" UI button and modal
- [ ] Implement `send_command_to_terminal()` Rust command
- [ ] Test creating terminals with different configs
- [ ] Test sending commands

### Day 2: Accessibility Integration
- [ ] Research Swift bridge vs pure Rust approach
- [ ] Implement `read_terminal_output()` (Swift/Rust)
- [ ] Implement `check_accessibility_permission()`
- [ ] Implement `open_accessibility_settings()`
- [ ] Test reading output from sample terminals

### Day 3: Quick View Modal
- [ ] Build modal UI with output display
- [ ] Build input field and send handler
- [ ] Implement ANSI color parsing
- [ ] Wire up refresh functionality
- [ ] Add keyboard shortcuts (Cmd+Enter, Cmd+R, Esc)
- [ ] Add "Quick View" button to terminal icons on task cards

### Day 4: Polish & Error Handling
- [ ] Accessibility permission banner and prompt
- [ ] Error states (terminal not found, command failed, etc.)
- [ ] Loading states for async operations
- [ ] Test edge cases (terminal closed mid-operation, etc.)
- [ ] Update DEVELOPMENT.md with new features

### Day 5: Testing & Documentation
- [ ] End-to-end testing of all features
- [ ] Write user-facing documentation
- [ ] Create video demo / GIF
- [ ] Update README.md

---

## Code Structure Changes

### New Files
```
src-tauri/src/
  ├── accessibility.swift       (if using Swift bridge)
  └── accessibility_ffi.rs      (Swift FFI bindings)

src/
  ├── components/
  │   ├── QuickViewModal.tsx    (extract modal to component)
  │   └── TerminalPicker.tsx    (extract picker to component)
  └── utils/
      └── ansi.ts               (ANSI parsing utilities)
```

### Modified Files
```
src-tauri/src/main.rs
  + create_ghostty_window()
  + send_command_to_terminal()
  + read_terminal_output()
  + check_accessibility_permission()
  + open_accessibility_settings()

src-tauri/Cargo.toml
  + cocoa = "0.25"              (if pure Rust)
  + objc = "0.2"                (if pure Rust)
  + swift-bridge = "1.0"        (if Swift bridge)

src/App.tsx
  + Quick view modal state & handlers
  + Create terminal modal state & handlers
  + Terminal output state
  + Send command handlers

src/index.css
  + Terminal output styles
  + ANSI color classes
```

---

## Testing Checklist

### Create New Terminal
- [ ] Create terminal with custom working directory
- [ ] Create terminal with initial command
- [ ] Create terminal without working dir (uses home)
- [ ] Terminal automatically links to task
- [ ] Multiple terminals can be created for one task

### Send Commands
- [ ] Simple command (echo "hello")
- [ ] Long-running command (npm run dev)
- [ ] Command with special characters (quotes, pipes)
- [ ] Command to non-existent terminal (error handling)
- [ ] Rapid successive commands

### Read Output
- [ ] Read from terminal with output
- [ ] Read from empty terminal
- [ ] Read ANSI colored output (preserves colors)
- [ ] Read multiline output (formatted correctly)
- [ ] Read after sending command (shows new output)
- [ ] Read from non-existent terminal (error handling)

### Accessibility
- [ ] Permission banner shows when not granted
- [ ] "Open Settings" button works
- [ ] Re-check permission after granting
- [ ] Graceful fallback when permission denied (can still send commands)

### Quick View Modal
- [ ] Opens when clicking terminal icon
- [ ] Shows correct terminal info in header
- [ ] Output scrolls to bottom
- [ ] Input field focuses on open
- [ ] Cmd+Enter sends command
- [ ] Cmd+R refreshes output
- [ ] Esc closes modal
- [ ] Clicking outside closes modal
- [ ] Focus Terminal button works

---

## Security Considerations

### AppleScript Injection Prevention
- ✅ Already implemented: `escape_applescript_string()`
- Ensure all user input is escaped before AppleScript execution
- Test with malicious inputs: `"; do shell script "rm -rf /"; "`

### Accessibility API Abuse Prevention
- Only read from Ghostty terminals (filter by bundle ID)
- Don't expose raw accessibility API to frontend
- Rate limit reads (max 1 req/second per terminal)

### Command Execution Safety
- Commands run in user's terminal (not elevated)
- No automatic command execution (user must explicitly send)
- Show preview before sending complex commands (future enhancement)

---

## Quick Start for New Agents

If you're a fresh agent starting this implementation, here's your checklist:

### Before You Start
1. **Read the current codebase:**
   - [ ] `src-tauri/src/main.rs` lines 234-378 (existing terminal commands)
   - [ ] `src-tauri/src/db.rs` lines 1514-1612 (database layer)
   - [ ] `src/hooks/useTerminals.ts` (terminal hook pattern)
   - [ ] `src/App.tsx` lines 719-763 (modal pattern example)
   - [ ] `src/lib/api.ts` lines 143-177 (API layer pattern)

2. **Understand the types:**
   - [ ] `src/types/terminal.ts` - `TerminalSession` and `GhosttyWindow`
   - [ ] Rust: `db::TerminalSession` and `CreateTerminalSessionInput`

3. **Test Ghostty is working:**
   ```bash
   # List terminals via AppleScript
   osascript -e 'tell application "Ghostty" to return every terminal'

   # Create a test window
   osascript -e 'tell application "Ghostty"
     set cfg to new surface configuration
     set initial working directory of cfg to "/tmp"
     new window with configuration cfg
   end tell'
   ```

4. **Verify Ghostty version:**
   ```bash
   /Applications/Ghostty.app/Contents/MacOS/ghostty --version
   # Should be 1.2.0+ (for accessibility) or 1.3.0+ (for AppleScript)
   ```

### Implementation Order
**Day 1:** Create Terminals (Phase 1)
- Start with Rust command: `create_ghostty_window()`
- Add API function: `createGhosttyWindow()`
- Add hook function: `createNewTerminal()`
- Build UI modal for creation
- **Test checkpoint:** Can create terminal from task ✓

**Day 2:** Send Commands (Phase 2)
- Implement `send_command_to_terminal()`
- Add to API and hook layers
- Wire up to quick view input field
- **Test checkpoint:** Can send "echo hello" and see it in terminal ✓

**Day 3:** Read Output (Phase 3)
- Choose approach: Swift bridge vs Pure Rust
- Implement `read_terminal_output()`
- Handle accessibility permissions
- **Test checkpoint:** Can read terminal text ✓

**Day 4:** Quick View Modal (Phase 4)
- Build full modal UI
- ANSI parsing (use library: `ansi-to-html`)
- Keyboard shortcuts
- **Test checkpoint:** Full workflow works ✓

**Day 5:** Polish
- Error handling
- Loading states
- Documentation
- **Ship it** 🚀

### Common Pitfalls to Avoid
1. **AppleScript injection** - Always use `escape_applescript_string()` for user input
2. **Parsing AppleScript output** - Format is "key:value, key:value" (see line 348-369 in main.rs)
3. **Terminal not found** - Terminal may close between listing and using it
4. **Accessibility denied** - Check permission status before calling AX APIs
5. **Modal z-index** - Use `z-50` for modals (existing pattern)
6. **Tauri command registration** - Don't forget to add new commands to `.invoke_handler()`

### Key Files to Create/Modify

**Create:**
- None (all changes are additions to existing files)

**Modify:**
- `src-tauri/src/main.rs` - Add 3 new Tauri commands
- `src-tauri/Cargo.toml` - Add dependencies (cocoa, objc)
- `src/lib/api.ts` - Add 3 new API functions
- `src/hooks/useTerminals.ts` - Add 2 new hook functions
- `src/App.tsx` - Add quick view modal UI + state

**Optional (if extracting components):**
- `src/components/QuickViewModal.tsx`
- `src/utils/ansi.ts`

---

## What's NOT in This Plan (Future Work)

This plan intentionally scopes out these features to keep initial implementation focused:

1. **Live output streaming** - Polling every N seconds
2. **Claude message detection** - Parsing to identify AI responses
3. **Command history** - Storing past commands per terminal
4. **Split view** - Multiple terminals side-by-side
5. **Output filtering/search** - Grep-like functionality
6. **Terminal templates** - Pre-configured setups
7. **Tab support** - Creating tabs instead of windows
8. **Other terminals** - iTerm2, Terminal.app, etc.
9. **Non-macOS support** - Linux/Windows accessibility APIs
10. **Undo/redo** - Reverting sent commands

Add these incrementally after core features are stable.

---

## Debugging Tips

### AppleScript Issues
```bash
# Test AppleScript directly
osascript -e 'tell application "Ghostty"
  set cfg to new surface configuration
  set initial working directory of cfg to "/tmp"
  set win to new window with configuration cfg
  set newTerm to focused terminal of selected tab of win
  return {id:(id of newTerm as string), title:(name of newTerm)}
end tell'

# Check Ghostty is running
pgrep -x Ghostty || echo "Ghostty not running"
```

### Accessibility API Issues
```bash
# Check if Bridge has accessibility permissions
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT service, client FROM access WHERE service='kTCCServiceAccessibility';"

# Check Ghostty's accessibility is enabled
defaults read com.mitchellh.ghostty macos-accessibility
# Should return 1 (true)
```

### Rust Compilation Issues
```bash
# Clean build
cd src-tauri
cargo clean
cargo build

# Check for syntax errors
cargo check

# View expanded macros (if serde issues)
cargo expand
```

### Frontend Issues
```bash
# Check TypeScript errors
npm run check

# View Tauri logs
npm run tauri dev  # Console shows Rust logs
```

### Common Error Messages & Solutions

**"AppleScript failed: Ghostty got an error: Can't get terminal 1"**
- **Cause:** No terminals open in Ghostty
- **Solution:** Open at least one Ghostty window first

**"Failed to execute AppleScript: No such file or directory"**
- **Cause:** Ghostty not installed or not in /Applications
- **Solution:** Install Ghostty or update bundle ID path

**"AppleScript failed: Not authorized to send Apple events to Ghostty"**
- **Cause:** Automation permission not granted
- **Solution:** System Settings → Privacy → Automation → Bridge → Enable Ghostty

**"Accessibility API returned error -25205"**
- **Cause:** Accessibility permission not granted (kAXErrorAPIDisabled)
- **Solution:** System Settings → Privacy → Accessibility → Add Bridge

**"Thread 'main' panicked at 'called unwrap() on a None value'"**
- **Cause:** AppleScript response parsing failed
- **Solution:** Check response format - should be "id:UUID, title:Title"

**"Tauri command 'create_ghostty_window' not found"**
- **Cause:** Command not registered in invoke_handler
- **Solution:** Add to `.invoke_handler(tauri::generate_handler![...])` in main.rs

**"Type 'TerminalSession' is not assignable to type 'void'"**
- **Cause:** API function return type mismatch
- **Solution:** Check Promise return type in api.ts matches Rust command

**"Cannot read property 'window_title' of null"**
- **Cause:** Terminal session doesn't have window_title
- **Solution:** Add null check: `if (!session.window_title) return;`

---

## References

### Documentation
- [Ghostty AppleScript Docs](https://ghostty.org/docs/features/applescript)
- [Ghostty 1.2.0 Release - Accessibility](https://ghostty.org/docs/install/release-notes/1-2-0)
- [Ghostty 1.3.0 Release - AppleScript](https://ghostty.org/docs/install/release-notes/1-3-0)
- [macOS Accessibility API](https://developer.apple.com/documentation/applicationservices/axuielement)

### Libraries
- [AXorcist (Swift Accessibility Wrapper)](https://github.com/steipete/AXorcist)
- [AXSwift](https://github.com/tmandry/AXSwift)
- [ghostty-mcp (Community MCP Server)](https://github.com/GitJuhb/ghostty-mcp)

### Examples
- [Alfred Ghostty Script](https://github.com/zeitlings/alfred-ghostty-script)
- [cmux Terminal for AI Agents](https://github.com/manaflow-ai/cmux)

---

## Open Questions

1. **Swift vs Rust for Accessibility API?**
   - Swift: Cleaner, better docs, easier debugging
   - Rust: No additional toolchain, smaller binary
   - **Recommendation:** Start with Swift bridge, optimize later if needed

2. **Polling frequency for live updates?**
   - Every 2 seconds? On-demand only?
   - **Recommendation:** Start with manual refresh, add polling as enhancement

3. **ANSI parsing library vs custom?**
   - Libraries: `ansi-to-html`, `strip-ansi`
   - Custom: Lightweight, tailored
   - **Recommendation:** Use library for complete coverage

4. **Store command history in database?**
   - Pros: Persistence, autocomplete
   - Cons: More complexity
   - **Recommendation:** Phase 2 feature

5. **Support tabs vs windows?**
   - AppleScript supports both `new window` and `new tab`
   - **Recommendation:** Default to window, add tab option in settings

---

## Success Metrics

- ✅ Can create new terminal from task in < 5 clicks
- ✅ Can send command and see output without leaving Bridge
- ✅ Quick view modal loads in < 1 second
- ✅ Accessibility permission setup takes < 2 minutes
- ✅ Zero AppleScript injection vulnerabilities
- ✅ Works with Ghostty 1.2.0+
- ✅ Handles 100+ lines of terminal output without lag

---

## Notes

- Ghostty's AppleScript API is in "preview" in v1.3, expect changes in v1.4
- Accessibility API works with Ghostty 1.2.0+ only
- Terminal output reading requires user to enable `macos-accessibility` in Ghostty config (default: true)
- Future: Could support other terminals (iTerm2, Terminal.app) with same architecture
