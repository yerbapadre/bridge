import { useState } from "react";
import AppearanceSettings from "./settings/AppearanceSettings";
import CustomizeSettings from "./settings/CustomizeSettings";
import KeyboardShortcutsSettings from "./settings/KeyboardShortcutsSettings";

interface SettingsViewProps {}

function SettingsView({}: SettingsViewProps) {
  const [settingsView, setSettingsView] = useState<"appearance" | "customize" | "shortcuts">("appearance");

  return (
    <div className="flex-1 flex gap-6">
      {/* Settings Sidebar */}
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-1">
          <button
            onClick={() => setSettingsView("appearance")}
            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${
              settingsView === "appearance"
                ? "bg-accent font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setSettingsView("customize")}
            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${
              settingsView === "customize"
                ? "bg-accent font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            Customize
          </button>
          <button
            onClick={() => setSettingsView("shortcuts")}
            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${
              settingsView === "shortcuts"
                ? "bg-accent font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            Keyboard Shortcuts
          </button>
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1">
        {settingsView === "appearance" ? (
          <AppearanceSettings />
        ) : settingsView === "customize" ? (
          <CustomizeSettings />
        ) : (
          <KeyboardShortcutsSettings />
        )}
      </div>
    </div>
  );
}

export default SettingsView;
