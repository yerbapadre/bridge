import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ColorPreferences, UserPreferences, SavedTheme } from "@/types";

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

export default CustomizeSettings;
