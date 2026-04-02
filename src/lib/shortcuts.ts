export type ShortcutCategory =
  | "navigation"
  | "project"
  | "task"
  | "focus"
  | "track"
  | "terminal"
  | "notes"
  | "timer"
  | "global";

export interface Shortcut {
  id: string;
  label: string;
  keys: string[];
  category: ShortcutCategory;
  description?: string;
  condition?: "hasFocusTask" | "hasActiveTimer" | "boardView" | "activeView" | "notesView" | "hasCurrentProject";
}

export const shortcuts: Shortcut[] = [
  // Global
  {
    id: "openCommandPalette",
    label: "Open Command Palette",
    keys: ["Cmd", "K"],
    category: "global",
    description: "Open the command palette to search for actions"
  },
  {
    id: "toggleSidebar",
    label: "Toggle Sidebar",
    keys: ["Cmd", "B"],
    category: "global",
    description: "Collapse or expand the sidebar"
  },
  {
    id: "openSettings",
    label: "Open Settings",
    keys: ["Cmd", ","],
    category: "global",
    description: "Navigate to settings page"
  },
  {
    id: "closeModal",
    label: "Close Modal",
    keys: ["Escape"],
    category: "global",
    description: "Close any open modal or palette"
  },

  // Navigation
  {
    id: "goToActiveView",
    label: "Go to Active View",
    keys: ["1"],
    category: "navigation",
    description: "Switch to Active View"
  },
  {
    id: "goToBoardView",
    label: "Go to Board View",
    keys: ["2"],
    category: "navigation",
    description: "Switch to Board View"
  },
  {
    id: "goToTerminalsView",
    label: "Go to Terminals View",
    keys: ["3"],
    category: "navigation",
    description: "Switch to Terminals View"
  },
  {
    id: "goToRetroView",
    label: "Go to Retro View",
    keys: ["4"],
    category: "navigation",
    description: "Switch to Retro View"
  },
  {
    id: "goToNotesView",
    label: "Go to Notes View",
    keys: ["5"],
    category: "navigation",
    description: "Switch to Notes View"
  },

  // Projects
  {
    id: "quickSwitchProject",
    label: "Quick Switch Project",
    keys: ["Cmd", "P"],
    category: "project",
    description: "Quick switch between projects"
  },
  {
    id: "newProject",
    label: "New Project",
    keys: ["Cmd", "N"],
    category: "project",
    description: "Create a new project"
  },

  // Focus Task Actions
  {
    id: "advanceFocusTask",
    label: "Advance Focus Task Status",
    keys: ["Space"],
    category: "focus",
    description: "Advance the focus task to next status",
    condition: "hasFocusTask"
  },
  {
    id: "markFocusReady",
    label: "Mark Focus Task as Ready",
    keys: ["R"],
    category: "focus",
    description: "Mark the focus task as ready",
    condition: "hasFocusTask"
  },
  {
    id: "markFocusInProgress",
    label: "Mark Focus Task as In Progress",
    keys: ["I"],
    category: "focus",
    description: "Mark the focus task as in progress",
    condition: "hasFocusTask"
  },
  {
    id: "markFocusDone",
    label: "Mark Focus Task as Done",
    keys: ["Cmd", "Enter"],
    category: "focus",
    description: "Mark the focus task as done",
    condition: "hasFocusTask"
  },
  {
    id: "markFocusBlocked",
    label: "Mark Focus Task as Blocked",
    keys: ["B"],
    category: "focus",
    description: "Mark the focus task as blocked",
    condition: "hasFocusTask"
  },

  // Timer Actions
  {
    id: "startTimer",
    label: "Start/Resume Timer",
    keys: ["T"],
    category: "timer",
    description: "Start or resume the timer for focus task",
    condition: "hasFocusTask"
  },
  {
    id: "stopTimer",
    label: "Stop Timer",
    keys: ["Shift", "T"],
    category: "timer",
    description: "Stop the running timer",
    condition: "hasActiveTimer"
  },

  // Task Management
  {
    id: "newTask",
    label: "New Task",
    keys: ["N"],
    category: "task",
    description: "Create a new task",
    condition: "hasCurrentProject"
  },

  // Terminal Actions
  {
    id: "createTerminal",
    label: "Create New Terminal",
    keys: ["Cmd", "T"],
    category: "terminal",
    description: "Create a new terminal for focus task",
    condition: "hasFocusTask"
  },
  {
    id: "linkTerminal",
    label: "Link Existing Terminal",
    keys: ["Cmd", "Shift", "L"],
    category: "terminal",
    description: "Link an existing terminal to focus task",
    condition: "hasFocusTask"
  },

  // Notes
  {
    id: "newNote",
    label: "New Note",
    keys: ["Cmd", "Shift", "N"],
    category: "notes",
    description: "Create a new note"
  },

  // Track Management
  {
    id: "newTrack",
    label: "New Track",
    keys: ["Cmd", "Shift", "T"],
    category: "track",
    description: "Create a new track",
    condition: "boardView"
  }
];

export function formatShortcut(keys: string[]): string {
  return keys.join("+");
}

export function formatShortcutForDisplay(keys: string[]): string {
  return keys
    .map(key => {
      switch(key) {
        case "Cmd": return "⌘";
        case "Shift": return "⇧";
        case "Alt": return "⌥";
        case "Ctrl": return "⌃";
        case "Enter": return "↵";
        case "Escape": return "Esc";
        case "Space": return "Space";
        default: return key;
      }
    })
    .join("");
}

export function matchesShortcut(event: KeyboardEvent, keys: string[]): boolean {
  const requiredMods = {
    cmd: keys.includes("Cmd"),
    shift: keys.includes("Shift"),
    alt: keys.includes("Alt"),
    ctrl: keys.includes("Ctrl")
  };

  const actualMods = {
    cmd: event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
    ctrl: event.ctrlKey
  };

  // Check modifiers match
  if (
    requiredMods.cmd !== actualMods.cmd ||
    requiredMods.shift !== actualMods.shift ||
    requiredMods.alt !== actualMods.alt ||
    requiredMods.ctrl !== actualMods.ctrl
  ) {
    return false;
  }

  // Get the key part (non-modifier)
  const keyPart = keys.find(k => !["Cmd", "Shift", "Alt", "Ctrl"].includes(k));
  if (!keyPart) return false;

  // Special handling for Space
  if (keyPart === "Space") {
    return event.key === " ";
  }

  // Special handling for Enter
  if (keyPart === "Enter") {
    return event.key === "Enter";
  }

  // Special handling for Escape
  if (keyPart === "Escape") {
    return event.key === "Escape";
  }

  // Check key matches (case insensitive)
  return event.key.toLowerCase() === keyPart.toLowerCase();
}
