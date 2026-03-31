#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use db::{ActiveTimer, CreateProjectInput, CreateTaskInput, CreateTerminalSessionInput, CreateThemeInput, CreateTrackInput, Database, TerminalSession, TimeLog, UpdateTaskInput, UserPreferences};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};

struct AppState {
    db: Arc<Database>,
    prefs_path: PathBuf,
    prefs: Arc<Mutex<UserPreferences>>,
}

#[tauri::command]
fn create_track(
    state: State<AppState>,
    input: CreateTrackInput,
) -> Result<db::Track, String> {
    state.db.create_track(input).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_tracks(state: State<AppState>, project_id: Option<String>) -> Result<Vec<db::Track>, String> {
    state.db.get_tracks(project_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_track(
    state: State<AppState>,
    id: String,
    name: String,
    color: Option<String>,
) -> Result<db::Track, String> {
    state.db.update_track(&id, name, color).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_track(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.delete_track(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_task(
    state: State<AppState>,
    input: CreateTaskInput,
) -> Result<db::Task, String> {
    state.db.create_task(input).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_tasks(state: State<AppState>, track_id: Option<String>) -> Result<Vec<db::Task>, String> {
    state.db.get_tasks(track_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_task(
    state: State<AppState>,
    id: String,
    input: UpdateTaskInput,
) -> Result<db::Task, String> {
    state.db.update_task(&id, input).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_task(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.delete_task(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_dependency(
    state: State<AppState>,
    task_id: String,
    blocks_task_id: String,
) -> Result<db::TaskDependency, String> {
    state.db.add_dependency(&task_id, &blocks_task_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_dependencies(
    state: State<AppState>,
    task_id: Option<String>,
) -> Result<Vec<db::TaskDependency>, String> {
    state.db.get_dependencies(task_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_dependency(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.remove_dependency(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn auto_update_task_statuses(state: State<AppState>) -> Result<(), String> {
    state.db.auto_update_task_statuses().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_project(
    state: State<AppState>,
    input: CreateProjectInput,
) -> Result<db::Project, String> {
    state.db.create_project(input).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_projects(state: State<AppState>) -> Result<Vec<db::Project>, String> {
    state.db.get_projects().map_err(|e| e.to_string())
}

#[tauri::command]
fn update_project(
    state: State<AppState>,
    id: String,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<db::Project, String> {
    state.db.update_project(&id, name, description, color).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_project_task_count(state: State<AppState>, project_id: String) -> Result<i32, String> {
    state.db.get_project_task_count(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_project(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.delete_project(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_preferences(state: State<AppState>) -> Result<UserPreferences, String> {
    let prefs = state.prefs.lock().unwrap();
    Ok(prefs.clone())
}

#[tauri::command]
fn save_preferences_command(
    state: State<AppState>,
    prefs: UserPreferences,
) -> Result<(), String> {
    // Update in-memory preferences
    let mut current_prefs = state.prefs.lock().unwrap();
    *current_prefs = prefs.clone();
    drop(current_prefs);

    // Save to file
    db::save_preferences(&state.prefs_path, &prefs)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_theme(
    state: State<AppState>,
    input: CreateThemeInput,
) -> Result<db::SavedTheme, String> {
    state.db.save_theme(input).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_themes(state: State<AppState>) -> Result<Vec<db::SavedTheme>, String> {
    state.db.get_themes().map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_theme(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.delete_theme(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn reorder_tracks(
    state: State<AppState>,
    project_id: String,
    track_id: String,
    new_position: i32,
) -> Result<(), String> {
    state.db.reorder_tracks(&project_id, &track_id, new_position)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn reorder_tasks(
    state: State<AppState>,
    task_id: String,
    new_position: i32,
) -> Result<(), String> {
    state.db.reorder_tasks(&task_id, new_position)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_focus_task(state: State<AppState>, task_id: String) -> Result<db::Task, String> {
    state.db.set_focus_task(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_focus(state: State<AppState>) -> Result<(), String> {
    state.db.clear_focus().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_focus_task(state: State<AppState>) -> Result<Option<db::Task>, String> {
    state.db.get_focus_task().map_err(|e| e.to_string())
}

#[tauri::command]
fn start_timer(state: State<AppState>, task_id: String) -> Result<ActiveTimer, String> {
    state.db.start_timer(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_timer(state: State<AppState>, task_id: String) -> Result<Option<TimeLog>, String> {
    state.db.stop_timer(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_active_timer(state: State<AppState>) -> Result<Option<ActiveTimer>, String> {
    state.db.get_active_timer().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_time_logs(state: State<AppState>, task_id: String) -> Result<Vec<TimeLog>, String> {
    state.db.get_time_logs(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_total_time_for_task(state: State<AppState>, task_id: String) -> Result<i32, String> {
    state.db.get_total_time_for_task(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_terminal_session(
    state: State<AppState>,
    input: CreateTerminalSessionInput,
) -> Result<TerminalSession, String> {
    state.db.create_terminal_session(input).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_terminal_sessions(state: State<AppState>, task_id: String) -> Result<Vec<TerminalSession>, String> {
    state.db.get_terminal_sessions(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_all_terminal_sessions(state: State<AppState>) -> Result<Vec<TerminalSession>, String> {
    state.db.get_all_terminal_sessions().map_err(|e| e.to_string())
}

#[tauri::command]
fn update_terminal_session_focus(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.update_terminal_session_focus(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_terminal_session(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.delete_terminal_session(&id).map_err(|e| e.to_string())
}

/// Properly escape a string for use in AppleScript to prevent injection attacks
#[cfg(target_os = "macos")]
fn escape_applescript_string(s: &str) -> String {
    s.replace("\\", "\\\\")  // Backslash must be first
     .replace("\"", "\\\"")  // Escape double quotes
     .replace("\n", "\\n")   // Escape newlines
     .replace("\r", "\\r")   // Escape carriage returns
     .replace("\t", "\\t")   // Escape tabs
}

#[tauri::command]
fn focus_ghostty_window(window_title: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        // Properly escape the window title to prevent AppleScript injection
        let escaped_title = escape_applescript_string(&window_title);

        // Use Ghostty's native "focus" command (no Accessibility permissions needed!)
        let script = format!(
            r#"
            tell application "Ghostty"
                set matches to every terminal whose name is "{}"
                if (count of matches) > 0 then
                    focus item 1 of matches
                end if
            end tell
            "#,
            escaped_title
        );

        let output = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

        if !output.status.success() {
            return Err(format!("AppleScript failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Ghostty AppleScript is only supported on macOS".to_string())
    }
}

#[derive(Debug, serde::Serialize)]
struct GhosttyWindow {
    id: String,
    title: String,
    working_dir: Option<String>,
}

#[tauri::command]
fn list_ghostty_windows() -> Result<Vec<GhosttyWindow>, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let script = r#"
        tell application "Ghostty"
            set terminalList to {}
            repeat with t in (every terminal)
                set terminalInfo to {id:(id of t as string), title:(name of t)}
                set end of terminalList to terminalInfo
            end repeat
            return terminalList
        end tell
        "#;

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

        if !output.status.success() {
            return Err(format!("AppleScript failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let result = String::from_utf8_lossy(&output.stdout);

        // Parse AppleScript output format: "id:123, title:Some Title, id:456, title:Another"
        // This is a simple parser - in production you'd want more robust parsing
        let mut windows = Vec::new();
        let parts: Vec<&str> = result.trim().split(", ").collect();

        let mut i = 0;
        while i < parts.len() {
            if let Some(id_part) = parts.get(i) {
                if let Some(title_part) = parts.get(i + 1) {
                    if let Some(id) = id_part.strip_prefix("id:") {
                        if let Some(title) = title_part.strip_prefix("title:") {
                            windows.push(GhosttyWindow {
                                id: id.to_string(),
                                title: title.to_string(),
                                working_dir: None,
                            });
                        }
                    }
                }
            }
            i += 2;
        }

        Ok(windows)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Ghostty AppleScript is only supported on macOS".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_dir)
                .expect("Failed to create app data directory");

            let db_path = app_dir.join("bridge.db");
            let db = Database::new(db_path)
                .expect("Failed to initialize database");

            let prefs_path = app_dir.join("preferences.json");
            let prefs = db::load_preferences(&prefs_path);

            app.manage(AppState {
                db: Arc::new(db),
                prefs_path,
                prefs: Arc::new(Mutex::new(prefs)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project,
            get_projects,
            update_project,
            get_project_task_count,
            delete_project,
            create_track,
            get_tracks,
            update_track,
            delete_track,
            reorder_tracks,
            create_task,
            get_tasks,
            update_task,
            delete_task,
            reorder_tasks,
            add_dependency,
            get_dependencies,
            remove_dependency,
            auto_update_task_statuses,
            get_preferences,
            save_preferences_command,
            save_theme,
            get_themes,
            delete_theme,
            set_focus_task,
            clear_focus,
            get_focus_task,
            start_timer,
            stop_timer,
            get_active_timer,
            get_time_logs,
            get_total_time_for_task,
            create_terminal_session,
            get_terminal_sessions,
            get_all_terminal_sessions,
            update_terminal_session_focus,
            delete_terminal_session,
            focus_ghostty_window,
            list_ghostty_windows,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
