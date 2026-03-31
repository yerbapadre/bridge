import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ColorPreferences, UserPreferences, SavedTheme } from "@/types";

interface SettingsViewProps {}

function SettingsView({}: SettingsViewProps) {
  const [settingsView, setSettingsView] = useState<"appearance" | "customize">("appearance");

  return (
    <div className="flex-1 flex gap-6">
      {/* Settings Sidebar */}
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-1">
          <button
            onClick={() => setSettingsView("appearance")}
            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${
              settingsView === "appearance"
                ? "bg-accent text-primary font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setSettingsView("customize")}
            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${
              settingsView === "customize"
                ? "bg-accent text-primary font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            Customize
          </button>
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1">
        {settingsView === "appearance" ? (
          <AppearanceSettings />
        ) : (
          <CustomizeSettings />
        )}
      </div>
    </div>
  );
}

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

interface CustomizeSettingsProps {}

function CustomizeSettings({}: CustomizeSettingsProps) {
  const [newThemeName, setNewThemeName] = useState("");
  const [colors, setColors] = useState<ColorPreferences>({
    status_blocked: "220 38 38",
    status_ready: "79 70 229",
    status_in_progress: "20 158 158",
    status_done: "28 133 31",
    bg_primary: "247 249 251",
    bg_secondary: "240 242 245",
    bg_tertiary: "255 255 255",
    bg_quaternary: "226 232 240",
    text_primary: "42 44 48",
    text_secondary: "74 82 92",
    text_tertiary: "107 114 128",
    text_quaternary: "156 163 175",
    border_primary: "203 213 225",
    border_secondary: "226 232 240",
    accent_primary: "20 122 122",
    accent_hover: "13 93 93",
    accent_star: "245 158 11",
    sidebar_bg: "23 23 27",
    sidebar_border: "55 65 81",
    input_bg: "31 41 55",
    input_border: "75 85 99",
    button_secondary: "31 41 55",
    button_secondary_hover: "55 65 81",
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await invoke<UserPreferences>("get_preferences");
        setColors(prefs.colors);
        applyCSSColors(prefs.colors);
      } catch (e) {
        console.error("Failed to load preferences:", e);
      }
    };

    loadPreferences();
  }, []);

  const applyCSSColors = (colorPrefs: ColorPreferences) => {
    document.documentElement.style.setProperty("--color-status-blocked", colorPrefs.status_blocked);
    document.documentElement.style.setProperty("--color-status-ready", colorPrefs.status_ready);
    document.documentElement.style.setProperty("--color-status-in-progress", colorPrefs.status_in_progress);
    document.documentElement.style.setProperty("--color-status-done", colorPrefs.status_done);
    document.documentElement.style.setProperty("--color-bg-primary", colorPrefs.bg_primary);
    document.documentElement.style.setProperty("--color-bg-secondary", colorPrefs.bg_secondary);
    document.documentElement.style.setProperty("--color-bg-tertiary", colorPrefs.bg_tertiary);
    document.documentElement.style.setProperty("--color-bg-quaternary", colorPrefs.bg_quaternary);
    document.documentElement.style.setProperty("--color-text-primary", colorPrefs.text_primary);
    document.documentElement.style.setProperty("--color-text-secondary", colorPrefs.text_secondary);
    document.documentElement.style.setProperty("--color-text-tertiary", colorPrefs.text_tertiary);
    document.documentElement.style.setProperty("--color-text-quaternary", colorPrefs.text_quaternary);
    document.documentElement.style.setProperty("--color-border-primary", colorPrefs.border_primary);
    document.documentElement.style.setProperty("--color-border-secondary", colorPrefs.border_secondary);
    document.documentElement.style.setProperty("--color-accent-primary", colorPrefs.accent_primary);
    document.documentElement.style.setProperty("--color-accent-hover", colorPrefs.accent_hover);
    document.documentElement.style.setProperty("--color-accent-star", colorPrefs.accent_star);
    document.documentElement.style.setProperty("--color-sidebar-bg", colorPrefs.sidebar_bg);
    document.documentElement.style.setProperty("--color-sidebar-border", colorPrefs.sidebar_border);
    document.documentElement.style.setProperty("--color-input-bg", colorPrefs.input_bg);
    document.documentElement.style.setProperty("--color-input-border", colorPrefs.input_border);
    document.documentElement.style.setProperty("--color-button-secondary", colorPrefs.button_secondary);
    document.documentElement.style.setProperty("--color-button-secondary-hover", colorPrefs.button_secondary_hover);
  };

  const updateColor = async (key: keyof ColorPreferences, value: string) => {
    const newColors = { ...colors, [key]: value };
    setColors(newColors);

    // Update CSS variable
    const cssVarName = `--color-${key.replace(/_/g, "-")}`;
    document.documentElement.style.setProperty(cssVarName, value);

    // Save to backend
    try {
      await invoke("save_preferences_command", {
        prefs: { colors: newColors },
      });
    } catch (e) {
      console.error("Failed to save preferences:", e);
    }
  };

  const rgbToHex = (rgb: string): string => {
    const parts = rgb.split(" ").map((p) => parseInt(p.trim()));
    if (parts.length === 3) {
      return "#" + parts.map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return "#000000";
  };

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
    }
    return "0 0 0";
  };

  const saveTheme = async () => {
    if (!newThemeName.trim()) {
      alert("Please enter a theme name");
      return;
    }

    try {
      await invoke<SavedTheme>("save_theme", {
        input: { name: newThemeName, colors },
      });
      setNewThemeName("");
      alert(`Theme "${newThemeName}" saved! Go to Appearance to apply it.`);
    } catch (e) {
      console.error("Failed to save theme:", e);
      alert("Failed to save theme: " + e);
    }
  };

  const ColorInput = ({ label, colorKey }: { label: string; colorKey: keyof ColorPreferences }) => (
    <div className="flex items-center justify-between p-3 bg-secondary rounded border border-border-primary">
      <label className="text-sm font-medium text-primary">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={rgbToHex(colors[colorKey])}
          onChange={(e) => updateColor(colorKey, hexToRgb(e.target.value))}
          className="w-10 h-10 rounded border border-input-border cursor-pointer"
        />
        <input
          type="text"
          value={colors[colorKey]}
          onChange={(e) => updateColor(colorKey, e.target.value)}
          className="w-32 px-2 py-1 text-xs bg-input border border-input-border rounded font-mono text-primary"
          placeholder="R G B"
        />
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold mb-2 text-primary">Customize</h2>
        <p className="text-sm text-tertiary mb-6">
          Create your own custom theme. All values are in RGB format (space-separated).
        </p>

        <div className="space-y-6">
          <div className="bg-tertiary border border-border-primary rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-primary">Save Custom Theme</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Theme name"
                className="flex-1 px-3 py-2 bg-input border border-input-border rounded text-sm text-primary"
                onKeyDown={(e) => e.key === "Enter" && saveTheme()}
              />
              <button
                onClick={saveTheme}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-primary rounded text-sm font-medium"
              >
                Save Theme
              </button>
            </div>
            <p className="text-xs text-tertiary mt-2">
              Adjust the colors below, then save with a custom name
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Status Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Blocked" colorKey="status_blocked" />
              <ColorInput label="Ready" colorKey="status_ready" />
              <ColorInput label="In Progress" colorKey="status_in_progress" />
              <ColorInput label="Done" colorKey="status_done" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Background Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Primary" colorKey="bg_primary" />
              <ColorInput label="Secondary" colorKey="bg_secondary" />
              <ColorInput label="Tertiary" colorKey="bg_tertiary" />
              <ColorInput label="Quaternary" colorKey="bg_quaternary" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Text Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Primary" colorKey="text_primary" />
              <ColorInput label="Secondary" colorKey="text_secondary" />
              <ColorInput label="Tertiary" colorKey="text_tertiary" />
              <ColorInput label="Quaternary" colorKey="text_quaternary" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Border Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Primary" colorKey="border_primary" />
              <ColorInput label="Secondary" colorKey="border_secondary" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Accent Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Primary" colorKey="accent_primary" />
              <ColorInput label="Hover" colorKey="accent_hover" />
              <ColorInput label="Star" colorKey="accent_star" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Sidebar & UI Elements</h3>
            <div className="space-y-2">
              <ColorInput label="Sidebar Background" colorKey="sidebar_bg" />
              <ColorInput label="Sidebar Border" colorKey="sidebar_border" />
              <ColorInput label="Input Background" colorKey="input_bg" />
              <ColorInput label="Input Border" colorKey="input_border" />
              <ColorInput label="Secondary Button" colorKey="button_secondary" />
              <ColorInput label="Secondary Button Hover" colorKey="button_secondary_hover" />
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-tertiary border border-accent rounded">
          <p className="text-sm text-secondary">
            <strong>✓ Auto-saved:</strong> Your color preferences are automatically saved and will persist across sessions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
