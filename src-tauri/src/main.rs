#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use db::{CreateProjectInput, CreateTaskInput, CreateTrackInput, Database, UpdateTaskInput, UserPreferences};
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
            delete_project,
            create_track,
            get_tracks,
            update_track,
            delete_track,
            create_task,
            get_tasks,
            update_task,
            delete_task,
            add_dependency,
            get_dependencies,
            remove_dependency,
            auto_update_task_statuses,
            get_preferences,
            save_preferences_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
