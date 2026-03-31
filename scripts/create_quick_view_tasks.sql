-- SQL Script to Create Terminal Quick View Tasks in Bridge
-- Project: (System) Bridge
-- Track: Features (main track)

-- Variables (replace with actual values)
-- project_id: ba9888fa-238d-4b17-a5fb-2610d7ba1f36
-- track_id: 2d855706-c70f-46f3-9404-f5e9edb092e1

-- Parent Task
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES (
    'tqv-parent-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Terminal Quick View - Full Implementation',
    'Add ability to create Ghostty terminals from tasks, send commands, and view output inline without switching windows. Implementation plan in TERMINAL_QUICK_VIEW_PLAN.md',
    'ready',
    (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE track_id = '2d855706-c70f-46f3-9404-f5e9edb092e1' AND parent_task_id IS NULL),
    NULL,
    0,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 1: Create New Terminals (Day 1)
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES (
    'tqv-phase1-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Phase 1: Create New Terminals',
    'Implement create_ghostty_window() Rust command, API layer, hook, and UI modal to create new Ghostty terminals from tasks',
    'ready',
    0,
    'tqv-parent-001',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 1 Subtasks
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES
(
    'tqv-p1-rust-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Implement create_ghostty_window() Rust command',
    'Add Tauri command to src-tauri/src/main.rs after line 378. Uses AppleScript "new surface configuration" to create window with working_dir and initial_command. Returns TerminalSession.',
    'ready',
    0,
    'tqv-phase1-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p1-api-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add createGhosttyWindow() to API layer',
    'Add function to src/lib/api.ts after line 177. Wraps Tauri invoke call.',
    'ready',
    1,
    'tqv-phase1-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p1-hook-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add createNewTerminal() to useTerminals hook',
    'Update src/hooks/useTerminals.ts after line 58. Wraps API call with error handling.',
    'ready',
    2,
    'tqv-phase1-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p1-ui-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Build "Create Terminal" modal UI',
    'Add modal to src/App.tsx after line 763. Include fields for working_directory and initial_command. Follow existing modal pattern (lines 719-763).',
    'ready',
    3,
    'tqv-phase1-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p1-test-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Test: Create terminal from task',
    'Verify can create new Ghostty window from task, auto-links to task, sets working dir and runs command. Test checkpoint.',
    'ready',
    4,
    'tqv-phase1-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 2: Send Commands (Day 1)
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES (
    'tqv-phase2-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Phase 2: Send Commands to Terminal',
    'Implement send_command_to_terminal() using AppleScript "input text" and "send key enter"',
    'ready',
    1,
    'tqv-parent-001',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 2 Subtasks
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES
(
    'tqv-p2-rust-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Implement send_command_to_terminal() Rust command',
    'Add to src-tauri/src/main.rs. Uses AppleScript to match terminal by name, then "input text" and "send key enter". Must use escape_applescript_string().',
    'ready',
    0,
    'tqv-phase2-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p2-api-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add sendCommandToTerminal() to API layer',
    'Add function to src/lib/api.ts. Takes terminal_name and command.',
    'ready',
    1,
    'tqv-phase2-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p2-hook-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add sendCommandToTerminal() to useTerminals hook',
    'Wrap API call with error handling in src/hooks/useTerminals.ts.',
    'ready',
    2,
    'tqv-phase2-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p2-test-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Test: Send command to terminal',
    'Verify can send "echo hello" from Bridge and see it execute in Ghostty. Test checkpoint.',
    'ready',
    3,
    'tqv-phase2-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 3: Read Terminal Output (Days 2-3)
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES (
    'tqv-phase3-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Phase 3: Read Terminal Output',
    'Implement read_terminal_output() using macOS Accessibility API (AXUIElement). Requires user to grant Accessibility permissions.',
    'ready',
    2,
    'tqv-parent-001',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 3 Subtasks
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES
(
    'tqv-p3-deps-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add Rust dependencies for Accessibility API',
    'Add to Cargo.toml: cocoa = "0.25", objc = "0.2", core-foundation = "0.9"',
    'ready',
    0,
    'tqv-phase3-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p3-rust-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Implement read_terminal_output() Rust command',
    'Use AXUIElementCreateApplication(pid) → traverse to AXTextArea → read kAXValueAttribute. See TERMINAL_QUICK_VIEW_PLAN.md Phase 3 for hierarchy details.',
    'ready',
    1,
    'tqv-phase3-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p3-api-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add readTerminalOutput() to API layer',
    'Add function to src/lib/api.ts. Returns {lines: string[], full_text: string}.',
    'ready',
    2,
    'tqv-phase3-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p3-hook-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add readTerminalOutput() to useTerminals hook',
    'Wrap API call, handle accessibility permission errors gracefully.',
    'ready',
    3,
    'tqv-phase3-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p3-test-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Test: Read terminal output',
    'Run command in Ghostty, then read buffer from Bridge. Verify ANSI colors preserved. Test checkpoint.',
    'ready',
    4,
    'tqv-phase3-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 4: Quick View Modal (Day 3)
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES (
    'tqv-phase4-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Phase 4: Quick View Modal UI',
    'Build modal with terminal output display, command input field, and actions (focus, refresh, close)',
    'ready',
    3,
    'tqv-parent-001',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 4 Subtasks
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES
(
    'tqv-p4-ansi-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add ANSI parsing library',
    'npm install ansi-to-html. Create parseAnsiToHtml() util in src/utils/ansi.ts.',
    'ready',
    0,
    'tqv-phase4-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p4-ui-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Build Quick View modal component',
    'Add modal to src/App.tsx. Header (terminal info), output display (monospace, ANSI colors), input field, actions. See plan for full code.',
    'ready',
    1,
    'tqv-phase4-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p4-kbd-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add keyboard shortcuts to modal',
    'Cmd+Enter (send), Cmd+R (refresh), Esc (close). Use onKeyDown handlers.',
    'ready',
    2,
    'tqv-phase4-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p4-test-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Test: Full quick view workflow',
    'Open modal, see output, send command, see new output, use keyboard shortcuts. Test checkpoint.',
    'ready',
    3,
    'tqv-phase4-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 5: Accessibility Permissions (Day 4)
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES (
    'tqv-phase5-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Phase 5: Accessibility Permission Handling',
    'Check permission status, show banner when denied, one-click settings opener',
    'ready',
    4,
    'tqv-parent-001',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 5 Subtasks
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES
(
    'tqv-p5-check-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Implement check_accessibility_permission() Rust command',
    'Use AXIsProcessTrustedWithOptions() to check if Bridge has permissions.',
    'ready',
    0,
    'tqv-phase5-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p5-open-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Implement open_accessibility_settings() Rust command',
    'Use "open x-apple.systempreferences:..." to jump to Accessibility settings.',
    'ready',
    1,
    'tqv-phase5-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p5-ui-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add permission banner to UI',
    'Show warning banner when accessibilityGranted === false. "Open Settings" button. See plan for code.',
    'ready',
    2,
    'tqv-phase5-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p5-fallback-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Graceful fallback when permission denied',
    'Can still create terminals and send commands. Only reading is disabled. Show helpful message.',
    'ready',
    3,
    'tqv-phase5-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 6: Polish & Documentation (Day 5)
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES (
    'tqv-phase6-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Phase 6: Polish & Documentation',
    'Error handling, loading states, edge cases, update docs',
    'ready',
    5,
    'tqv-parent-001',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Phase 6 Subtasks
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES
(
    'tqv-p6-errors-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add error states and handling',
    'Terminal not found, command failed, Ghostty not running, etc. User-friendly error messages.',
    'ready',
    0,
    'tqv-phase6-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p6-loading-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Add loading states for async operations',
    'Spinners for: creating terminal, reading output, sending command.',
    'ready',
    1,
    'tqv-phase6-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p6-edge-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Test edge cases',
    'Terminal closed mid-operation, rapid commands, special characters in input, long output (>1000 lines).',
    'ready',
    2,
    'tqv-phase6-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p6-docs-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Update DEVELOPMENT.md',
    'Document new features: creating terminals, sending commands, reading output, quick view modal.',
    'ready',
    3,
    'tqv-phase6-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'tqv-p6-readme-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    'Update README.md',
    'Add "Terminal Quick View" to features list with brief description.',
    'ready',
    4,
    'tqv-phase6-001',
    2,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Final Ship Task
INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
VALUES (
    'tqv-ship-001',
    '2d855706-c70f-46f3-9404-f5e9edb092e1',
    '🚀 Ship Terminal Quick View v1',
    'Final testing, commit, build production binary, celebrate! All 5 core features working: create terminals, send commands, read output, quick view modal, permissions.',
    'ready',
    6,
    'tqv-parent-001',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);
