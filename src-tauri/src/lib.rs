use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use serde::Serialize;
use rusqlite::Connection;
use tauri::{AppHandle, Manager};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Shell::ShellExecuteW;
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

// ---- OpenActionResult ----

#[derive(Debug, Serialize, Clone)]
struct OpenActionResult { ok: bool, message: String }

#[derive(Debug, Serialize, Clone)]
struct DetectedTool {
    id: String,
    name: String,
    #[serde(rename = "type")]
    tool_type: String,
    path: String,
    args: String,
    default: bool,
}

fn success(msg: impl Into<String>) -> OpenActionResult { OpenActionResult { ok: true, message: msg.into() } }
fn failure(msg: impl Into<String>) -> OpenActionResult { OpenActionResult { ok: false, message: msg.into() } }

fn open_with_system(target: &str) -> Result<(), String> {
    let mut command = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd"); cmd.args(["/C", "start", "", target]); cmd
    } else if cfg!(target_os = "macos") {
        let mut cmd = Command::new("open"); cmd.arg(target); cmd
    } else {
        let mut cmd = Command::new("xdg-open"); cmd.arg(target); cmd
    };
    command.spawn().map(|_| ()).map_err(|e| e.to_string())
}

fn open_url_with_system(url: &str, new_window: bool) -> Result<(), String> {
    let mut command = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", "start", "", url]);
        cmd
    } else if cfg!(target_os = "macos") {
        let mut cmd = Command::new("open");
        if new_window { cmd.args(["-n", url]); } else { cmd.arg(url); }
        cmd
    } else {
        let mut cmd = Command::new("xdg-open");
        cmd.arg(url);
        cmd
    };
    command.spawn().map(|_| ()).map_err(|e| e.to_string())
}

fn expand_env_path(input: &str) -> String {
    let mut output = String::new();
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '%' {
            if let Some(end) = chars[i + 1..].iter().position(|c| *c == '%') {
                let key: String = chars[i + 1..i + 1 + end].iter().collect();
                if let Ok(value) = env::var(&key) {
                    output.push_str(&value);
                } else {
                    output.push('%');
                    output.push_str(&key);
                    output.push('%');
                }
                i += end + 2;
                continue;
            }
        }
        if chars[i] == '$' {
            if i + 1 < chars.len() && chars[i + 1] == '{' {
                if let Some(end) = chars[i + 2..].iter().position(|c| *c == '}') {
                    let key: String = chars[i + 2..i + 2 + end].iter().collect();
                    output.push_str(&env::var(&key).unwrap_or_else(|_| format!("${{{key}}}")));
                    i += end + 3;
                    continue;
                }
            }
            let mut end = i + 1;
            while end < chars.len() && (chars[end].is_ascii_alphanumeric() || chars[end] == '_') {
                end += 1;
            }
            if end > i + 1 {
                let key: String = chars[i + 1..end].iter().collect();
                output.push_str(&env::var(&key).unwrap_or_else(|_| format!("${key}")));
                i = end;
                continue;
            }
        }
        output.push(chars[i]);
        i += 1;
    }

    if let Some(stripped) = output.strip_prefix("~") {
        if stripped.is_empty() || stripped.starts_with(['/', '\\']) {
            if let Some(home) = dirs::home_dir() {
                return format!("{}{}", home.display(), stripped);
            }
        }
    }
    output
}

fn wildcard_matches(pattern: &str, value: &str) -> bool {
    let pattern = pattern.to_lowercase();
    let value = value.to_lowercase();
    if pattern == "*" { return true; }
    let parts: Vec<&str> = pattern.split('*').collect();
    let mut cursor = 0usize;
    for (index, part) in parts.iter().enumerate() {
        if part.is_empty() { continue; }
        if index == 0 && !pattern.starts_with('*') {
            if !value.starts_with(part) { return false; }
            cursor = part.len();
            continue;
        }
        if let Some(found) = value[cursor..].find(part) {
            cursor += found + part.len();
        } else {
            return false;
        }
    }
    if !pattern.ends_with('*') {
        if let Some(last) = parts.last() {
            return value.ends_with(last);
        }
    }
    true
}

