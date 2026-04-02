import { shortcuts, formatShortcutForDisplay, type ShortcutCategory } from "@/lib/shortcuts";

const categoryLabels: Record<ShortcutCategory, string> = {
  global: "Global",
  navigation: "Navigation",
  project: "Projects",
  task: "Tasks",
  focus: "Focus Task",
  timer: "Timer",
  track: "Tracks",
  terminal: "Terminals",
  notes: "Notes"
};

const categoryDescriptions: Record<ShortcutCategory, string> = {
  global: "Shortcuts that work anywhere in the app",
  navigation: "Switch between different views",
  project: "Manage and switch projects",
  task: "Create and manage tasks",
  focus: "Control your focus task",
  timer: "Start and stop time tracking",
  track: "Manage workflow tracks",
  terminal: "Manage terminal sessions",
  notes: "Create and manage notes"
};

export default function KeyboardShortcutsSettings() {
  const categorizedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<ShortcutCategory, typeof shortcuts>);

  const categoryOrder: ShortcutCategory[] = [
    "global",
    "navigation",
    "project",
    "task",
    "focus",
    "timer",
    "track",
    "terminal",
    "notes"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">Keyboard Shortcuts</h2>
        <p className="text-sm text-tertiary">
          Learn the keyboard shortcuts to work faster and more efficiently
        </p>
      </div>

      <div className="bg-tertiary/10 border border-sidebar rounded-lg p-4">
        <p className="text-sm text-secondary">
          Press <kbd className="px-2 py-1 bg-quaternary border border-sidebar rounded text-xs font-mono">⌘K</kbd> at any time to open the command palette and search for actions.
        </p>
      </div>

      {categoryOrder.map(category => {
        const categoryShortcuts = categorizedShortcuts[category];
        if (!categoryShortcuts || categoryShortcuts.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-primary">{categoryLabels[category]}</h3>
              <p className="text-sm text-tertiary">{categoryDescriptions[category]}</p>
            </div>

            <div className="bg-tertiary rounded-lg overflow-hidden border border-sidebar">
              {categoryShortcuts.map((shortcut, index) => (
                <div
                  key={shortcut.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    index !== categoryShortcuts.length - 1 ? "border-b border-sidebar" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-primary">{shortcut.label}</div>
                    {shortcut.description && (
                      <div className="text-xs text-tertiary mt-1">{shortcut.description}</div>
                    )}
                    {shortcut.condition && (
                      <div className="text-xs text-quaternary mt-1 italic">
                        {getConditionLabel(shortcut.condition)}
                      </div>
                    )}
                  </div>
                  <kbd className="ml-4 px-3 py-1.5 bg-quaternary border border-sidebar rounded text-sm font-mono text-primary whitespace-nowrap">
                    {formatShortcutForDisplay(shortcut.keys)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="mt-8 pt-6 border-t border-sidebar">
        <h3 className="text-lg font-semibold text-primary mb-2">Tips</h3>
        <ul className="space-y-2 text-sm text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            <span>Most shortcuts are disabled when typing in text fields</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            <span>Single-key shortcuts (1-5, N, R, etc.) work when no input is focused</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            <span>Some shortcuts are only available in specific contexts (e.g., when a focus task exists)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            <span>Press Escape to close any open modal or command palette</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function getConditionLabel(condition: string): string {
  switch (condition) {
    case "hasFocusTask":
      return "Only available when a task is in focus";
    case "hasActiveTimer":
      return "Only available when timer is running";
    case "boardView":
      return "Only available in Board View";
    case "activeView":
      return "Only available in Active View";
    case "notesView":
      return "Only available in Notes View";
    case "hasCurrentProject":
      return "Only available when a project is selected";
    default:
      return "";
  }
}
