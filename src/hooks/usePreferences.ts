import { useEffect } from "react";
import * as api from "@/lib/api";
import { applyThemeColors } from "@/lib/theme";

export function usePreferences() {
  const loadAndApplyPreferences = async () => {
    try {
      const prefs = await api.getPreferences();
      applyThemeColors(prefs.colors);
    } catch (e) {
      console.error("Failed to load preferences:", e);
    }
  };

  useEffect(() => {
    loadAndApplyPreferences();
  }, []);

  return { loadAndApplyPreferences };
}
