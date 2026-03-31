# Bridge + Claude Code Integration via MCP

## Vision

Enable Bridge to autonomously improve itself by allowing Claude Code to work on tasks in the System project. When you click a button in Bridge, it spawns Claude Code to work on a task, with Claude using MCP tools to get context and update progress.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Bridge App                          │
│  ┌──────────────┐                   ┌───────────────┐   │
│  │   Frontend   │                   │  Tauri/Rust   │   │
│  │     UI       │──── invoke() ────►│   Backend     │   │
│  │              │                   │               │   │
│  │ • Task list  │                   │ • MCP Server  │   │
│  │ • AI button  │                   │ • CLI spawner │   │
│  └──────────────┘                   └───────┬───────┘   │
│                                              │           │
└──────────────────────────────────────────────┼───────────┘
                                               │
                                    spawns with context
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │   Claude Code CLI   │
                                    │                     │
                                    │  • Receives prompt  │
                                    │  • Uses MCP tools   │
                                    │  • Makes changes    │
                                    │  • Updates status   │
                                    └──────────┬──────────┘
                                               │
                                    MCP Protocol (stdio)
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │   Bridge MCP Server │
                                    │   (stdio server)    │
                                    │                     │
                                    │  Tools:             │
                                    │  • get_task         │
                                    │  • update_task      │
                                    │  • get_related_files│
                                    └─────────────────────┘
```

## User Flow

1. User has tasks in System project: "Add dark mode", "Fix bug in timer", etc.
2. User clicks "🤖 AI Work" button next to a task
3. Bridge spawns: `claude --mcp-server bridge-tasks "Work on task: [title]"`
4. Claude Code starts in the Bridge repo directory
5. Claude calls MCP tool `get_task(id)` to fetch full context
6. Claude makes edits, runs tests, commits to branch
7. Claude calls MCP tool `update_task(id, status: 'done')`
8. User sees task marked complete in Bridge, reviews PR

## Implementation Plan

### Phase 1: MCP Server in Bridge

Create an MCP server that Bridge runs alongside the main app.

**File: `src-tauri/src/mcp_server.rs`**

```rust
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use crate::db::Database;

#[derive(Debug, Serialize, Deserialize)]
struct MCPRequest {
    jsonrpc: String,
    id: Value,
    method: String,
    params: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct MCPResponse {
    jsonrpc: String,
    id: Value,
    result: Option<Value>,
    error: Option<MCPError>,
}

#[derive(Debug, Serialize, Deserialize)]
struct MCPError {
    code: i32,
    message: String,
}

pub struct BridgeMCPServer {
    db: Database,
}

impl BridgeMCPServer {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    pub fn run(&self) -> io::Result<()> {
        let stdin = io::stdin();
        let mut stdout = io::stdout();

        for line in stdin.lock().lines() {
            let line = line?;
            let request: MCPRequest = match serde_json::from_str(&line) {
                Ok(req) => req,
                Err(e) => {
                    eprintln!("Failed to parse request: {}", e);
                    continue;
                }
            };

            let response = self.handle_request(request);
            let response_json = serde_json::to_string(&response)?;
            writeln!(stdout, "{}", response_json)?;
            stdout.flush()?;
        }

        Ok(())
    }

    fn handle_request(&self, request: MCPRequest) -> MCPResponse {
        match request.method.as_str() {
            "initialize" => self.handle_initialize(request.id),
            "tools/list" => self.handle_tools_list(request.id),
            "tools/call" => self.handle_tool_call(request.id, request.params),
            _ => MCPResponse {
                jsonrpc: "2.0".to_string(),
                id: request.id,
                result: None,
                error: Some(MCPError {
                    code: -32601,
                    message: format!("Method not found: {}", request.method),
                }),
            },
        }
    }