fn split_pattern_path(path: &str) -> (PathBuf, Vec<String>) {
    let normalized = if cfg!(target_os = "windows") { path.replace('/', "\\") } else { path.to_string() };
    let separator = if cfg!(target_os = "windows") { '\\' } else { '/' };
    let mut parts: Vec<String> = normalized.split(separator).filter(|part| !part.is_empty()).map(String::from).collect();
    if cfg!(target_os = "windows") && parts.first().is_some_and(|part| part.ends_with(':')) {
        let drive = parts.remove(0);
        return (PathBuf::from(format!("{drive}\\")), parts);
    }
    if normalized.starts_with(separator) {
        return (PathBuf::from(separator.to_string()), parts);
    }
    (PathBuf::new(), parts)
}

fn resolve_wildcard_path(pattern: &str) -> Option<String> {
    let expanded = expand_env_path(pattern);
    if !expanded.contains('*') {
        return Some(expanded);
    }

    let (base, parts) = split_pattern_path(&expanded);
    let mut candidates = vec![base];
    for part in parts {
        let mut next = Vec::new();
        if part.contains('*') {
            for candidate in &candidates {
                let Ok(entries) = fs::read_dir(candidate) else { continue; };
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if wildcard_matches(&part, &name) {
                        next.push(entry.path());
                    }
                }
            }
            next.sort_by(|a, b| b.to_string_lossy().cmp(&a.to_string_lossy()));
        } else {
            next = candidates.into_iter().map(|mut candidate| {
                candidate.push(&part);
                candidate
            }).collect();
        }
        candidates = next;
        if candidates.is_empty() { return None; }
    }

    candidates.into_iter().find(|path| path.exists()).map(|path| path.to_string_lossy().to_string())
}

fn resolve_launch_path(path: &str) -> String {
    if path.trim().is_empty() || path == "shell:open" { return path.to_string(); }
    resolve_wildcard_path(path).unwrap_or_else(|| expand_env_path(path))
}

#[cfg(target_os = "windows")]
fn to_wide_null(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(target_os = "windows")]
fn open_application_with_shell(path: &str, args: &[String]) -> Result<(), String> {
    let operation = to_wide_null("open");
    let file = to_wide_null(path);
    let params = to_wide_null(&args.iter().map(|arg| {
        if arg.contains(char::is_whitespace) || arg.contains('"') {
            format!("\"{}\"", arg.replace('"', "\\\""))
        } else {
            arg.clone()
        }
    }).collect::<Vec<_>>().join(" "));
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            if args.is_empty() { std::ptr::null() } else { params.as_ptr() },
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    } as isize;

    if result > 32 { Ok(()) } else { Err(format!("ShellExecuteW failed with code {result}")) }
}

fn detect_tool(id: &str, name: &str, tool_type: &str, candidates: &[&str], args: &str, default: bool) -> Option<DetectedTool> {
    candidates.iter().find_map(|candidate| {
        let resolved = resolve_wildcard_path(candidate)?;
        if resolved.contains('%') || resolved.contains('$') || resolved.contains('*') { return None; }
        if !PathBuf::from(&resolved).exists() { return None; }
        Some(DetectedTool {
            id: id.to_string(),
            name: name.to_string(),
            tool_type: tool_type.to_string(),
            path: resolved,
            args: args.to_string(),
            default,
        })
    })
}

// ---- Database state ----

struct AppState { db: Mutex<Connection> }

