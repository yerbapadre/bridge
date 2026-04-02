import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Project, NoteItem } from "@/types";

interface SidebarProps {
  projects: Project[];
  currentProjectId: string | null;
  currentView: "board" | "active" | "retro" | "terminals" | "settings" | "notes";
  notes: NoteItem[];
  currentNotePath: string | null;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => Promise<void>;
  onUpdateProject: (id: string, name: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onSelectNote: (path: string) => void;
  onCreateNote: (path: string) => Promise<void>;
  onCreateFolder: (path: string) => Promise<void>;
  onDeleteNote: (path: string) => Promise<void>;
  onNavigateToSettings: () => void;
}

export default function Sidebar({
  projects,
  currentProjectId,
  currentView,
  notes,
  currentNotePath,
  collapsed,
  setCollapsed,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onSelectNote,
  onCreateNote,
  onCreateFolder: _onCreateFolder,
  onDeleteNote: _onDeleteNote,
  onNavigateToSettings,
}: SidebarProps) {
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteName, setNewNoteName] = useState("");

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuProjectId(null);
    if (openMenuProjectId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuProjectId]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await onCreateProject(newProjectName);
    setNewProjectName("");
    setIsAddingProject(false);
  };

  const handleUpdateProject = async () => {
    if (!editingProjectId || !editingProjectName.trim()) return;
    await onUpdateProject(editingProjectId, editingProjectName);
    setEditingProjectId(null);
    setEditingProjectName("");
  };

  const handleCreateNote = async () => {
    if (!newNoteName.trim()) return;
    const fileName = newNoteName.endsWith(".md") ? newNoteName : `${newNoteName}.md`;
    await onCreateNote(fileName);
    setNewNoteName("");
    setIsAddingNote(false);
  };

  const renderNoteTree = (items: NoteItem[], depth = 0) => {
    return items.map((item) => (
      <div key={item.path} style={{ marginLeft: `${depth * 12}px` }}>
        {item.is_folder ? (
          <div className="text-sm text-tertiary py-1 px-2 truncate">
            📁 {item.name}
          </div>
        ) : (
          <button
            onClick={() => onSelectNote(item.path)}
            className={`w-full text-left px-2 py-1 rounded text-sm transition-colors truncate ${
              currentNotePath === item.path
                ? "bg-accent font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            📄 {item.name.replace(".md", "")}
          </button>
        )}
        {item.children && renderNoteTree(item.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div
      className={`bg-sidebar border-r border-sidebar flex flex-col flex-shrink-0 h-full transition-all duration-300 ${
        collapsed ? "w-16" : "w-80"
      }`}
    >
      <div className={`p-4 border-b border-sidebar flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <h2 className="font-bold text-lg text-primary">Bridge</h2>}
        <Tooltip>
          <TooltipTrigger
            onClick={() => setCollapsed(!collapsed)}
            className={`text-tertiary hover:text-secondary transition-colors ${collapsed ? 'text-xl' : 'text-sm'}`}
          >
            {collapsed ? "›" : "‹"}
          </TooltipTrigger>
          <TooltipContent>
            <p>{collapsed ? "Expand" : "Collapse"} Sidebar (⌘B)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {collapsed ? (
        <div className="flex-1"></div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-tertiary hover:text-secondary flex items-center justify-between gap-2"
            >
              <span>PROJECTS</span>
              <span>{projectsExpanded ? "▼" : "▶"}</span>
            </button>

            {projectsExpanded && (
              <div className="mt-1 ml-2">
                {projects.map((project) => (
                  editingProjectId === project.id ? (
                    <div key={project.id} className="flex gap-2 px-2 py-1 mb-1">
                      <input
                        type="text"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateProject();
                          if (e.key === "Escape") {
                            setEditingProjectId(null);
                            setEditingProjectName("");
                          }
                        }}
                        onBlur={() => {
                          if (editingProjectName.trim()) {
                            handleUpdateProject();
                          } else {
                            setEditingProjectId(null);
                            setEditingProjectName("");
                          }
                        }}
                        autoFocus
                        className="flex-1 bg-tertiary border border-border-primary rounded px-2 py-1 text-sm text-primary"
                      />
                    </div>
                  ) : (
                    <div key={project.id} className="group relative mb-1">
                      <div className={`w-full rounded text-sm transition-colors flex items-center justify-between ${
                        currentProjectId === project.id && currentView !== "settings"
                          ? "bg-accent font-medium"
                          : "hover:bg-button-secondary"
                      }`}>
                        <button
                          onClick={() => onSelectProject(project.id)}
                          className={`flex-1 text-left px-3 py-2 truncate ${
                            currentProjectId === project.id && currentView !== "settings"
                              ? ""
                              : "text-secondary"
                          }`}
                        >
                          {project.name}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuProjectId(openMenuProjectId === project.id ? null : project.id);
                          }}
                          className="text-tertiary hover:text-secondary text-sm px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="More options"
                        >
                          ⋯
                        </button>
                      </div>
                      {openMenuProjectId === project.id && (
                        <div className="absolute right-2 top-10 bg-button-secondary border border-sidebar rounded shadow-lg z-10 min-w-[150px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProjectId(project.id);
                              setEditingProjectName(project.name);
                              setOpenMenuProjectId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-secondary"
                          >
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProject(project.id);
                              setOpenMenuProjectId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-error"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )
                ))}

                {isAddingProject ? (
                  <div className="flex gap-2 px-3 py-2">
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateProject();
                        if (e.key === "Escape") {
                          setIsAddingProject(false);
                          setNewProjectName("");
                        }
                      }}
                      onBlur={() => {
                        if (!newProjectName.trim()) {
                          setIsAddingProject(false);
                        }
                      }}
                      placeholder="Project name..."
                      autoFocus
                      className="flex-1 bg-input border border-input rounded px-2 py-1 text-sm text-primary"
                    />
                    <button
                      onClick={handleCreateProject}
                      className="bg-accent px-2 py-1 rounded text-xs"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingProject(true)}
                    className="w-full text-left px-3 py-2 rounded text-sm text-tertiary hover:text-secondary hover:bg-button-secondary truncate"
                  >
                    + New Project
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-tertiary hover:text-secondary flex items-center justify-between gap-2 mt-4"
            >
              <span>NOTES</span>
              <span>{notesExpanded ? "▼" : "▶"}</span>
            </button>

            {notesExpanded && (
              <div className="mt-1 ml-2">
                {renderNoteTree(notes)}

                {isAddingNote ? (
                  <div className="flex gap-2 px-3 py-2">
                    <input
                      type="text"
                      value={newNoteName}
                      onChange={(e) => setNewNoteName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateNote();
                        if (e.key === "Escape") {
                          setIsAddingNote(false);
                          setNewNoteName("");
                        }
                      }}
                      onBlur={() => {
                        if (!newNoteName.trim()) {
                          setIsAddingNote(false);
                        }
                      }}
                      placeholder="Note name..."
                      autoFocus
                      className="flex-1 bg-input border border-input rounded px-2 py-1 text-sm text-primary"
                    />
                    <button
                      onClick={handleCreateNote}
                      className="bg-accent px-2 py-1 rounded text-xs"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="w-full text-left px-3 py-2 rounded text-sm text-tertiary hover:text-secondary hover:bg-button-secondary truncate"
                  >
                    + New Note
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-sidebar p-2">
        <Tooltip>
          <TooltipTrigger
            onClick={onNavigateToSettings}
            className={`w-full px-3 py-2 rounded text-sm transition-colors ${
              collapsed ? 'text-center' : 'text-left flex items-center gap-2'
            } ${
              currentView === "settings"
                ? "bg-accent font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            {collapsed ? (
              <span className="text-2xl">⚙</span>
            ) : (
              <>
                <span className="text-2xl">⚙</span>
                <span className="text-sm">Settings</span>
              </>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>Settings (⌘,)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