    fn handle_initialize(&self, id: Value) -> MCPResponse {
        MCPResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(json!({
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": "bridge-tasks",
                    "version": "0.1.0"
                },
                "capabilities": {
                    "tools": {}
                }
            })),
            error: None,
        }
    }

    fn handle_tools_list(&self, id: Value) -> MCPResponse {
        MCPResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(json!({
                "tools": [
                    {
                        "name": "get_task",
                        "description": "Get full details of a Bridge task including title, description, dependencies, and related files",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "string",
                                    "description": "The UUID of the task to retrieve"
                                }
                            },
                            "required": ["task_id"]
                        }
                    },
                    {
                        "name": "update_task_status",
                        "description": "Update the status of a Bridge task (blocked, ready, in_progress, done)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "string",
                                    "description": "The UUID of the task to update"
                                },
                                "status": {
                                    "type": "string",
                                    "enum": ["blocked", "ready", "in_progress", "done"],
                                    "description": "The new status for the task"
                                }
                            },
                            "required": ["task_id", "status"]
                        }
                    },
                    {
                        "name": "get_system_tasks",
                        "description": "Get all tasks from the System project (Bridge's self-improvement backlog)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "status": {
                                    "type": "string",
                                    "enum": ["all", "blocked", "ready", "in_progress", "done"],
                                    "description": "Filter tasks by status (default: all)"
                                }
                            }
                        }
                    },
                    {
                        "name": "get_related_files",
                        "description": "Get a list of files likely related to this task based on its description and previous work",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "string",
                                    "description": "The UUID of the task"
                                }
                            },
                            "required": ["task_id"]
                        }
                    },
                    {
                        "name": "add_task_note",
                        "description": "Add a note/comment to a task to track progress or blockers",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "string",
                                    "description": "The UUID of the task"
                                },
                                "note": {
                                    "type": "string",
                                    "description": "The note content"
                                }
                            },
                            "required": ["task_id", "note"]
                        }
                    }
                ]
            })),
            error: None,
        }
    }

    fn handle_tool_call(&self, id: Value, params: Option<Value>) -> MCPResponse {
        let params = match params {
            Some(p) => p,
            None => {
                return MCPResponse {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: None,
                    error: Some(MCPError {
                        code: -32602,
                        message: "Missing params".to_string(),
                    }),
                }
            }
        };

        let tool_name = params["name"].as_str().unwrap_or("");
        let arguments = &params["arguments"];

        match tool_name {
            "get_task" => self.tool_get_task(id, arguments),
            "update_task_status" => self.tool_update_task_status(id, arguments),
            "get_system_tasks" => self.tool_get_system_tasks(id, arguments),
            "get_related_files" => self.tool_get_related_files(id, arguments),
            "add_task_note" => self.tool_add_task_note(id, arguments),
            _ => MCPResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: None,
                error: Some(MCPError {
                    code: -32602,
                    message: format!("Unknown tool: {}", tool_name),
                }),
            },
        }
    }

    fn tool_get_task(&self, id: Value, args: &Value) -> MCPResponse {
        let task_id = match args["task_id"].as_str() {
            Some(id) => id,
            None => {
                return MCPResponse {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: None,
                    error: Some(MCPError {
                        code: -32602,
                        message: "Missing task_id".to_string(),
                    }),
                }
            }
        };

        // Get task from database
        let tasks = match self.db.get_tasks(None) {
            Ok(tasks) => tasks,
            Err(e) => {
                return MCPResponse {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: None,
                    error: Some(MCPError {
                        code: -32603,
                        message: format!("Database error: {}", e),
                    }),
                }
            }
        };

        let task = tasks.iter().find(|t| t.id == task_id);

        match task {
            Some(task) => {
                // Get dependencies if any
                let dependencies = self.db.get_dependencies(Some(task_id.to_string()))
                    .unwrap_or_default();

                MCPResponse {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: Some(json!({
                        "content": [{
                            "type": "text",
                            "text": format!(
                                "Task: {}\n\nDescription:\n{}\n\nStatus: {}\nDepth: {}\nParent: {}\n\nDependencies: {} blocking tasks\n\nCreated: {}\nUpdated: {}",
                                task.title,
                                task.description.as_deref().unwrap_or("No description"),
                                task.status,
                                task.depth,
                                task.parent_task_id.as_deref().unwrap_or("None"),
                                dependencies.len(),
                                task.created_at,
                                task.updated_at
                            )
                        }]
                    })),
                    error: None,
                }
            }
            None => MCPResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: None,
                error: Some(MCPError {
                    code: -32602,
                    message: format!("Task not found: {}", task_id),
                }),
            },
        }
    }

    fn tool_update_task_status(&self, id: Value, args: &Value) -> MCPResponse {
        let task_id = args["task_id"].as_str().unwrap_or("");
        let status = args["status"].as_str().unwrap_or("");

        let update_input = crate::db::UpdateTaskInput {
            title: None,
            description: None,
            status: Some(status.to_string()),
        };

        match self.db.update_task(task_id, update_input) {
            Ok(task) => MCPResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: Some(json!({
                    "content": [{
                        "type": "text",
                        "text": format!("Task '{}' status updated to: {}", task.title, task.status)
                    }]
                })),
                error: None,
            },
            Err(e) => MCPResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: None,
                error: Some(MCPError {
                    code: -32603,
                    message: format!("Failed to update task: {}", e),
                }),
            },
        }
    }

    fn tool_get_system_tasks(&self, id: Value, args: &Value) -> MCPResponse {
        let status_filter = args["status"].as_str().unwrap_or("all");

        // TODO: Get actual System project ID from database
        // For now, we'll get all tasks and filter by project name
        let all_tasks = match self.db.get_tasks(None) {
            Ok(tasks) => tasks,
            Err(e) => {
                return MCPResponse {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: None,
                    error: Some(MCPError {
                        code: -32603,
                        message: format!("Database error: {}", e),
                    }),
                }
            }
        };

        let filtered_tasks: Vec<_> = all_tasks
            .iter()
            .filter(|t| {
                if status_filter == "all" {
                    true
                } else {
                    t.status == status_filter
                }
            })
            .collect();

        let task_list = filtered_tasks
            .iter()
            .map(|t| format!("- [{}] {} ({})", t.status, t.title, t.id))
            .collect::<Vec<_>>()
            .join("\n");

        MCPResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(json!({
                "content": [{
                    "type": "text",
                    "text": format!("System Project Tasks ({})\n\n{}", status_filter, task_list)
                }]
            })),
            error: None,
        }
    }

    fn tool_get_related_files(&self, id: Value, args: &Value) -> MCPResponse {
        let task_id = args["task_id"].as_str().unwrap_or("");

        // Get task to analyze description
        let tasks = self.db.get_tasks(None).unwrap_or_default();
        let task = tasks.iter().find(|t| t.id == task_id);

        let related_files = match task {
            Some(task) => {
                // Simple heuristic: extract file paths or keywords from description
                let description = task.description.as_deref().unwrap_or("");

                // Look for file patterns
                let mut files = Vec::new();
                if description.contains("frontend") || description.contains("UI") {
                    files.push("src/**/*.tsx");
                }
                if description.contains("backend") || description.contains("Rust") {
                    files.push("src-tauri/src/**/*.rs");
                }
                if description.contains("database") || description.contains("DB") {
                    files.push("src-tauri/src/db.rs");
                }
                if description.contains("theme") || description.contains("color") {
                    files.push("src/**/*theme*.tsx");
                    files.push("src-tauri/src/db.rs");
                }

                if files.is_empty() {
                    files.push("**/*");
                }

                files.join("\n")
            }
            None => "No task found".to_string(),
        };

        MCPResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Related file patterns for task:\n\n{}", related_files)
                }]
            })),
            error: None,
        }
    }

    fn tool_add_task_note(&self, id: Value, args: &Value) -> MCPResponse {
        let task_id = args["task_id"].as_str().unwrap_or("");
        let note = args["note"].as_str().unwrap_or("");

        // TODO: Implement task notes/comments in database
        // For now, append to description
        let tasks = self.db.get_tasks(None).unwrap_or_default();
        let task = tasks.iter().find(|t| t.id == task_id);

        match task {
            Some(task) => {
                let updated_description = format!(
                    "{}\n\n---\n[AI Note - {}]: {}",
                    task.description.as_deref().unwrap_or(""),
                    chrono::Utc::now().format("%Y-%m-%d %H:%M"),
                    note
                );

                let update_input = crate::db::UpdateTaskInput {
                    title: None,
                    description: Some(updated_description),
                    status: None,
                };

                match self.db.update_task(task_id, update_input) {
                    Ok(_) => MCPResponse {
                        jsonrpc: "2.0".to_string(),
                        id,
                        result: Some(json!({
                            "content": [{
                                "type": "text",
                                "text": "Note added to task"
                            }]
                        })),
                        error: None,
                    },
                    Err(e) => MCPResponse {
                        jsonrpc: "2.0".to_string(),
                        id,
                        result: None,
                        error: Some(MCPError {
                            code: -32603,
                            message: format!("Failed to add note: {}", e),
                        }),
                    },
                }
            }
            None => MCPResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: None,
                error: Some(MCPError {
                    code: -32602,
                    message: "Task not found".to_string(),
                }),
            },
        }
    }
}
```

**File: `src-tauri/src/main.rs`** (additions)

```rust
mod mcp_server;

