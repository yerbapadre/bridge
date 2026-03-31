export interface ColorPreferences {
  status_blocked: string;
  status_ready: string;
  status_in_progress: string;
  status_done: string;
  bg_primary: string;
  bg_secondary: string;
  bg_tertiary: string;
  bg_quaternary: string;
  text_primary: string;
  text_secondary: string;
  text_tertiary: string;
  text_quaternary: string;
  border_primary: string;
  border_secondary: string;
  accent_primary: string;
  accent_hover: string;
  accent_star: string;
  sidebar_bg: string;
  sidebar_border: string;
  input_bg: string;
  input_border: string;
  button_secondary: string;
  button_secondary_hover: string;
}

export interface UserPreferences {
  colors: ColorPreferences;
}

export interface SavedTheme {
  id: string;
  name: string;
  colors: ColorPreferences;
  created_at: number;
}
