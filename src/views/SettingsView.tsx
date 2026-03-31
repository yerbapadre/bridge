import { useState } from "react";
import AppearanceSettings from "./settings/AppearanceSettings";
import CustomizeSettings from "./settings/CustomizeSettings";

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

export default SettingsView;