// Add CLI command for MCP server mode
#[derive(clap::Parser)]
struct Cli {
    #[clap(long)]
    mcp_server: bool,
}

fn main() {
    let cli = Cli::parse();

    if cli.mcp_server {
        // Run MCP server mode
        let db_path = /* get db path */;
        let db = Database::new(db_path).expect("Failed to open database");
        let server = mcp_server::BridgeMCPServer::new(db);
        server.run().expect("MCP server failed");
        return;
    }

    // Normal Tauri app startup
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            start_ai_worker,
            // ... other handlers
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn start_ai_worker(task_id: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    use std::process::Command;

    // Get task details
    let task = state.db.get_tasks(None)
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|t| t.id == task_id)
        .ok_or("Task not found")?;

    // Get project root path
    let tracks = state.db.get_tracks(None).map_err(|e| e.to_string())?;
    let track = tracks.iter()
        .find(|tr| tr.id == task.track_id)
        .ok_or("Track not found")?;

    let projects = state.db.get_projects().map_err(|e| e.to_string())?;
    let project = projects.iter()
        .find(|p| p.id == track.project_id)
        .ok_or("Project not found")?;

    let root_path = project.root_path.as_ref()
        .ok_or("Project has no root_path set")?;

    // Get path to Bridge binary (for MCP server)
    let bridge_binary = std::env::current_exe()
        .map_err(|e| e.to_string())?;

    // Spawn Claude Code with MCP server
    let prompt = format!(
        "Work on this Bridge task:\n\n\
        Title: {}\n\
        Description: {}\n\n\
        Use the 'bridge-tasks' MCP server to:\n\
        1. Call get_task('{}') to get full details\n\
        2. Work on the task in this codebase\n\
        3. Run tests to verify your changes\n\
        4. Call update_task_status('{}', 'done') when complete\n\n\
        Create a git branch named 'ai/task-{}' for your work.",
        task.title,
        task.description.as_deref().unwrap_or("No description provided"),
        task_id,
        task_id,
        &task_id[..8]
    );

    Command::new("claude")
        .current_dir(root_path)
        .arg("--mcp-server")
        .arg(format!("bridge-tasks={} --mcp-server", bridge_binary.display()))
        .arg(prompt)
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude: {}", e))?;

    Ok(format!("Started AI worker for task: {}", task.title))
}
```

### Phase 2: UI Integration

**File: `src/views/ActiveView.tsx`** (additions)

```tsx
import { invoke } from '@tauri-apps/api/core';

