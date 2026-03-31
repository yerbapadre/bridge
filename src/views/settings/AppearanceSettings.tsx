import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ColorPreferences, UserPreferences, SavedTheme } from "@/types";

interface AppearanceSettingsProps {}

function AppearanceSettings({}: AppearanceSettingsProps) {
  const [themes, setThemes] = useState<SavedTheme[]>([]);
  const [currentColors, setCurrentColors] = useState<ColorPreferences | null>(null);

  useEffect(() => {
    loadThemes();
    loadCurrentPreferences();
  }, []);

  const loadThemes = async () => {
    try {
      const themesData = await invoke<SavedTheme[]>("get_themes");
      setThemes(themesData);
    } catch (e) {
      console.error("Failed to load themes:", e);
    }
  };

  const loadCurrentPreferences = async () => {
    try {
      const prefs = await invoke<UserPreferences>("get_preferences");
      setCurrentColors(prefs.colors);
    } catch (e) {
      console.error("Failed to load current preferences:", e);
    }
  };

  const isThemeActive = (theme: SavedTheme): boolean => {
    if (!currentColors) return false;
    return JSON.stringify(theme.colors) === JSON.stringify(currentColors);
  };

  const applyTheme = async (theme: SavedTheme) => {
    const colors = theme.colors;

    // Apply colors to CSS variables
    document.documentElement.style.setProperty("--color-status-blocked", colors.status_blocked);
    document.documentElement.style.setProperty("--color-status-ready", colors.status_ready);
    document.documentElement.style.setProperty("--color-status-in-progress", colors.status_in_progress);
    document.documentElement.style.setProperty("--color-status-done", colors.status_done);
    document.documentElement.style.setProperty("--color-bg-primary", colors.bg_primary);
    document.documentElement.style.setProperty("--color-bg-secondary", colors.bg_secondary);
    document.documentElement.style.setProperty("--color-bg-tertiary", colors.bg_tertiary);
    document.documentElement.style.setProperty("--color-bg-quaternary", colors.bg_quaternary);
    document.documentElement.style.setProperty("--color-text-primary", colors.text_primary);
    document.documentElement.style.setProperty("--color-text-secondary", colors.text_secondary);
    document.documentElement.style.setProperty("--color-text-tertiary", colors.text_tertiary);
    document.documentElement.style.setProperty("--color-text-quaternary", colors.text_quaternary);
    document.documentElement.style.setProperty("--color-border-primary", colors.border_primary);
    document.documentElement.style.setProperty("--color-border-secondary", colors.border_secondary);
    document.documentElement.style.setProperty("--color-accent-primary", colors.accent_primary);
    document.documentElement.style.setProperty("--color-accent-hover", colors.accent_hover);
    document.documentElement.style.setProperty("--color-accent-star", colors.accent_star);
    document.documentElement.style.setProperty("--color-sidebar-bg", colors.sidebar_bg);
    document.documentElement.style.setProperty("--color-sidebar-border", colors.sidebar_border);
    document.documentElement.style.setProperty("--color-input-bg", colors.input_bg);
    document.documentElement.style.setProperty("--color-input-border", colors.input_border);
    document.documentElement.style.setProperty("--color-button-secondary", colors.button_secondary);
    document.documentElement.style.setProperty("--color-button-secondary-hover", colors.button_secondary_hover);

    // Update local state
    setCurrentColors(colors);

    try {
      await invoke("save_preferences_command", {
        prefs: { colors: theme.colors },
      });
    } catch (e) {
      console.error("Failed to save preferences:", e);
    }
  };

  const deleteTheme = async (id: string) => {
    if (!confirm("Delete this theme?")) return;

    try {
      await invoke("delete_theme", { id });
      await loadThemes();
    } catch (e) {
      console.error("Failed to delete theme:", e);
    }
  };

  const exportTheme = (theme: SavedTheme) => {
    const dataStr = JSON.stringify({ name: theme.name, colors: theme.colors }, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${theme.name.replace(/\s+/g, "-").toLowerCase()}-theme.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.name || !data.colors) {
          alert("Invalid theme file format");
          return;
        }

        await invoke<SavedTheme>("save_theme", {
          input: { name: data.name, colors: data.colors },
        });
        await loadThemes();
      } catch (e) {
        console.error("Failed to import theme:", e);
        alert("Failed to import theme: " + e);
      }
    };
    input.click();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-primary">Appearance</h2>
        <p className="text-sm text-tertiary mb-4">Choose a preset theme or apply your custom themes</p>
        <button
          onClick={importTheme}
          className="px-4 py-2 bg-button-secondary hover:bg-button-secondary-hover text-secondary rounded text-sm transition-colors"
        >
          Import Theme
        </button>
      </div>

      {themes.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          <p>No themes available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {themes.map((theme) => {
            const isActive = isThemeActive(theme);
            return (
              <div
                key={theme.id}
                className={`bg-tertiary border rounded-lg p-4 transition-colors relative ${
                  isActive
                    ? "border-accent ring-2 ring-accent ring-opacity-50"
                    : "border-border-primary hover:border-accent"
                }`}
              >
                {isActive && (
                  <div className="absolute top-3 right-3 bg-accent text-primary text-xs font-semibold px-2 py-1 rounded">
                    Active
                  </div>
                )}

                <h3 className="text-lg font-semibold mb-3 text-primary pr-16">{theme.name}</h3>

                {/* Color Preview */}
                <div className="mb-4 grid grid-cols-3 grid-rows-2 gap-1 h-20 rounded overflow-hidden">
                  <div style={{ backgroundColor: `rgb(${theme.colors.bg_primary})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.accent_primary})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.status_in_progress})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.status_ready})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.sidebar_bg})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.text_primary})` }} />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => applyTheme(theme)}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-button-secondary text-tertiary cursor-default"
                        : "bg-accent hover:bg-accent-hover text-primary"
                    }`}
                    disabled={isActive}
                  >
                    {isActive ? "Applied" : "Apply"}
                  </button>
                <button
                  onClick={() => exportTheme(theme)}
                  className="px-3 py-2 bg-button-secondary hover:bg-button-secondary-hover text-secondary rounded text-sm transition-colors"
                  title="Export theme"
                >
                  ↓
                </button>
                <button
                  onClick={() => deleteTheme(theme.id)}
                  className="px-3 py-2 bg-button-secondary hover:bg-button-secondary-hover text-error rounded text-sm transition-colors"
                  title="Delete theme"
                >
                  ×
                </button>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}

export default AppearanceSettings;
