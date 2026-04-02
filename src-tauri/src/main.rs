#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use db::{ActiveTimer, CreateProjectInput, CreateTaskInput, CreateTerminalSessionInput, CreateThemeInput, CreateTrackInput, Database, TerminalSession, TimeLog, UpdateTaskInput, UserPreferences};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use std::fs;

struct AppState {
    db: Arc<Database>,
    prefs_path: PathBuf,
    prefs: Arc<Mutex<UserPreferences>>,
    notes_dir: PathBuf,
}

#[derive(Debug, serde::Deserialize)]
struct CreateGhosttyWindowInput {
    task_id: String,
    task_title: String,
    working_directory: Option<String>,
    initial_command: Option<String>,
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
fn update_project_root_path(
    state: State<AppState>,
    id: String,
    root_path: Option<String>,
) -> Result<(), String> {
    state.db.update_project_root_path(&id, root_path).map_err(|e| e.to_string())
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
fn set_focus_task(state: State<AppState>, project_id: String, task_id: String) -> Result<db::Task, String> {
    state.db.set_focus_task(&project_id, &task_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_focus(state: State<AppState>, project_id: String) -> Result<(), String> {
    state.db.clear_focus(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_focus_task(state: State<AppState>, project_id: String) -> Result<Option<db::Task>, String> {
    state.db.get_focus_task(&project_id).map_err(|e| e.to_string())
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
            set terminalList to ""
            set first_item to true
            repeat with t in (every terminal)
                if first_item then
                    set first_item to false
                else
                    set terminalList to terminalList & ", "
                end if
                set terminalList to terminalList & "id:" & (id of t as string) & ", title:" & (name of t)
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

#[tauri::command]
fn create_ghostty_window(
    state: State<AppState>,
    input: CreateGhosttyWindowInput,
) -> Result<TerminalSession, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        // Default to home directory if none specified
        let working_dir = input.working_directory
            .unwrap_or_else(|| std::env::var("HOME").unwrap_or_else(|_| "/".to_string()));

        // Escape values for AppleScript
        let escaped_dir = escape_applescript_string(&working_dir);
        let escaped_title = escape_applescript_string(&input.task_title);

        // Build configuration (just working directory, no command)
        let config_lines = vec![
            "set cfg to new surface configuration".to_string(),
            format!("set initial working directory of cfg to \"{}\"", escaped_dir),
        ];

        // Prepare command to send after window opens (if provided)
        let command_script = if let Some(cmd) = &input.initial_command {
            let escaped_cmd = escape_applescript_string(cmd);
            format!(
                "                -- Send the command to the terminal\n\
                                 input text \"{}\" to newTerm\n\
                                 send key \"enter\" to newTerm",
                escaped_cmd
            )
        } else {
            String::new()
        };

        // Build full AppleScript
        let script = format!(
            r#"
            tell application "Ghostty"
                {}
                set win to new window with configuration cfg

                -- Get the new terminal's info
                set newTerm to focused terminal of selected tab of win
                set termId to id of newTerm as string
                set termTitle to name of newTerm

                {}

                return "id:" & termId & ", title:" & termTitle
            end tell
            "#,
            config_lines.join("\n                "),
            command_script
        );

        // Execute AppleScript
        let output = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

        if !output.status.success() {
            return Err(format!("AppleScript failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        // Parse response: "id:UUID, title:Title"
        let result = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = result.trim().split(", ").collect();

        let terminal_uuid = parts.get(0)
            .and_then(|s| s.strip_prefix("id:"))
            .unwrap_or("")
            .to_string();

        let window_title = parts.get(1)
            .and_then(|s| s.strip_prefix("title:"))
            .unwrap_or(&escaped_title)
            .to_string();

        // Create terminal session record
        let session = state.db.create_terminal_session(CreateTerminalSessionInput {
            task_id: input.task_id,
            terminal_app: "ghostty".to_string(),
            terminal_uuid: Some(terminal_uuid),
            window_title: Some(window_title),
            working_dir: Some(working_dir),
            session_type: "manual".to_string(),
            ai_command: None,
        }).map_err(|e| e.to_string())?;

        Ok(session)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Ghostty AppleScript is only supported on macOS".to_string())
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct NoteItem {
    path: String,
    name: String,
    is_folder: bool,
    children: Option<Vec<NoteItem>>,
}

fn get_notes_dir(state: &State<AppState>) -> PathBuf {
    state.notes_dir.clone()
}

fn sanitize_note_path(notes_dir: &PathBuf, relative_path: &str) -> Result<PathBuf, String> {
    let full_path = notes_dir.join(relative_path);

    // Ensure the path is within the notes directory (prevent path traversal)
    let canonical_notes_dir = notes_dir.canonicalize()
        .map_err(|e| format!("Failed to canonicalize notes directory: {}", e))?;

    if let Ok(canonical_path) = full_path.canonicalize() {
        if !canonical_path.starts_with(&canonical_notes_dir) {
            return Err("Invalid path: outside notes directory".to_string());
        }
    } else {
        // For new files that don't exist yet, check the parent
        if let Some(parent) = full_path.parent() {
            if parent.exists() {
                let canonical_parent = parent.canonicalize()
                    .map_err(|e| format!("Failed to canonicalize parent: {}", e))?;
                if !canonical_parent.starts_with(&canonical_notes_dir) {
                    return Err("Invalid path: outside notes directory".to_string());
                }
            }
        }
    }

    Ok(full_path)
}

fn build_note_tree(dir: &PathBuf, relative_to: &PathBuf) -> Result<Vec<NoteItem>, String> {
    let mut items = Vec::new();

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files
        if file_name.starts_with('.') {
            continue;
        }

        let is_folder = path.is_dir();
        let relative_path = path.strip_prefix(relative_to)
            .unwrap()
            .to_string_lossy()
            .to_string();

        let children = if is_folder {
            Some(build_note_tree(&path, relative_to)?)
        } else if file_name.ends_with(".md") {
            None
        } else {
            // Skip non-markdown files
            continue;
        };

        items.push(NoteItem {
            path: relative_path,
            name: file_name,
            is_folder,
            children,
        });
    }

    // Sort: folders first, then files, both alphabetically
    items.sort_by(|a, b| {
        match (a.is_folder, b.is_folder) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(items)
}

#[tauri::command]
fn list_notes(state: State<AppState>) -> Result<Vec<NoteItem>, String> {
    let notes_dir = get_notes_dir(&state);

    // Ensure notes directory exists
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir)
            .map_err(|e| format!("Failed to create notes directory: {}", e))?;
    }

    build_note_tree(&notes_dir, &notes_dir)
}

#[tauri::command]
fn read_note(state: State<AppState>, path: String) -> Result<String, String> {
    let notes_dir = get_notes_dir(&state);
    let full_path = sanitize_note_path(&notes_dir, &path)?;

    fs::read_to_string(full_path)
        .map_err(|e| format!("Failed to read note: {}", e))
}

#[tauri::command]
fn write_note(state: State<AppState>, path: String, content: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&state);
    let full_path = sanitize_note_path(&notes_dir, &path)?;

    // Ensure parent directory exists
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::write(full_path, content)
        .map_err(|e| format!("Failed to write note: {}", e))
}

#[tauri::command]
fn create_note(state: State<AppState>, path: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&state);
    let full_path = sanitize_note_path(&notes_dir, &path)?;

    // Ensure parent directory exists
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    // Create empty file if it doesn't exist
    if !full_path.exists() {
        fs::write(full_path, "")
            .map_err(|e| format!("Failed to create note: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn delete_note(state: State<AppState>, path: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&state);
    let full_path = sanitize_note_path(&notes_dir, &path)?;

    if full_path.is_dir() {
        fs::remove_dir_all(full_path)
            .map_err(|e| format!("Failed to delete folder: {}", e))
    } else {
        fs::remove_file(full_path)
            .map_err(|e| format!("Failed to delete note: {}", e))
    }
}

#[tauri::command]
fn create_folder(state: State<AppState>, path: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&state);
    let full_path = sanitize_note_path(&notes_dir, &path)?;

    fs::create_dir_all(full_path)
        .map_err(|e| format!("Failed to create folder: {}", e))
}

#[tauri::command]
fn rename_note(state: State<AppState>, old_path: String, new_path: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&state);
    let old_full_path = sanitize_note_path(&notes_dir, &old_path)?;
    let new_full_path = sanitize_note_path(&notes_dir, &new_path)?;

    // Ensure parent directory exists for new path
    if let Some(parent) = new_full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::rename(old_full_path, new_full_path)
        .map_err(|e| format!("Failed to rename note: {}", e))
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
            let notes_dir = app_dir.join("notes");

            app.manage(AppState {
                db: Arc::new(db),
                prefs_path,
                prefs: Arc::new(Mutex::new(prefs)),
                notes_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project,
            get_projects,
            update_project,
            update_project_root_path,
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
            create_ghostty_window,
            list_notes,
            read_note,
            write_note,
            create_note,
            delete_note,
            create_folder,
            rename_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