function TaskCard({ task }: { task: Task }) {
  const [isStartingAI, setIsStartingAI] = useState(false);

  const handleStartAI = async () => {
    setIsStartingAI(true);
    try {
      const result = await invoke('start_ai_worker', { taskId: task.id });
      console.log(result);
      // Show toast notification
      toast.success('AI worker started! Check your terminal for progress.');
    } catch (error) {
      console.error('Failed to start AI worker:', error);
      toast.error('Failed to start AI worker');
    } finally {
      setIsStartingAI(false);
    }
  };

  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <p>{task.description}</p>

      {/* Only show AI button for System project tasks */}
      {isSystemProject && task.status === 'ready' && (
        <Button
          onClick={handleStartAI}
          disabled={isStartingAI}
          variant="outline"
          size="sm"
        >
          {isStartingAI ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Starting AI...
            </>
          ) : (
            <>
              <Bot className="h-4 w-4 mr-2" />
              AI Work
            </>
          )}
        </Button>
      )}
    </div>
  );
}
```

### Phase 3: Claude Code Configuration

**File: `~/.config/claude/mcp-servers.json`** (user's machine)

```json
{
  "mcpServers": {
    "bridge-tasks": {
      "command": "/path/to/bridge-app/bridge",
      "args": ["--mcp-server"],
      "env": {
        "BRIDGE_DB_PATH": "/Users/username/Library/Application Support/Bridge/bridge.db"
      }
    }
  }
}
```

Alternatively, Claude can auto-discover it if Bridge is in PATH:

```bash
claude --mcp-server bridge-tasks="bridge --mcp-server" "Work on task X"
```

## Safety & Guardrails

### 1. Git Branch Isolation
- All AI work happens on branches: `ai/task-{short-id}`
- Never commits directly to `main`
- User reviews PR before merging

### 2. Test Requirements
- Claude must run tests before marking task done
- If tests fail, task stays `in_progress` with note

### 3. User Approval
- Claude Code has built-in approval prompts for:
  - File edits
  - Git commits
  - Dangerous operations

### 4. Scope Limiting
- MCP tools only work with System project
- Can't modify Bridge's core database schema
- No access to user data or other projects

### 5. Audit Trail
- All AI work tracked in git history
- Task notes record what AI attempted
- Can revert any changes

## Future Enhancements

### Phase 4: Real-time Progress
- Stream Claude's output to Bridge UI
- Show live file edits in a panel
- Display test results inline

### Phase 5: Learning Loop
- Track which tasks succeed/fail
- Build knowledge base of common patterns
- Suggest improvements to task descriptions

### Phase 6: Batch Processing
- "AI Work Session" mode
- Claude works through multiple ready tasks
- Nightly automation option

### Phase 7: Multi-Agent
- Specialized agents: "test-writer", "refactorer", "bug-fixer"
- Different models for different task types
- Parallel work on independent tasks

## Setup Instructions

### For Users

1. Install Claude Code CLI
2. Add Bridge to PATH or note full path
3. In Bridge, go to Settings → AI Integration
4. Click "Enable Claude Code Integration"
5. Set project root path for System project
6. Add tasks to System project
7. Click "AI Work" button on any ready task

### For Development

1. Add `clap` to Cargo.toml for CLI parsing
2. Implement MCP server module
3. Add `start_ai_worker` command to Tauri
4. Update UI with AI button
5. Test with: `cargo run -- --mcp-server` (runs MCP mode)
6. Test spawning: click button in UI

## Testing the Integration

### Manual Test

```bash
# Terminal 1: Run Bridge MCP server standalone
cd src-tauri
cargo run -- --mcp-server

