use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashSet, VecDeque};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

pub struct Database {
    conn: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub root_path: Option<String>,
    pub focused_task_id: Option<String>,
    pub is_system_project: bool,
    pub position: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Track {
    pub id: String,
    pub project_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub track_type: String,
    pub system_track_type: Option<String>,
    pub color: Option<String>,
    pub position: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub track_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub position: i32,
    pub parent_task_id: Option<String>,
    pub depth: i32,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
    pub is_current_focus: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeLog {
    pub id: String,
    pub task_id: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub duration_seconds: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActiveTimer {
    pub task_id: String,
    pub started_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TerminalSession {
    pub id: String,
    pub task_id: String,
    pub terminal_app: String,
    pub terminal_uuid: Option<String>,
    pub window_title: Option<String>,
    pub working_dir: Option<String>,
    pub session_type: String,
    pub ai_command: Option<String>,
    pub created_at: i64,
    pub last_focused_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTerminalSessionInput {
    pub task_id: String,
    pub terminal_app: String,
    pub terminal_uuid: Option<String>,
    pub window_title: Option<String>,
    pub working_dir: Option<String>,
    pub session_type: String,
    pub ai_command: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskDependency {
    pub id: String,
    pub task_id: String,
    pub blocks_task_id: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTrackInput {
    pub project_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub track_type: String,
    pub system_track_type: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskInput {
    pub track_id: String,
    pub title: String,
    pub description: Option<String>,
    pub parent_task_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Create projects table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT,
                root_path TEXT,
                position INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Migration: Add root_path column if it doesn't exist
        let has_root_path_col: bool = conn
            .prepare("PRAGMA table_info(projects)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "root_path");

        if !has_root_path_col {
            conn.execute(
                "ALTER TABLE projects ADD COLUMN root_path TEXT",
                [],
            )?;
        }

        // Migration: Add focused_task_id column if it doesn't exist
        let has_focused_task_col: bool = conn
            .prepare("PRAGMA table_info(projects)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "focused_task_id");

        if !has_focused_task_col {
            conn.execute(
                "ALTER TABLE projects ADD COLUMN focused_task_id TEXT",
                [],
            )?;
        }

        // Migration: Add is_system_project column if it doesn't exist
        let has_is_system_project_col: bool = conn
            .prepare("PRAGMA table_info(projects)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "is_system_project");

        if !has_is_system_project_col {
            conn.execute(
                "ALTER TABLE projects ADD COLUMN is_system_project BOOLEAN NOT NULL DEFAULT 0",
                [],
            )?;
        }

        conn.execute(
            "CREATE TABLE IF NOT EXISTS tracks (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                color TEXT,
                position INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                CHECK (type IN ('main', 'side'))
            )",
            [],
        )?;

        // Migration: Add project_id column if it doesn't exist
        let has_project_col: bool = conn
            .prepare("PRAGMA table_info(tracks)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "project_id");

        if !has_project_col {
            // Create default "Work" project
            let default_project_id = Uuid::new_v4().to_string();
            let now = chrono::Utc::now().timestamp();

            conn.execute(
                "INSERT INTO projects (id, name, description, color, position, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![default_project_id, "Work", None::<String>, None::<String>, 0, now, now],
            )?;

            // Add project_id column with default value
            conn.execute(
                &format!("ALTER TABLE tracks ADD COLUMN project_id TEXT NOT NULL DEFAULT '{}'", default_project_id),
                [],
            )?;
        }

        // Migration: Add system_track_type column if it doesn't exist
        let has_system_track_type_col: bool = conn
            .prepare("PRAGMA table_info(tracks)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "system_track_type");

        if !has_system_track_type_col {
            conn.execute(
                "ALTER TABLE tracks ADD COLUMN system_track_type TEXT",
                [],
            )?;
        }

        conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                track_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                position INTEGER NOT NULL,
                parent_task_id TEXT,
                depth INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                completed_at INTEGER,
                FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                CHECK (status IN ('blocked', 'ready', 'in_progress', 'done')),
                CHECK (depth >= 0 AND depth <= 2)
            )",
            [],
        )?;

        // Migration: Add parent_task_id and depth columns if they don't exist
        let has_parent_col: bool = conn
            .prepare("PRAGMA table_info(tasks)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "parent_task_id");

        if !has_parent_col {
            conn.execute("ALTER TABLE tasks ADD COLUMN parent_task_id TEXT", [])?;
            conn.execute("ALTER TABLE tasks ADD COLUMN depth INTEGER NOT NULL DEFAULT 0", [])?;
        }

        conn.execute(
            "CREATE TABLE IF NOT EXISTS task_dependencies (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                blocks_task_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (blocks_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                UNIQUE(task_id, blocks_task_id)
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_track ON tasks(track_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_deps_task ON task_dependencies(task_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_deps_blocks ON task_dependencies(blocks_task_id)",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS themes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                colors TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Migration: Add is_current_focus column to tasks if it doesn't exist
        let has_focus_col: bool = conn
            .prepare("PRAGMA table_info(tasks)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "is_current_focus");

        if !has_focus_col {
            conn.execute("ALTER TABLE tasks ADD COLUMN is_current_focus INTEGER DEFAULT 0", [])?;
        }

        // Create time_logs table for tracking time spent on tasks
        conn.execute(
            "CREATE TABLE IF NOT EXISTS time_logs (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                duration_seconds INTEGER,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Create active_timer table for persisting timer state across app restarts
        conn.execute(
            "CREATE TABLE IF NOT EXISTS active_timer (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                task_id TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Create terminal_sessions table for linking tasks to terminal windows
        conn.execute(
            "CREATE TABLE IF NOT EXISTS terminal_sessions (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                terminal_app TEXT NOT NULL,
                terminal_uuid TEXT,
                window_title TEXT,
                working_dir TEXT,
                created_at INTEGER NOT NULL,
                last_focused_at INTEGER,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_terminal_sessions_task ON terminal_sessions(task_id)",
            [],
        )?;

        // Migration: Add session_type column if it doesn't exist
        let has_session_type_col: bool = conn
            .prepare("PRAGMA table_info(terminal_sessions)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "session_type");

        if !has_session_type_col {
            conn.execute(
                "ALTER TABLE terminal_sessions ADD COLUMN session_type TEXT NOT NULL DEFAULT 'manual'",
                [],
            )?;
        }

        // Migration: Add ai_command column if it doesn't exist
        let has_ai_command_col: bool = conn
            .prepare("PRAGMA table_info(terminal_sessions)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "ai_command");

        if !has_ai_command_col {
            conn.execute(
                "ALTER TABLE terminal_sessions ADD COLUMN ai_command TEXT",
                [],
            )?;
        }

        drop(conn);
        self.init_preset_themes()?;

        Ok(())
    }

    fn init_preset_themes(&self) -> Result<()> {
        let preset_themes = vec![
            (
                "Bluey",
                ColorPreferences {
                    status_blocked: "239 68 68".to_string(),
                    status_ready: "96 165 250".to_string(),
                    status_in_progress: "34 197 94".to_string(),
                    status_done: "163 163 163".to_string(),
                    bg_primary: "15 23 42".to_string(),
                    bg_secondary: "30 41 59".to_string(),
                    bg_tertiary: "51 65 85".to_string(),
                    bg_quaternary: "71 85 105".to_string(),
                    text_primary: "248 250 252".to_string(),
                    text_secondary: "203 213 225".to_string(),
                    text_tertiary: "148 163 184".to_string(),
                    text_quaternary: "100 116 139".to_string(),
                    border_primary: "51 65 85".to_string(),
                    border_secondary: "71 85 105".to_string(),
                    accent_primary: "14 165 233".to_string(),
                    accent_hover: "2 132 199".to_string(),
                    accent_star: "251 191 36".to_string(),
                    sidebar_bg: "15 23 42".to_string(),
                    sidebar_border: "51 65 85".to_string(),
                    input_bg: "30 41 59".to_string(),
                    input_border: "71 85 105".to_string(),
                    button_secondary: "51 65 85".to_string(),
                    button_secondary_hover: "71 85 105".to_string(),
                },
            ),
            (
                "Dawn",
                ColorPreferences {
                    status_blocked: "190 18 60".to_string(),
                    status_ready: "29 78 216".to_string(),
                    status_in_progress: "217 119 6".to_string(),
                    status_done: "21 128 61".to_string(),
                    bg_primary: "254 252 248".to_string(),
                    bg_secondary: "250 247 242".to_string(),
                    bg_tertiary: "255 255 255".to_string(),
                    bg_quaternary: "243 237 230".to_string(),
                    text_primary: "17 24 39".to_string(),
                    text_secondary: "55 65 81".to_string(),
                    text_tertiary: "100 116 139".to_string(),
                    text_quaternary: "148 163 184".to_string(),
                    border_primary: "226 217 207".to_string(),
                    border_secondary: "237 231 224".to_string(),
                    accent_primary: "15 118 110".to_string(),
                    accent_hover: "13 93 88".to_string(),
                    accent_star: "217 119 6".to_string(),
                    sidebar_bg: "250 247 242".to_string(),
                    sidebar_border: "226 217 207".to_string(),
                    input_bg: "255 255 255".to_string(),
                    input_border: "203 213 225".to_string(),
                    button_secondary: "243 237 230".to_string(),
                    button_secondary_hover: "226 217 207".to_string(),
                },
            ),
            (
                "Nightly",
                ColorPreferences {
                    status_blocked: "239 68 68".to_string(),
                    status_ready: "96 165 250".to_string(),
                    status_in_progress: "52 211 153".to_string(),
                    status_done: "156 163 175".to_string(),
                    bg_primary: "10 14 23".to_string(),
                    bg_secondary: "21 26 39".to_string(),
                    bg_tertiary: "30 36 51".to_string(),
                    bg_quaternary: "42 50 68".to_string(),
                    text_primary: "232 235 240".to_string(),
                    text_secondary: "184 193 211".to_string(),
                    text_tertiary: "135 145 168".to_string(),
                    text_quaternary: "95 103 128".to_string(),
                    border_primary: "42 50 68".to_string(),
                    border_secondary: "58 66 85".to_string(),
                    accent_primary: "99 102 241".to_string(),
                    accent_hover: "79 70 229".to_string(),
                    accent_star: "251 191 36".to_string(),
                    sidebar_bg: "10 14 23".to_string(),
                    sidebar_border: "42 50 68".to_string(),
                    input_bg: "21 26 39".to_string(),
                    input_border: "42 50 68".to_string(),
                    button_secondary: "30 36 51".to_string(),
                    button_secondary_hover: "42 50 68".to_string(),
                },
            ),
            (
                "Cyberpunk",
                ColorPreferences {
                    status_blocked: "255 20 147".to_string(),
                    status_ready: "255 100 255".to_string(),
                    status_in_progress: "138 43 226".to_string(),
                    status_done: "57 255 20".to_string(),
                    bg_primary: "10 10 15".to_string(),
                    bg_secondary: "15 15 25".to_string(),
                    bg_tertiary: "20 20 35".to_string(),
                    bg_quaternary: "30 30 50".to_string(),
                    text_primary: "240 240 255".to_string(),
                    text_secondary: "200 220 255".to_string(),
                    text_tertiary: "140 150 180".to_string(),
                    text_quaternary: "100 110 140".to_string(),
                    border_primary: "50 60 100".to_string(),
                    border_secondary: "35 40 70".to_string(),
                    accent_primary: "255 0 200".to_string(),
                    accent_hover: "220 0 160".to_string(),
                    accent_star: "255 255 0".to_string(),
                    sidebar_bg: "12 12 20".to_string(),
                    sidebar_border: "40 50 90".to_string(),
                    input_bg: "18 18 30".to_string(),
                    input_border: "50 70 130".to_string(),
                    button_secondary: "40 30 70".to_string(),
                    button_secondary_hover: "60 40 100".to_string(),
                },
            ),
            (
                "Limestone",
                ColorPreferences {
                    status_blocked: "217 119 119".to_string(),
                    status_ready: "139 172 204".to_string(),
                    status_in_progress: "218 165 32".to_string(),
                    status_done: "120 190 100".to_string(),
                    bg_primary: "40 38 35".to_string(),
                    bg_secondary: "53 50 45".to_string(),
                    bg_tertiary: "67 63 56".to_string(),
                    bg_quaternary: "81 76 68".to_string(),
                    text_primary: "235 230 220".to_string(),
                    text_secondary: "204 197 183".to_string(),
                    text_tertiary: "168 161 148".to_string(),
                    text_quaternary: "133 127 116".to_string(),
                    border_primary: "67 63 56".to_string(),
                    border_secondary: "81 76 68".to_string(),
                    accent_primary: "176 151 118".to_string(),
                    accent_hover: "158 133 100".to_string(),
                    accent_star: "227 188 122".to_string(),
                    sidebar_bg: "40 38 35".to_string(),
                    sidebar_border: "67 63 56".to_string(),
                    input_bg: "53 50 45".to_string(),
                    input_border: "81 76 68".to_string(),
                    button_secondary: "67 63 56".to_string(),
                    button_secondary_hover: "81 76 68".to_string(),
                },
            ),
        ];

        let conn = self.conn.lock().unwrap();

        for (name, colors) in preset_themes {
            // Check if preset theme already exists
            let exists: bool = conn
                .query_row(
                    "SELECT COUNT(*) FROM themes WHERE name = ?1",
                    params![name],
                    |row| {
                        let count: i32 = row.get(0)?;
                        Ok(count > 0)
                    },
                )?;

            if exists {
                // Update existing preset theme to ensure latest colors
                let colors_json = serde_json::to_string(&colors)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

                conn.execute(
                    "UPDATE themes SET colors = ?1 WHERE name = ?2",
                    params![colors_json, name],
                )?;
            } else {
                // Insert new preset theme
                let id = uuid::Uuid::new_v4().to_string();
                let now = chrono::Utc::now().timestamp();
                let colors_json = serde_json::to_string(&colors)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

                conn.execute(
                    "INSERT INTO themes (id, name, colors, created_at) VALUES (?1, ?2, ?3, ?4)",
                    params![id, name, colors_json, now],
                )?;
            }
        }

        Ok(())
    }

    pub fn create_track(&self, input: CreateTrackInput) -> Result<Track> {
        let conn = self.conn.lock().unwrap();

        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM tracks WHERE project_id = ?1",
            params![input.project_id],
            |row| row.get(0),
        )?;

        if input.track_type == "main" {
            let main_count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM tracks WHERE project_id = ?1 AND type = 'main'",
                params![input.project_id],
                |row| row.get(0),
            )?;
            if main_count > 0 {
                return Err(rusqlite::Error::ExecuteReturnedResults);
            }
        }

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let position = count as i32;

        conn.execute(
            "INSERT INTO tracks (id, project_id, name, type, system_track_type, color, position, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![id, input.project_id, input.name, input.track_type, input.system_track_type, input.color, position, now, now],
        )?;

        Ok(Track {
            id,
            project_id: input.project_id,
            name: input.name,
            track_type: input.track_type,
            system_track_type: input.system_track_type,
            color: input.color,
            position,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn get_tracks(&self, project_id: Option<String>) -> Result<Vec<Track>> {
        let conn = self.conn.lock().unwrap();

        let (query, params_vec): (String, Vec<String>) = if let Some(pid) = project_id {
            (
                "SELECT id, project_id, name, type, system_track_type, color, position, created_at, updated_at
                 FROM tracks WHERE project_id = ?1 ORDER BY position".to_string(),
                vec![pid],
            )
        } else {
            (
                "SELECT id, project_id, name, type, system_track_type, color, position, created_at, updated_at
                 FROM tracks ORDER BY position".to_string(),
                vec![],
            )
        };

        let mut stmt = conn.prepare(&query)?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let tracks = stmt
            .query_map(params_refs.as_slice(), |row| {
                Ok(Track {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    track_type: row.get(3)?,
                    system_track_type: row.get(4)?,
                    color: row.get(5)?,
                    position: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(tracks)
    }

    pub fn update_track(&self, id: &str, name: String, color: Option<String>) -> Result<Track> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE tracks SET name = ?1, color = ?2, updated_at = ?3 WHERE id = ?4",
            params![name, color, now, id],
        )?;

        let track = conn.query_row(
            "SELECT id, project_id, name, type, system_track_type, color, position, created_at, updated_at FROM tracks WHERE id = ?1",
            params![id],
            |row| {
                Ok(Track {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    track_type: row.get(3)?,
                    system_track_type: row.get(4)?,
                    color: row.get(5)?,
                    position: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )?;

        Ok(track)
    }

    pub fn delete_track(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tracks WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn create_task(&self, input: CreateTaskInput) -> Result<Task> {
        let conn = self.conn.lock().unwrap();

        let depth = if let Some(ref parent_id) = input.parent_task_id {
            let parent_depth: i32 = conn.query_row(
                "SELECT depth FROM tasks WHERE id = ?1",
                params![parent_id],
                |row| row.get(0),
            )?;

            let new_depth = parent_depth + 1;
            if new_depth > 2 {
                return Err(rusqlite::Error::ExecuteReturnedResults);
            }
            new_depth
        } else {
            0
        };

        let parent_for_count = if input.parent_task_id.is_some() {
            &input.parent_task_id
        } else {
            &None
        };

        let count: i64 = if let Some(parent_id) = parent_for_count {
            conn.query_row(
                "SELECT COUNT(*) FROM tasks WHERE parent_task_id = ?1",
                params![parent_id],
                |row| row.get(0),
            )?
        } else {
            conn.query_row(
                "SELECT COUNT(*) FROM tasks WHERE track_id = ?1 AND parent_task_id IS NULL",
                params![input.track_id],
                |row| row.get(0),
            )?
        };

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let position = count as i32;
        let status = "ready";

        conn.execute(
            "INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at, is_current_focus)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                id,
                input.track_id,
                input.title,
                input.description,
                status,
                position,
                input.parent_task_id,
                depth,
                now,
                now,
                0
            ],
        )?;

        Ok(Task {
            id,
            track_id: input.track_id,
            title: input.title,
            description: input.description,
            status: status.to_string(),
            position,
            parent_task_id: input.parent_task_id,
            depth,
            created_at: now,
            updated_at: now,
            completed_at: None,
            is_current_focus: false,
        })
    }

    pub fn get_tasks(&self, track_id: Option<String>) -> Result<Vec<Task>> {
        let conn = self.conn.lock().unwrap();

        let (query, params_vec): (String, Vec<String>) = if let Some(tid) = track_id {
            (
                "SELECT id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at, completed_at, is_current_focus
                 FROM tasks WHERE track_id = ?1 ORDER BY position".to_string(),
                vec![tid],
            )
        } else {
            (
                "SELECT id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at, completed_at, is_current_focus
                 FROM tasks ORDER BY position".to_string(),
                vec![],
            )
        };

        let mut stmt = conn.prepare(&query)?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let tasks = stmt
            .query_map(params_refs.as_slice(), |row| {
                Ok(Task {
                    id: row.get(0)?,
                    track_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    position: row.get(5)?,
                    parent_task_id: row.get(6)?,
                    depth: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    completed_at: row.get(10)?,
                    is_current_focus: row.get::<_, i32>(11)? != 0,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(tasks)
    }

    pub fn update_task(&self, id: &str, input: UpdateTaskInput) -> Result<Task> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        let current_task: Task = conn.query_row(
            "SELECT id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at, completed_at, is_current_focus
             FROM tasks WHERE id = ?1",
            params![id],
            |row| {
                Ok(Task {
                    id: row.get(0)?,
                    track_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    position: row.get(5)?,
                    parent_task_id: row.get(6)?,
                    depth: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    completed_at: row.get(10)?,
                    is_current_focus: row.get::<_, i32>(11)? != 0,
                })
            },
        )?;

        let title = input.title.unwrap_or(current_task.title);
        let description = input.description.or(current_task.description);
        let old_status = current_task.status.clone();
        let status = input.status.unwrap_or(current_task.status);
        let completed_at = if status == "done" {
            Some(now)
        } else {
            current_task.completed_at
        };

        conn.execute(
            "UPDATE tasks SET title = ?1, description = ?2, status = ?3, updated_at = ?4, completed_at = ?5
             WHERE id = ?6",
            params![title, description, status, now, completed_at, id],
        )?;

        // Stop timer if task is being marked as done
        if status == "done" && old_status != "done" {
            drop(conn); // Release lock before calling stop_timer
            let _ = self.stop_timer(id); // Ignore error if timer wasn't running
            let conn = self.conn.lock().unwrap();
            drop(conn); // Just to maintain consistency
        }

        Ok(Task {
            id: id.to_string(),
            track_id: current_task.track_id,
            title,
            description,
            status,
            position: current_task.position,
            parent_task_id: current_task.parent_task_id,
            depth: current_task.depth,
            created_at: current_task.created_at,
            updated_at: now,
            completed_at,
            is_current_focus: current_task.is_current_focus,
        })
    }

    pub fn delete_task(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn check_circular_dependency(&self, task_id: &str, blocks_task_id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();

        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        queue.push_back(blocks_task_id.to_string());

        while let Some(current_id) = queue.pop_front() {
            if current_id == task_id {
                return Ok(true);
            }

            if visited.contains(&current_id) {
                continue;
            }
            visited.insert(current_id.clone());

            let mut stmt = conn.prepare(
                "SELECT blocks_task_id FROM task_dependencies WHERE task_id = ?1",
            )?;

            let dependencies = stmt
                .query_map(params![current_id], |row| row.get::<_, String>(0))?
                .collect::<Result<Vec<_>>>()?;

            for dep in dependencies {
                queue.push_back(dep);
            }
        }

        Ok(false)
    }

    pub fn add_dependency(&self, task_id: &str, blocks_task_id: &str) -> Result<TaskDependency> {
        if self.check_circular_dependency(task_id, blocks_task_id)? {
            return Err(rusqlite::Error::ExecuteReturnedResults);
        }

        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO task_dependencies (id, task_id, blocks_task_id, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![id, task_id, blocks_task_id, now],
        )?;

        Ok(TaskDependency {
            id,
            task_id: task_id.to_string(),
            blocks_task_id: blocks_task_id.to_string(),
            created_at: now,
        })
    }

    pub fn get_dependencies(&self, task_id: Option<String>) -> Result<Vec<TaskDependency>> {
        let conn = self.conn.lock().unwrap();

        let (query, params_vec): (String, Vec<String>) = if let Some(tid) = task_id {
            (
                "SELECT id, task_id, blocks_task_id, created_at
                 FROM task_dependencies WHERE task_id = ?1".to_string(),
                vec![tid],
            )
        } else {
            (
                "SELECT id, task_id, blocks_task_id, created_at
                 FROM task_dependencies".to_string(),
                vec![],
            )
        };

        let mut stmt = conn.prepare(&query)?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let deps = stmt
            .query_map(params_refs.as_slice(), |row| {
                Ok(TaskDependency {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    blocks_task_id: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(deps)
    }

    pub fn remove_dependency(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM task_dependencies WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn auto_update_task_statuses(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        let tasks: Vec<String> = conn
            .prepare("SELECT id FROM tasks WHERE status != 'done'")?
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<_>>>()?;

        for task_id in tasks {
            let has_incomplete_deps: bool = conn.query_row(
                "SELECT EXISTS(
                    SELECT 1 FROM task_dependencies td
                    JOIN tasks t ON td.task_id = t.id
                    WHERE td.blocks_task_id = ?1 AND t.status != 'done'
                )",
                params![task_id],
                |row| row.get(0),
            )?;

            let current_status: String = conn.query_row(
                "SELECT status FROM tasks WHERE id = ?1",
                params![task_id],
                |row| row.get(0),
            )?;

            let new_status = if has_incomplete_deps {
                "blocked"
            } else if current_status == "blocked" {
                "ready"
            } else {
                continue;
            };

            if new_status != current_status {
                let now = chrono::Utc::now().timestamp();
                conn.execute(
                    "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
                    params![new_status, now, task_id],
                )?;
            }
        }

        Ok(())
    }

    // Project CRUD operations
    pub fn create_project(&self, input: CreateProjectInput) -> Result<Project> {
        let conn = self.conn.lock().unwrap();

        let count: i64 = conn.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))?;

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let position = count as i32;

        conn.execute(
            "INSERT INTO projects (id, name, description, color, root_path, focused_task_id, is_system_project, position, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![id, input.name, input.description, input.color, None::<String>, None::<String>, false, position, now, now],
        )?;

        Ok(Project {
            id,
            name: input.name,
            description: input.description,
            color: input.color,
            root_path: None,
            focused_task_id: None,
            is_system_project: false,
            position,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn get_projects(&self) -> Result<Vec<Project>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, color, root_path, focused_task_id, is_system_project, position, created_at, updated_at
             FROM projects ORDER BY position",
        )?;

        let projects = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    color: row.get(3)?,
                    root_path: row.get(4)?,
                    focused_task_id: row.get(5)?,
                    is_system_project: row.get(6)?,
                    position: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(projects)
    }

    pub fn update_project(&self, id: &str, name: String, description: Option<String>, color: Option<String>) -> Result<Project> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE projects SET name = ?1, description = ?2, color = ?3, updated_at = ?4 WHERE id = ?5",
            params![name, description, color, now, id],
        )?;

        let project = conn.query_row(
            "SELECT id, name, description, color, root_path, focused_task_id, is_system_project, position, created_at, updated_at FROM projects WHERE id = ?1",
            params![id],
            |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    color: row.get(3)?,
                    root_path: row.get(4)?,
                    focused_task_id: row.get(5)?,
                    is_system_project: row.get(6)?,
                    position: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            },
        )?;

        Ok(project)
    }

    pub fn get_project_task_count(&self, project_id: &str) -> Result<i32> {
        let conn = self.conn.lock().unwrap();
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM tasks
             WHERE track_id IN (SELECT id FROM tracks WHERE project_id = ?1)",
            params![project_id],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    pub fn update_project_root_path(&self, id: &str, root_path: Option<String>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE projects SET root_path = ?1, updated_at = ?2 WHERE id = ?3",
            params![root_path, now, id],
        )?;

        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn save_theme(&self, input: CreateThemeInput) -> Result<SavedTheme> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let colors_json = serde_json::to_string(&input.colors)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        conn.execute(
            "INSERT INTO themes (id, name, colors, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, input.name, colors_json, now],
        )?;

        Ok(SavedTheme {
            id,
            name: input.name,
            colors: input.colors,
            created_at: now,
        })
    }

    pub fn get_themes(&self) -> Result<Vec<SavedTheme>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, colors, created_at FROM themes ORDER BY created_at DESC")?;

        let themes = stmt.query_map([], |row| {
            let colors_json: String = row.get(2)?;
            let colors: ColorPreferences = serde_json::from_str(&colors_json)
                .map_err(|e| rusqlite::Error::FromSqlConversionFailure(
                    2,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                ))?;

            Ok(SavedTheme {
                id: row.get(0)?,
                name: row.get(1)?,
                colors,
                created_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(themes)
    }

    pub fn delete_theme(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM themes WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn get_all_subtask_ids(&self, tx: &rusqlite::Transaction, parent_id: &str) -> Result<Vec<String>> {
        let mut all_ids = Vec::new();
        let mut queue = vec![parent_id.to_string()];

        while let Some(current_id) = queue.pop() {
            let mut stmt = tx.prepare(
                "SELECT id FROM tasks WHERE parent_task_id = ?1 ORDER BY position"
            )?;

            let subtask_ids: Vec<String> = stmt
                .query_map(params![current_id], |row| row.get(0))?
                .collect::<Result<Vec<_>>>()?;

            for id in &subtask_ids {
                all_ids.push(id.clone());
                queue.push(id.clone());
            }
        }

        Ok(all_ids)
    }

    pub fn reorder_tracks(&self, project_id: &str, track_id: &str, new_position: i32) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // Get current position and type of dragged track
        let current_position: i32 = tx.query_row(
            "SELECT position FROM tracks WHERE id = ?1 AND project_id = ?2",
            params![track_id, project_id],
            |row| row.get(0),
        )?;

        if current_position == new_position {
            return Ok(());
        }

        let now = chrono::Utc::now().timestamp();

        // Shift tracks to make room
        if new_position < current_position {
            // Moving left: shift tracks right
            tx.execute(
                "UPDATE tracks
                 SET position = position + 1, updated_at = ?1
                 WHERE project_id = ?2 AND position >= ?3 AND position < ?4",
                params![now, project_id, new_position, current_position],
            )?;
        } else {
            // Moving right: shift tracks left
            tx.execute(
                "UPDATE tracks
                 SET position = position - 1, updated_at = ?1
                 WHERE project_id = ?2 AND position > ?3 AND position <= ?4",
                params![now, project_id, current_position, new_position],
            )?;
        }

        // Update the dragged track's position
        tx.execute(
            "UPDATE tracks SET position = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_position, now, track_id],
        )?;

        // Ensure position 0 is always type='main' and others are type='side'
        tx.execute(
            "UPDATE tracks SET type = 'main' WHERE project_id = ?1 AND position = 0",
            params![project_id],
        )?;
        tx.execute(
            "UPDATE tracks SET type = 'side' WHERE project_id = ?1 AND position != 0",
            params![project_id],
        )?;

        tx.commit()?;
        Ok(())
    }

    pub fn reorder_tasks(&self, task_id: &str, new_position: i32) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // Get task details
        let task: Task = tx.query_row(
            "SELECT id, track_id, title, description, status, position, parent_task_id, depth,
             created_at, updated_at, completed_at, is_current_focus
             FROM tasks WHERE id = ?1",
            params![task_id],
            |row| {
                Ok(Task {
                    id: row.get(0)?,
                    track_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    position: row.get(5)?,
                    parent_task_id: row.get(6)?,
                    depth: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    completed_at: row.get(10)?,
                    is_current_focus: row.get::<_, i32>(11)? != 0,
                })
            },
        )?;

        let current_position = task.position;
        if current_position == new_position {
            return Ok(());
        }

        let now = chrono::Utc::now().timestamp();

        // Get all subtask IDs
        let subtask_ids = self.get_all_subtask_ids(&tx, task_id)?;
        let total_tasks_moving = 1 + subtask_ids.len();

        // Build WHERE clause for same scope
        let scope_where = if let Some(ref parent_id) = task.parent_task_id {
            format!("parent_task_id = '{}'", parent_id)
        } else {
            format!("track_id = '{}' AND parent_task_id IS NULL", task.track_id)
        };

        // Shift positions
        if new_position < current_position {
            tx.execute(
                &format!(
                    "UPDATE tasks
                     SET position = position + ?1, updated_at = ?2
                     WHERE {} AND position >= ?3 AND position < ?4",
                    scope_where
                ),
                params![total_tasks_moving as i32, now, new_position, current_position],
            )?;
        } else {
            tx.execute(
                &format!(
                    "UPDATE tasks
                     SET position = position - ?1, updated_at = ?2
                     WHERE {} AND position > ?3 AND position <= ?4",
                    scope_where
                ),
                params![total_tasks_moving as i32, now, current_position, new_position],
            )?;
        }

        // Calculate offset and update positions
        let offset = new_position - current_position;

        tx.execute(
            "UPDATE tasks SET position = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_position, now, task_id],
        )?;

        for subtask_id in &subtask_ids {
            tx.execute(
                "UPDATE tasks SET position = position + ?1, updated_at = ?2 WHERE id = ?3",
                params![offset, now, subtask_id],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    // Focus and Timer Management
    pub fn set_focus_task(&self, project_id: &str, task_id: &str) -> Result<Task> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        // Update the project's focused_task_id
        conn.execute(
            "UPDATE projects SET focused_task_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![task_id, now, project_id],
        )?;

        // If the task is ready or blocked, set it to in_progress
        conn.execute(
            "UPDATE tasks SET status = 'in_progress', updated_at = ?1
             WHERE id = ?2 AND status IN ('ready', 'blocked')",
            params![now, task_id],
        )?;

        // Get and return the task
        let task = conn.query_row(
            "SELECT id, track_id, title, description, status, position, parent_task_id, depth,
             created_at, updated_at, completed_at, is_current_focus
             FROM tasks WHERE id = ?1",
            params![task_id],
            |row| {
                Ok(Task {
                    id: row.get(0)?,
                    track_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    position: row.get(5)?,
                    parent_task_id: row.get(6)?,
                    depth: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    completed_at: row.get(10)?,
                    is_current_focus: false, // No longer using this field
                })
            },
        )?;

        Ok(task)
    }

    pub fn clear_focus(&self, project_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE projects SET focused_task_id = NULL, updated_at = ?1 WHERE id = ?2",
            params![now, project_id],
        )?;
        Ok(())
    }

    pub fn get_focus_task(&self, project_id: &str) -> Result<Option<Task>> {
        let conn = self.conn.lock().unwrap();

        // Get the focused task ID from the project
        let focused_task_id: Option<String> = conn
            .query_row(
                "SELECT focused_task_id FROM projects WHERE id = ?1",
                params![project_id],
                |row| row.get(0),
            )
            .ok()
            .flatten();

        if let Some(task_id) = focused_task_id {
            let task = conn.query_row(
                "SELECT id, track_id, title, description, status, position, parent_task_id, depth,
                 created_at, updated_at, completed_at, is_current_focus
                 FROM tasks WHERE id = ?1",
                params![task_id],
                |row| {
                    Ok(Task {
                        id: row.get(0)?,
                        track_id: row.get(1)?,
                        title: row.get(2)?,
                        description: row.get(3)?,
                        status: row.get(4)?,
                        position: row.get(5)?,
                        parent_task_id: row.get(6)?,
                        depth: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                        completed_at: row.get(10)?,
                        is_current_focus: false, // No longer using this field
                    })
                },
            );

            match task {
                Ok(t) => Ok(Some(t)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e),
            }
        } else {
            Ok(None)
        }
    }

    pub fn start_timer(&self, task_id: &str) -> Result<ActiveTimer> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        // Clear any existing active timer
        conn.execute("DELETE FROM active_timer", [])?;

        // Insert new active timer
        conn.execute(
            "INSERT INTO active_timer (id, task_id, started_at) VALUES (1, ?1, ?2)",
            params![task_id, now],
        )?;

        Ok(ActiveTimer {
            task_id: task_id.to_string(),
            started_at: now,
        })
    }

    pub fn stop_timer(&self, task_id: &str) -> Result<Option<TimeLog>> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        // Get the active timer
        let timer: Result<ActiveTimer> = conn.query_row(
            "SELECT task_id, started_at FROM active_timer WHERE task_id = ?1",
            params![task_id],
            |row| {
                Ok(ActiveTimer {
                    task_id: row.get(0)?,
                    started_at: row.get(1)?,
                })
            },
        );

        match timer {
            Ok(active_timer) => {
                let duration_seconds = (now - active_timer.started_at) as i32;
                let id = Uuid::new_v4().to_string();

                // Create time log entry
                conn.execute(
                    "INSERT INTO time_logs (id, task_id, started_at, ended_at, duration_seconds)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![id, task_id, active_timer.started_at, now, duration_seconds],
                )?;

                // Delete active timer
                conn.execute("DELETE FROM active_timer WHERE task_id = ?1", params![task_id])?;

                Ok(Some(TimeLog {
                    id,
                    task_id: task_id.to_string(),
                    started_at: active_timer.started_at,
                    ended_at: Some(now),
                    duration_seconds: Some(duration_seconds),
                }))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_active_timer(&self) -> Result<Option<ActiveTimer>> {
        let conn = self.conn.lock().unwrap();

        let timer = conn.query_row(
            "SELECT task_id, started_at FROM active_timer WHERE id = 1",
            [],
            |row| {
                Ok(ActiveTimer {
                    task_id: row.get(0)?,
                    started_at: row.get(1)?,
                })
            },
        );

        match timer {
            Ok(t) => Ok(Some(t)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_time_logs(&self, task_id: &str) -> Result<Vec<TimeLog>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, task_id, started_at, ended_at, duration_seconds
             FROM time_logs WHERE task_id = ?1 ORDER BY started_at DESC",
        )?;

        let logs = stmt
            .query_map(params![task_id], |row| {
                Ok(TimeLog {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    started_at: row.get(2)?,
                    ended_at: row.get(3)?,
                    duration_seconds: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(logs)
    }

    pub fn get_total_time_for_task(&self, task_id: &str) -> Result<i32> {
        let conn = self.conn.lock().unwrap();
        let total: Option<i32> = conn.query_row(
            "SELECT SUM(duration_seconds) FROM time_logs WHERE task_id = ?1",
            params![task_id],
            |row| row.get(0),
        )?;

        Ok(total.unwrap_or(0))
    }

    // Terminal Session Management
    pub fn create_terminal_session(&self, input: CreateTerminalSessionInput) -> Result<TerminalSession> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO terminal_sessions (id, task_id, terminal_app, terminal_uuid, window_title, working_dir, session_type, ai_command, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                id,
                input.task_id,
                input.terminal_app,
                input.terminal_uuid,
                input.window_title,
                input.working_dir,
                input.session_type,
                input.ai_command,
                now
            ],
        )?;

        Ok(TerminalSession {
            id,
            task_id: input.task_id,
            terminal_app: input.terminal_app,
            terminal_uuid: input.terminal_uuid,
            window_title: input.window_title,
            working_dir: input.working_dir,
            session_type: input.session_type,
            ai_command: input.ai_command,
            created_at: now,
            last_focused_at: None,
        })
    }

    pub fn get_terminal_sessions(&self, task_id: &str) -> Result<Vec<TerminalSession>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, task_id, terminal_app, terminal_uuid, window_title, working_dir, session_type, ai_command, created_at, last_focused_at
             FROM terminal_sessions WHERE task_id = ?1 ORDER BY created_at DESC",
        )?;

        let sessions = stmt
            .query_map(params![task_id], |row| {
                Ok(TerminalSession {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    terminal_app: row.get(2)?,
                    terminal_uuid: row.get(3)?,
                    window_title: row.get(4)?,
                    working_dir: row.get(5)?,
                    session_type: row.get(6)?,
                    ai_command: row.get(7)?,
                    created_at: row.get(8)?,
                    last_focused_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(sessions)
    }

    pub fn get_all_terminal_sessions(&self) -> Result<Vec<TerminalSession>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, task_id, terminal_app, terminal_uuid, window_title, working_dir, session_type, ai_command, created_at, last_focused_at
             FROM terminal_sessions ORDER BY last_focused_at DESC NULLS LAST, created_at DESC",
        )?;

        let sessions = stmt
            .query_map([], |row| {
                Ok(TerminalSession {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    terminal_app: row.get(2)?,
                    terminal_uuid: row.get(3)?,
                    window_title: row.get(4)?,
                    working_dir: row.get(5)?,
                    session_type: row.get(6)?,
                    ai_command: row.get(7)?,
                    created_at: row.get(8)?,
                    last_focused_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(sessions)
    }

    pub fn update_terminal_session_focus(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE terminal_sessions SET last_focused_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        Ok(())
    }

    pub fn delete_terminal_session(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM terminal_sessions WHERE id = ?1", params![id])?;
        Ok(())
    }
}

// User Preferences
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPreferences {
    pub colors: ColorPreferences,
    pub ai_mode: Option<AiModePreferences>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiModePreferences {
    pub enabled: bool,
    pub command: String,
    pub project_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedTheme {
    pub id: String,
    pub name: String,
    pub colors: ColorPreferences,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateThemeInput {
    pub name: String,
    pub colors: ColorPreferences,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColorPreferences {
    pub status_blocked: String,
    pub status_ready: String,
    pub status_in_progress: String,
    pub status_done: String,
    pub bg_primary: String,
    pub bg_secondary: String,
    pub bg_tertiary: String,
    pub bg_quaternary: String,
    pub text_primary: String,
    pub text_secondary: String,
    pub text_tertiary: String,
    pub text_quaternary: String,
    pub border_primary: String,
    pub border_secondary: String,
    pub accent_primary: String,
    pub accent_hover: String,
    pub accent_star: String,
    pub sidebar_bg: String,
    pub sidebar_border: String,
    pub input_bg: String,
    pub input_border: String,
    pub button_secondary: String,
    pub button_secondary_hover: String,
}

impl Default for ColorPreferences {
    fn default() -> Self {
        ColorPreferences {
            status_blocked: "220 38 38".to_string(),
            status_ready: "79 70 229".to_string(),
            status_in_progress: "20 158 158".to_string(),
            status_done: "28 133 31".to_string(),
            bg_primary: "247 249 251".to_string(),
            bg_secondary: "240 242 245".to_string(),
            bg_tertiary: "255 255 255".to_string(),
            bg_quaternary: "226 232 240".to_string(),
            text_primary: "42 44 48".to_string(),
            text_secondary: "74 82 92".to_string(),
            text_tertiary: "107 114 128".to_string(),
            text_quaternary: "156 163 175".to_string(),
            border_primary: "203 213 225".to_string(),
            border_secondary: "226 232 240".to_string(),
            accent_primary: "20 122 122".to_string(),
            accent_hover: "13 93 93".to_string(),
            accent_star: "245 158 11".to_string(),
            sidebar_bg: "23 23 27".to_string(),
            sidebar_border: "55 65 81".to_string(),
            input_bg: "31 41 55".to_string(),
            input_border: "75 85 99".to_string(),
            button_secondary: "31 41 55".to_string(),
            button_secondary_hover: "55 65 81".to_string(),
        }
    }
}

impl Default for UserPreferences {
    fn default() -> Self {
        UserPreferences {
            colors: ColorPreferences::default(),
            ai_mode: None,
        }
    }
}

pub fn load_preferences(prefs_path: &PathBuf) -> UserPreferences {
    if let Ok(contents) = fs::read_to_string(prefs_path) {
        if let Ok(prefs) = serde_json::from_str(&contents) {
            return prefs;
        }
    }
    UserPreferences::default()
}

pub fn save_preferences(prefs_path: &PathBuf, prefs: &UserPreferences) -> std::io::Result<()> {
    let json = serde_json::to_string_pretty(prefs)?;
    fs::write(prefs_path, json)?;
    Ok(())
}