fn init_db(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS scenes (id TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS collections (id TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS tools (id TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS plugins (id TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS plugin_store (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, value TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    ")
}

// ---- Tauri commands: open actions ----

#[tauri::command]
fn open_path(path: String) -> OpenActionResult {
    match open_with_system(&path) { Ok(_) => success(format!("Opened path: {path}")), Err(e) => failure(format!("Failed to open path: {e}")) }
}
#[tauri::command]
fn open_url(url: String, new_window: Option<bool>) -> OpenActionResult {
    match open_url_with_system(&url, new_window.unwrap_or(true)) { Ok(_) => success(format!("Opened URL: {url}")), Err(e) => failure(format!("Failed to open URL: {e}")) }
}
#[tauri::command]
fn open_file(path: String) -> OpenActionResult { open_path(path) }

#[tauri::command]
fn open_application(path: String, args: Vec<String>) -> OpenActionResult {
    let resolved_path = resolve_launch_path(&path);
    let mut cmd = Command::new(&resolved_path); cmd.args(&args);
    match cmd.spawn() {
        Ok(_) => success(format!("Started application: {resolved_path}")),
        Err(e) => {
            #[cfg(target_os = "windows")]
            {
                if e.raw_os_error() == Some(740) {
                    return match open_application_with_shell(&resolved_path, &args) {
                        Ok(_) => success(format!("Started application with shell: {resolved_path}")),
                        Err(shell_error) => failure(format!("Failed to start application: {e}; shell fallback failed: {shell_error}")),
                    };
                }
            }
            failure(format!("Failed to start application: {e}"))
        }
    }
}

#[tauri::command]
fn scan_open_tools() -> Vec<DetectedTool> {
    let mut tools = Vec::new();
    let definitions = [
        (
            "cursor",
            "Cursor",
            "编辑器",
            vec![
                "%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe",
                "%ProgramFiles%\\Cursor\\Cursor.exe",
            ],
            "{path}",
            true,
        ),
        (
            "vscode",
            "VS Code",
            "编辑器",
            vec![
                "%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe",
                "%ProgramFiles%\\Microsoft VS Code\\Code.exe",
                "%ProgramFiles(x86)%\\Microsoft VS Code\\Code.exe",
            ],
            "{path}",
            false,
        ),
        (
            "chrome",
            "Chrome",
            "浏览器",
            vec![
                "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe",
                "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe",
                "%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe",
            ],
            "{url}",
            true,
        ),
        (
            "edge",
            "Edge",
            "浏览器",
            vec![
                "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe",
                "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe",
                "%LOCALAPPDATA%\\Microsoft\\Edge\\Application\\msedge.exe",
            ],
            "{url}",
            false,
        ),
        (
            "powershell",
            "PowerShell",
            "终端",
            vec![
                "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                "powershell.exe",
            ],
            "-NoExit -Command {command}",
            true,
        ),
        (
            "excel",
            "Excel",
            "Office",
            vec![
                "%ProgramFiles%\\Microsoft Office\\root\\Office*\\EXCEL.EXE",
                "%ProgramFiles(x86)%\\Microsoft Office\\root\\Office*\\EXCEL.EXE",
                "%ProgramFiles%\\Microsoft Office\\Office*\\EXCEL.EXE",
                "%ProgramFiles(x86)%\\Microsoft Office\\Office*\\EXCEL.EXE",
                "EXCEL.EXE",
            ],
            "{path}",
            true,
        ),
        (
            "autocad",
            "AutoCAD",
            "CAD",
            vec![
                "%ProgramFiles%\\Autodesk\\AutoCAD*\\acad.exe",
                "%ProgramFiles%\\Autodesk\\AutoCAD *\\acad.exe",
                "%ProgramFiles(x86)%\\Autodesk\\AutoCAD*\\acad.exe",
                "acad.exe",
            ],
            "{path}",
            false,
        ),
    ];

    for (id, name, tool_type, candidates, args, default) in definitions {
        if let Some(tool) = detect_tool(id, name, tool_type, &candidates, args, default) {
            tools.push(tool);
        }
    }
    tools
}

#[tauri::command]
fn run_command(command: String, working_directory: Option<String>) -> OpenActionResult {
    let mut process = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd"); cmd.args(["/C", &command]); cmd
    } else {
        let mut cmd = Command::new("sh"); cmd.args(["-c", &command]); cmd
    };
    if let Some(dir) = working_directory.filter(|d| !d.trim().is_empty()) { process.current_dir(dir); }
    match process.spawn() { Ok(_) => success(format!("Started command: {command}")), Err(e) => failure(format!("Failed to run command: {e}")) }
}

#[tauri::command]
fn test_webdav_connection(server_url: String, username: String) -> OpenActionResult {
    if server_url.trim().is_empty() || username.trim().is_empty() { return failure("WebDAV server URL and username are required"); }
    success("WebDAV connection test completed in prototype mode")
}

#[tauri::command]
fn sync_webdav_now() -> OpenActionResult { success("WebDAV sync completed in prototype mode") }

// ---- Tauri commands: database ----

#[tauri::command]
fn db_init(state: tauri::State<AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    init_db(&db).map_err(|e| e.to_string())?;
    Ok("ok".into())
}

/// Execute a single SQL statement with no params.
#[tauri::command]
fn db_execute(state: tauri::State<AppState>, sql: String) -> Result<u64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(&sql, []).map_err(|e| e.to_string()).map(|n| n as u64)
}

/// Execute SQL with params (array of strings/numbers/nulls).
#[tauri::command]
fn db_execute_params(state: tauri::State<AppState>, sql: String, params: Vec<Option<String>>) -> Result<u64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let params: Vec<Box<dyn rusqlite::types::ToSql>> = params.iter().map(|p| match p {
        Some(s) => Box::new(s.clone()) as Box<dyn rusqlite::types::ToSql>,
        None => Box::new(rusqlite::types::Null) as Box<dyn rusqlite::types::ToSql>,
    }).collect();
    let refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    db.execute(&sql, refs.as_slice()).map_err(|e| e.to_string()).map(|n| n as u64)
}

/// Query a single-column value from app_state.
#[tauri::command]
fn db_get_value(state: tauri::State<AppState>, key: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT value FROM app_state WHERE key = ?1").map_err(|e| e.to_string())?;
    let result = stmt.query_row(rusqlite::params![key], |row| row.get::<_, String>(0)).ok();
    Ok(result)
}

/// Set a key-value row in app_state.
#[tauri::command]
fn db_set_value(state: tauri::State<AppState>, key: String, value: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT OR REPLACE INTO app_state (key, value) VALUES (?1, ?2)", rusqlite::params![key, value]).map_err(|e| e.to_string())?;
    Ok(())
}

/// Query all values from a table (returns JSON array of strings).
#[tauri::command]
fn db_list_table(state: tauri::State<AppState>, table: String) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let safe_tables = ["workspaces", "scenes", "collections", "items", "tools", "plugins", "plugin_store", "activity"];
    if !safe_tables.contains(&table.as_str()) { return Err(format!("Invalid table: {table}")); }
    let sql = format!("SELECT value FROM {table}");
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let rows: Vec<String> = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok()).collect();
    Ok(rows)
}