# Terminal 2: Test with Claude
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | cargo run -- --mcp-server
```

### Integration Test

1. Create test task in System project
2. Click AI button
3. Watch Claude start in terminal
4. Verify Claude calls MCP tools
5. Check task status updates in Bridge

## Open Questions

1. **API Key Management**: Where should Claude API key live?
   - Option A: User's ~/.claude/config
   - Option B: Bridge's settings
   - Option C: Environment variable

2. **Concurrent Tasks**: Allow multiple AI workers?
   - Could lead to merge conflicts
   - Or use file-level locking

3. **Cost Tracking**: How to show AI usage costs?
   - Track tokens used per task
   - Display in task metadata

4. **Failure Handling**: What if Claude crashes?
   - Task stays `in_progress`
   - Show error in Bridge UI
   - Allow retry

5. **Notification**: How to alert user when done?
   - Native OS notification
   - Bridge UI indicator
   - Email/Slack integration

---

## Summary

This architecture gives Bridge the ability to improve itself by:
- Storing improvement tasks in the System project
- Allowing users to trigger AI work with a button
- Using MCP for rich context sharing
- Maintaining safety through git branches and user approval
- Creating an audit trail of all AI changes

The implementation is incremental and can start simple (button → spawn Claude) and evolve to sophisticated (real-time streaming, multi-agent, batch processing).
