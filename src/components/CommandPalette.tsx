import { useState, useEffect, useRef } from "react";
import Modal from "@/components/Modal";
import type { Project, Task, NoteItem } from "@/types";
import { shortcuts, formatShortcutForDisplay } from "@/lib/shortcuts";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (commandId: string, payload?: any) => void;
  projects: Project[];
  tasks: Task[];
  notes: NoteItem[];
  currentView: string;
  focusTask: Task | null;
  activeTimer: any;
  currentProjectId: string | null;
}

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category: string;
  keywords?: string[];
  payload?: any;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onExecuteCommand,
  projects,
  tasks,
  notes,
  currentView,
  focusTask,
  activeTimer,
  currentProjectId
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Generate commands from shortcuts and dynamic data
  const commands: Command[] = [
    // Shortcuts-based commands
    ...shortcuts
      .filter(shortcut => {
        // Filter based on conditions
        if (shortcut.condition === "hasFocusTask" && !focusTask) return false;
        if (shortcut.condition === "hasActiveTimer" && !activeTimer) return false;
        if (shortcut.condition === "boardView" && currentView !== "board") return false;
        if (shortcut.condition === "activeView" && currentView !== "active") return false;
        if (shortcut.condition === "notesView" && currentView !== "notes") return false;
        if (shortcut.condition === "hasCurrentProject" && !currentProjectId) return false;
        return true;
      })
      .map(shortcut => ({
        id: shortcut.id,
        label: shortcut.label,
        shortcut: formatShortcutForDisplay(shortcut.keys),
        category: shortcut.category,
        keywords: [shortcut.label.toLowerCase(), ...(shortcut.description?.toLowerCase().split(" ") || [])]
      })),

    // Dynamic project commands
    ...projects.map(project => ({
      id: `switchProject:${project.id}`,
      label: `Switch to ${project.name}`,
      category: "project",
      keywords: ["switch", "project", project.name.toLowerCase()],
      payload: { projectId: project.id }
    })),

    // Dynamic task commands (focus task switching)
    ...tasks
      .filter(t => t.status === "ready" || t.status === "in_progress")
      .map(task => ({
        id: `switchFocusTask:${task.id}`,
        label: `Focus: ${task.title}`,
        category: "task",
        keywords: ["focus", "switch", "task", task.title.toLowerCase()],
        payload: { taskId: task.id }
      })),

    // Dynamic note commands
    ...flattenNotes(notes).map(note => ({
      id: `openNote:${note.path}`,
      label: `Open: ${note.name.replace(".md", "")}`,
      category: "notes",
      keywords: ["open", "note", note.name.toLowerCase().replace(".md", "")],
      payload: { notePath: note.path }
    }))
  ];

  // Fuzzy search filter
  const filteredCommands = commands.filter(cmd => {
    if (!query.trim()) return true;

    const searchTerms = query.toLowerCase().split(" ");
    const searchableText = [
      cmd.label.toLowerCase(),
      ...(cmd.keywords || [])
    ].join(" ");

    return searchTerms.every(term => searchableText.includes(term));
  });

  // Group by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const categoryOrder = ["global", "navigation", "project", "task", "focus", "timer", "track", "terminal", "notes"];
  const categoryLabels: Record<string, string> = {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const executeCommand = (cmd: Command) => {
    onExecuteCommand(cmd.id, cmd.payload);
    onClose();
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  let commandIndex = 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 text-lg bg-input-bg border border-input-border text-primary rounded-lg focus:outline-none focus:border-accent-primary"
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-tertiary">
              No commands found
            </div>
          ) : (
            categoryOrder.map(category => {
              const cmds = groupedCommands[category];
              if (!cmds || cmds.length === 0) return null;

              return (
                <div key={category} className="mb-4">
                  <div className="text-xs font-semibold text-tertiary uppercase px-3 py-2">
                    {categoryLabels[category]}
                  </div>
                  <div className="space-y-1">
                    {cmds.map(cmd => {
                      const currentIndex = commandIndex++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <button
                          key={cmd.id}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-accent text-primary"
                              : "hover:bg-button-secondary text-secondary"
                          }`}
                        >
                          <span>{cmd.label}</span>
                          {cmd.shortcut && (
                            <span className={`text-xs font-mono px-2 py-1 rounded ${
                              isSelected ? "bg-black/10" : "bg-quaternary"
                            }`}>
                              {cmd.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-sidebar text-xs text-tertiary flex items-center justify-between">
          <div className="flex gap-4">
            <span><span className="font-mono bg-quaternary px-1.5 py-0.5 rounded">↑↓</span> Navigate</span>
            <span><span className="font-mono bg-quaternary px-1.5 py-0.5 rounded">↵</span> Select</span>
            <span><span className="font-mono bg-quaternary px-1.5 py-0.5 rounded">Esc</span> Close</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function flattenNotes(notes: NoteItem[]): NoteItem[] {
  const result: NoteItem[] = [];

  function flatten(items: NoteItem[]) {
    for (const item of items) {
      if (!item.is_folder) {
        result.push(item);
      }
      if (item.children) {
        flatten(item.children);
      }
    }
  }

  flatten(notes);
  return result;
}