/// Bulk insert rows (each row is a JSON string) into a table.
#[tauri::command]
fn db_bulk_insert(state: tauri::State<AppState>, table: String, rows: Vec<String>) -> Result<u64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let safe_tables = ["workspaces", "scenes", "collections", "items", "tools", "plugins", "plugin_store", "activity"];
    if !safe_tables.contains(&table.as_str()) { return Err(format!("Invalid table: {table}")); }
    let sql = format!("INSERT OR REPLACE INTO {table} (id, value) VALUES (?1, ?2)");
    let mut count = 0u64;
    // Rows are JSON strings containing the full entity. Parse to get the id field.
    for row_json in &rows {
        let obj: serde_json::Value = serde_json::from_str(row_json).map_err(|e| e.to_string())?;
        let id = obj.get("id").and_then(|v| v.as_str()).ok_or("Missing id field")?;
        db.execute(&sql, rusqlite::params![id, row_json]).map_err(|e| e.to_string())?;
        count += 1;
    }
    Ok(count)
}

// ---- Entry point ----

/// Default global hotkey to toggle the OpenDock main window.
const DEFAULT_GLOBAL_HOTKEY: &str = "Alt+O";
const TRAY_MENU_SHOW: &str = "show";
const TRAY_MENU_HIDE: &str = "hide";
const TRAY_MENU_QUIT: &str = "quit";

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().unwrap_or(true);
        let focused = window.is_focused().unwrap_or(false);
        if visible && focused {
            let _ = window.hide();
        } else {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    } else {
        show_main_window(app);
    }
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, TRAY_MENU_SHOW, "显示窗口", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, TRAY_MENU_HIDE, "隐藏窗口", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, TRAY_MENU_QUIT, "退出 OpenDock", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

    let mut builder = TrayIconBuilder::with_id("opendock-tray")
        .tooltip("OpenDock")
        .menu(&menu)
        .show_menu_on_left_click(false);

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_MENU_SHOW => show_main_window(app),
            TRAY_MENU_HIDE => hide_main_window(app),
            TRAY_MENU_QUIT => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button,
                button_state,
                ..
            } = event
            {
                if button == MouseButton::Left && button_state == MouseButtonState::Up {
                    toggle_main_window(tray.app_handle());
                }
            }
        })
        .build(app)?;
    Ok(())
}

/// The currently registered toggle-window hotkey.
/// Wrapped in a `Mutex` so the runtime can swap it without touching app state.
static CURRENT_HOTKEY: std::sync::Mutex<Option<Shortcut>> = std::sync::Mutex::new(None);

fn apply_global_hotkey(app: &AppHandle, key: &str) -> Result<String, String> {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return Err("快捷键不能为空".into());
    }
    let shortcut: Shortcut = trimmed
        .parse()
        .map_err(|err| format!("无法解析快捷键 '{trimmed}': {err}"))?;
    let manager = app.global_shortcut();

    // Unregister the previous one first to avoid leaking handles.
    let mut guard = CURRENT_HOTKEY
        .lock()
        .map_err(|_| "快捷键状态已损坏".to_string())?;
    if let Some(previous) = guard.take() {
        if manager.is_registered(previous.clone()) {
            let _ = manager.unregister(previous);
        }
    }

    manager
        .register(shortcut.clone())
        .map_err(|err| format!("注册全局快捷键失败: {err}"))?;
    *guard = Some(shortcut);
    Ok(trimmed.to_string())
}

fn current_hotkey_matches(candidate: &Shortcut) -> bool {
    CURRENT_HOTKEY
        .lock()
        .ok()
        .and_then(|guard| guard.as_ref().map(|s| s == candidate))
        .unwrap_or(false)
}

fn register_global_hotkey(app: &AppHandle) {
    if let Err(err) = apply_global_hotkey(app, DEFAULT_GLOBAL_HOTKEY) {
        eprintln!(
            "[OpenDock] failed to register default global hotkey '{DEFAULT_GLOBAL_HOTKEY}': {err}"
        );
    }
}

#[tauri::command]
fn set_global_hotkey(app: AppHandle, key: String) -> OpenActionResult {
    match apply_global_hotkey(&app, &key) {
        Ok(applied) => success(format!("已绑定全局快捷键: {applied}")),
        Err(err) => failure(err),
    }
}

pub fn run() {
    let db_path = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("OpenDock")
        .join("opendock.db");
    if let Some(parent) = db_path.parent() { let _ = std::fs::create_dir_all(parent); }
    let conn = Connection::open(&db_path).expect("Failed to open SQLite database");
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;").expect("Failed to set pragmas");
    let state = AppState { db: Mutex::new(conn) };

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Triggered when a second instance tries to launch: surface the existing window.
            show_main_window(app);
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }
                    if current_hotkey_matches(shortcut) {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
        .manage(state)
        .setup(|app| {
            let handle = app.handle().clone();
            setup_tray(&handle)?;
            register_global_hotkey(&handle);

            // Intercept window close: hide to tray instead of exiting.
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let _ = window_clone.hide();
                        api.prevent_close();
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_path, open_url, open_file, open_application, scan_open_tools, run_command,
            test_webdav_connection, sync_webdav_now, set_global_hotkey,
            db_init, db_execute, db_execute_params, db_get_value, db_set_value, db_list_table, db_bulk_insert
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenDock");
}
