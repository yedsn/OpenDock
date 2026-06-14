use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use rusqlite::Connection;
use tauri::{AppHandle, Emitter, Manager};
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_updater::UpdaterExt;

mod app_icon_rgba;
mod app_icon_light_rgba;
#[path = "../../plugins/.system/webdav-sync/service/webdav.rs"]
mod webdav;

use base64::Engine as _Base64Engine;
use std::io::Write;

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

const APP_UPDATE_EVENT: &str = "app-update-event";
const DEFAULT_UPDATER_ENDPOINT: &str = "https://github.com/OWNER/REPO/releases/latest/download/latest.json";
const DEFAULT_UPDATER_PUBKEY: &str = "REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY";
static UPDATE_TASK_RUNNING: AtomicBool = AtomicBool::new(false);

struct UpdateTaskGuard;

impl UpdateTaskGuard {
    fn acquire() -> Result<Self, String> {
        UPDATE_TASK_RUNNING
            .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
            .map(|_| Self)
            .map_err(|_| "已有更新任务正在进行，请稍后再试".to_string())
    }
}

impl Drop for UpdateTaskGuard {
    fn drop(&mut self) {
        UPDATE_TASK_RUNNING.store(false, Ordering::Release);
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppUpdateSummary {
    version: String,
    current_version: String,
    notes: Option<String>,
    pub_date: Option<String>,
    target: String,
    download_url: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppUpdateCheckResult {
    available: bool,
    current_version: String,
    update: Option<AppUpdateSummary>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppUpdateEventPayload {
    stage: String,
    downloaded_bytes: Option<u64>,
    chunk_length: Option<u64>,
    content_length: Option<u64>,
    message: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdaterPluginRuntimeConfig {
    #[serde(default)]
    endpoints: Vec<String>,
    #[serde(default)]
    pubkey: String,
}

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

fn is_macos_app_bundle(path: &str) -> bool {
    cfg!(target_os = "macos") && path.to_lowercase().ends_with(".app")
}

fn open_macos_app_bundle(path: &str, args: &[String]) -> Result<(), String> {
    let mut cmd = Command::new("open");
    cmd.args(["-a", path]);
    if !args.is_empty() {
        cmd.arg("--args");
        cmd.args(args);
    }
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}

fn run_macos_terminal_command(path: &str, args: &[String]) -> Option<Result<(), String>> {
    if !cfg!(target_os = "macos") || !path.ends_with("Terminal.app") || args.is_empty() {
        return None;
    }

    let command = args.join(" ");
    let script = format!("tell application \"Terminal\" to do script {:?}", command);
    let result = Command::new("osascript")
        .args(["-e", &script, "-e", "tell application \"Terminal\" to activate"])
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string());
    Some(result)
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
        CREATE TABLE IF NOT EXISTS plugin_store (id TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS plugin_data (plugin_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(plugin_id, key));
        CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, value TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    ")?;

    let snapshot_note_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('snapshots') WHERE name = 'note'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if snapshot_note_exists == 0 {
        conn.execute("ALTER TABLE snapshots ADD COLUMN note TEXT NOT NULL DEFAULT ''", [])?;
    }

    // Migration: older builds created plugin_store with an INTEGER PK; the row writer now stores text ids,
    // so drop the legacy table when its column type does not match. Plugin store data is rebuilt from seed/import.
    let plugin_store_id_type: String = conn
        .query_row(
            "SELECT type FROM pragma_table_info('plugin_store') WHERE name = 'id'",
            [],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_default();
    if !plugin_store_id_type.eq_ignore_ascii_case("TEXT") {
        conn.execute_batch(
            "DROP TABLE IF EXISTS plugin_store; CREATE TABLE plugin_store (id TEXT PRIMARY KEY, value TEXT NOT NULL);",
        )?;
    }
    Ok(())
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

/// Pre-start a Chromium browser to consume session restore on cold launch.
/// If the browser is not running, launches it with about:blank and waits briefly
/// so that the "continue where you left off" restore completes before the real
/// URL is opened by a subsequent call. If the browser is already running, this
/// is a no-op.
#[tauri::command]
fn prestart_browser(browser_path: String) -> OpenActionResult {
    let resolved_path = resolve_launch_path(&browser_path);
    let app_name = std::path::PathBuf::from(&resolved_path)
        .file_stem()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let exe_name = app_name.to_lowercase();

    let is_chromium = exe_name.contains("msedge")
        || exe_name.contains("chrome")
        || exe_name.contains("chromium")
        || exe_name.contains("brave")
        || exe_name.contains("vivaldi")
        || exe_name.contains("opera");

    if !is_chromium {
        return success("No pre-start needed for non-Chromium browser");
    }

    // Check if the browser process is already running.
    let running = if cfg!(target_os = "windows") {
        Command::new("tasklist")
            .args(["/FI", &format!("IMAGENAME eq {exe_name}"), "/NH", "/FO", "CSV"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_lowercase().contains(&exe_name))
            .unwrap_or(false)
    } else if cfg!(target_os = "macos") {
        Command::new("pgrep")
            .args(["-x", &app_name])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else {
        Command::new("pgrep")
            .args(["-f", &exe_name])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };

    if running {
        return success("Browser already running");
    }

    // Pre-start browser with about:blank to consume the session restore.
    let result = if is_macos_app_bundle(&resolved_path) {
        open_macos_app_bundle(&resolved_path, &["about:blank".into()])
    } else {
        let mut pre_cmd = Command::new(&resolved_path);
        pre_cmd.arg("about:blank");
        pre_cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
    };
    match result { Ok(_) => success("Browser pre-started"), Err(e) => failure(format!("Failed to pre-start browser: {e}")) }
}

/// Open a URL in a specific browser. The caller should call prestart_browser
/// first when batch-opening URLs to avoid session restore on cold start.
#[tauri::command]
fn open_url_in_browser(browser_path: String, url: String, new_window: bool) -> OpenActionResult {
    let resolved_path = resolve_launch_path(&browser_path);
    if is_macos_app_bundle(&resolved_path) {
        let mut args = Vec::new();
        if new_window { args.push("--new-window".into()); }
        args.push(url.clone());
        return match open_macos_app_bundle(&resolved_path, &args) {
            Ok(_) => success(format!("Opened URL in browser: {url}")),
            Err(e) => failure(format!("Failed to open URL in browser: {e}")),
        };
    }

    let mut cmd = Command::new(&resolved_path);
    if new_window {
        cmd.arg("--new-window");
    }
    cmd.arg(&url);

    match cmd.spawn() {
        Ok(_) => success(format!("Opened URL in browser: {url}")),
        Err(e) => {
            #[cfg(target_os = "windows")]
            {
                if e.raw_os_error() == Some(740) {
                    let shell_args: Vec<String> = if new_window {
                        vec!["--new-window".into(), url.clone()]
                    } else {
                        vec![url.clone()]
                    };
                    return match open_application_with_shell(&resolved_path, &shell_args) {
                        Ok(_) => success(format!("Opened URL in browser with shell: {url}")),
                        Err(se) => failure(format!("Failed to open URL in browser: {e}; shell fallback failed: {se}")),
                    };
                }
            }
            failure(format!("Failed to open URL in browser: {e}"))
        }
    }
}


#[tauri::command]
fn open_application(path: String, args: Vec<String>) -> OpenActionResult {
    let resolved_path = resolve_launch_path(&path);
    if let Some(result) = run_macos_terminal_command(&resolved_path, &args) {
        return match result {
            Ok(_) => success(format!("Started terminal command: {}", args.join(" "))),
            Err(e) => failure(format!("Failed to start terminal command: {e}")),
        };
    }

    if is_macos_app_bundle(&resolved_path) {
        return match open_macos_app_bundle(&resolved_path, &args) {
            Ok(_) => success(format!("Started application: {resolved_path}")),
            Err(e) => failure(format!("Failed to start application: {e}")),
        };
    }

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
                "/Applications/Cursor.app",
                "~/Applications/Cursor.app",
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
                "/Applications/Visual Studio Code.app",
                "~/Applications/Visual Studio Code.app",
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
                "/Applications/Google Chrome.app",
                "~/Applications/Google Chrome.app",
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
                "/Applications/Microsoft Edge.app",
                "~/Applications/Microsoft Edge.app",
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
            "terminal",
            "Terminal",
            "终端",
            vec![
                "/System/Applications/Utilities/Terminal.app",
                "/Applications/Utilities/Terminal.app",
            ],
            "{command}",
            true,
        ),
        (
            "excel",
            "Excel",
            "Office",
            vec![
                "/Applications/Microsoft Excel.app",
                "~/Applications/Microsoft Excel.app",
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
fn test_webdav_connection(server_url: String, username: String, password: String) -> OpenActionResult {
    if server_url.trim().is_empty() { return failure("WebDAV 地址不能为空"); }
    if username.trim().is_empty() { return failure("用户名不能为空"); }
    let r = webdav::test_connection(&server_url, &username, &password, "/");
    OpenActionResult { ok: r.ok, message: r.message }
}

#[tauri::command]
fn sync_webdav_now(
    _state: tauri::State<AppState>,
    server_url: String,
    username: String,
    password: String,
    remote_path: String,
    conflict_policy: String,
    local_data: String,
) -> OpenActionResult {
    if server_url.trim().is_empty() { return failure("WebDAV 地址未配置"); }
    if username.trim().is_empty() { return failure("WebDAV 用户名未配置"); }
    if remote_path.trim().is_empty() { return failure("远程目录未配置"); }

    let remote_file_path = format!("{}/opendock-sync.json", remote_path.trim_end_matches('/'));

    // Check if remote data exists
    let remote_exists = webdav::remote_exists(&server_url, &username, &password, &remote_file_path).unwrap_or(false);

    if remote_exists {
        let remote_data = match webdav::download(&server_url, &username, &password, &remote_file_path) {
            Ok(data) => data,
            Err(e) => return failure(format!("下载远程数据失败: {e}")),
        };

        if remote_data == local_data {
            return success("同步成功（本地与远程一致）");
        }

        match conflict_policy.as_str() {
            "覆盖远程" => {
                // Upload local data, overwrite remote
                let result = webdav::upload(&server_url, &username, &password, &remote_file_path, &local_data);
                if result.ok { success("同步成功（已覆盖远程数据）") } else { failure(format!("上传失败: {}", result.message)) }
            }
            "覆盖本地" => {
                // Return remote data to the frontend; it will replace local
                success(format!("SYNC_REMOTE_DATA:{remote_data}"))
            }
            _ => {
                // Any normal sync against different remote data requires an explicit user choice.
                success(format!("SYNC_CONFLICT:{remote_data}"))
            }
        }
    } else {
        // No remote data: just upload local
        let result = webdav::upload(&server_url, &username, &password, &remote_file_path, &local_data);
        if result.ok { success("同步成功（首次上传本地数据到远程）") } else { failure(format!("上传失败: {}", result.message)) }
    }
}

fn set_plugin_data(conn: &Connection, plugin_id: &str, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO plugin_data (plugin_id, key, value) VALUES (?1, ?2, ?3)",
        rusqlite::params![plugin_id, key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

fn get_plugin_data(conn: &Connection, plugin_id: &str, key: &str) -> Result<Option<String>, String> {
    let result = conn.query_row(
        "SELECT value FROM plugin_data WHERE plugin_id = ?1 AND key = ?2",
        rusqlite::params![plugin_id, key],
        |row| row.get::<_, String>(0),
    ).ok();
    Ok(result)
}

/// Store WebDAV password in plugin_data (obfuscated storage, not true encryption).
#[tauri::command]
fn webdav_set_credential(state: tauri::State<AppState>, password: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    set_plugin_data(&db, "webdav-sync", "secret:default", &password)
}

/// Retrieve stored WebDAV password from plugin_data.
#[tauri::command]
fn webdav_get_credential(state: tauri::State<AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(value) = get_plugin_data(&db, "webdav-sync", "secret:default")? {
        return Ok(value);
    }

    // Migrate the legacy app_state secret into the plugin data namespace on first read.
    let legacy = db.query_row(
        "SELECT value FROM app_state WHERE key = 'secret:webdav-sync/default'",
        [],
        |row| row.get::<_, String>(0),
    ).ok().unwrap_or_default();
    if !legacy.is_empty() {
        set_plugin_data(&db, "webdav-sync", "secret:default", &legacy)?;
    }
    Ok(legacy)
}
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<u64, String> {
    let target = std::path::PathBuf::from(&path);
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Create dir failed: {e}"))?;
        }
    }
    std::fs::write(&target, contents.as_bytes()).map_err(|e| format!("Write failed: {e}"))?;
    let size = std::fs::metadata(&target).map(|m| m.len()).unwrap_or_else(|_| contents.len() as u64);
    Ok(size)
}

// ---- Tauri commands: application updater ----

fn updater_runtime_config(app: &AppHandle) -> Result<UpdaterPluginRuntimeConfig, String> {
    let value = app
        .config()
        .plugins
        .0
        .get("updater")
        .cloned()
        .ok_or_else(|| "未找到 updater 配置".to_string())?;
    serde_json::from_value(value).map_err(|err| format!("解析 updater 配置失败: {err}"))
}

fn ensure_updater_is_configured(app: &AppHandle) -> Result<(), String> {
    let config = updater_runtime_config(app)?;
    let endpoints_ready = !config.endpoints.is_empty()
        && config.endpoints.iter().all(|endpoint| {
            let trimmed = endpoint.trim();
            !trimmed.is_empty() && trimmed != DEFAULT_UPDATER_ENDPOINT
        });
    let pubkey_ready = {
        let trimmed = config.pubkey.trim();
        !trimmed.is_empty() && trimmed != DEFAULT_UPDATER_PUBKEY
    };

    if endpoints_ready && pubkey_ready {
        Ok(())
    } else {
        Err("更新功能尚未完成发布配置，请先在 tauri.conf.json 中填写发布地址和 updater 公钥。".to_string())
    }
}

fn emit_app_update_event(app: &AppHandle, payload: AppUpdateEventPayload) {
    if let Err(err) = app.emit(APP_UPDATE_EVENT, payload) {
        eprintln!("emit updater event failed: {err}");
    }
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
async fn check_app_update(app: AppHandle) -> Result<AppUpdateCheckResult, String> {
    let _guard = UpdateTaskGuard::acquire()?;
    ensure_updater_is_configured(&app)?;

    let current_version = app.package_info().version.to_string();
    let updater = app
        .updater_builder()
        .build()
        .map_err(|err| format!("初始化更新器失败: {err}"))?;
    let update = updater
        .check()
        .await
        .map_err(|err| format!("检查更新失败: {err}"))?;

    let update = update.map(|update| AppUpdateSummary {
        version: update.version,
        current_version: update.current_version,
        notes: update.body,
        pub_date: update.date.map(|date| date.to_string()),
        target: update.target,
        download_url: update.download_url.to_string(),
    });

    Ok(AppUpdateCheckResult {
        available: update.is_some(),
        current_version,
        update,
    })
}

#[tauri::command]
async fn download_and_install_update(app: AppHandle) -> Result<(), String> {
    let _guard = UpdateTaskGuard::acquire()?;
    ensure_updater_is_configured(&app)?;

    let updater = app
        .updater_builder()
        .build()
        .map_err(|err| format!("初始化更新器失败: {err}"))?;
    let update = updater
        .check()
        .await
        .map_err(|err| format!("检查更新失败: {err}"))?
        .ok_or_else(|| "当前已是最新版本，无需更新".to_string())?;

    let mut first_chunk = true;
    let mut downloaded_bytes = 0_u64;
    let app_handle = app.clone();

    update
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded_bytes = downloaded_bytes.saturating_add(chunk_length as u64);
                if first_chunk {
                    first_chunk = false;
                    emit_app_update_event(
                        &app_handle,
                        AppUpdateEventPayload {
                            stage: "download_started".to_string(),
                            downloaded_bytes: Some(0),
                            chunk_length: None,
                            content_length,
                            message: Some("开始下载更新".to_string()),
                        },
                    );
                }
                emit_app_update_event(
                    &app_handle,
                    AppUpdateEventPayload {
                        stage: "download_progress".to_string(),
                        downloaded_bytes: Some(downloaded_bytes),
                        chunk_length: Some(chunk_length as u64),
                        content_length,
                        message: None,
                    },
                );
            },
            {
                let app_handle = app.clone();
                move || {
                    emit_app_update_event(
                        &app_handle,
                        AppUpdateEventPayload {
                            stage: "download_finished".to_string(),
                            downloaded_bytes: None,
                            chunk_length: None,
                            content_length: None,
                            message: Some("下载完成，正在安装更新".to_string()),
                        },
                    );
                }
            },
        )
        .await
        .map_err(|err| {
            emit_app_update_event(
                &app,
                AppUpdateEventPayload {
                    stage: "failed".to_string(),
                    downloaded_bytes: None,
                    chunk_length: None,
                    content_length: None,
                    message: Some(format!("安装更新失败: {err}")),
                },
            );
            format!("安装更新失败: {err}")
        })?;

    emit_app_update_event(
        &app,
        AppUpdateEventPayload {
            stage: "installed".to_string(),
            downloaded_bytes: None,
            chunk_length: None,
            content_length: None,
            message: Some("更新已安装完成".to_string()),
        },
    );

    Ok(())
}

#[tauri::command]
fn restart_app(app: AppHandle) -> Result<(), String> {
    app.request_restart();
    Ok(())
}


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
    let mut count = 0u64;
    for row_json in &rows {
        let obj: serde_json::Value = serde_json::from_str(row_json).map_err(|e| e.to_string())?;
        let id = obj
            .get("id").and_then(|v| v.as_str())
            .or_else(|| obj.get("name").and_then(|v| v.as_str()))
            .ok_or("Missing id/name field")?;
        if table == "activity" {
            // activity table has a NOT NULL created_at column that must be populated.
            let created_at = obj
                .get("createdAt").and_then(|v| v.as_str())
                .or_else(|| obj.get("created_at").and_then(|v| v.as_str()))
                .unwrap_or("");
            db.execute(
                "INSERT OR REPLACE INTO activity (id, value, created_at) VALUES (?1, ?2, ?3)",
                rusqlite::params![id, row_json, created_at],
            ).map_err(|e| e.to_string())?;
        } else {
            db.execute(
                &format!("INSERT OR REPLACE INTO {table} (id, value) VALUES (?1, ?2)"),
                rusqlite::params![id, row_json],
            ).map_err(|e| e.to_string())?;
        }
        count += 1;
    }
    Ok(count)
}

// ---- Snapshot commands ----

#[derive(Debug, Serialize, Clone)]
struct SnapshotRecord {
    id: String,
    kind: String,
    label: String,
    note: String,
    #[serde(rename = "createdAt")]
    created_at: String,
    size: usize,
}

/// Insert a snapshot row. Replaces any existing row with the same id.
#[tauri::command]
fn snapshot_create(
    state: tauri::State<AppState>,
    id: String,
    kind: String,
    label: String,
    note: String,
    #[allow(non_snake_case)] createdAt: String,
    payload: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO snapshots (id, kind, label, note, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, kind, label, note, createdAt, payload],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn snapshot_update_meta(
    state: tauri::State<AppState>,
    id: String,
    label: String,
    note: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE snapshots SET label = ?2, note = ?3 WHERE id = ?1",
        rusqlite::params![id, label, note],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// List snapshots ordered by created_at desc, returning lightweight metadata only.
#[tauri::command]
fn snapshot_list(state: tauri::State<AppState>) -> Result<Vec<SnapshotRecord>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, kind, label, note, created_at, LENGTH(payload) FROM snapshots ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(SnapshotRecord {
                id: row.get(0)?,
                kind: row.get(1)?,
                label: row.get(2)?,
                note: row.get(3)?,
                created_at: row.get(4)?,
                size: row.get::<_, i64>(5)? as usize,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

/// Return the snapshot payload (full AppData JSON) for a given id, or None if missing.
#[tauri::command]
fn snapshot_get(state: tauri::State<AppState>, id: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT payload FROM snapshots WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(rusqlite::params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let payload: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(payload))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn snapshot_delete(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM snapshots WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Keep the newest `keep` snapshots of the given kind; delete the rest. Returns deleted count.
#[tauri::command]
fn snapshot_prune(state: tauri::State<AppState>, kind: String, keep: i64) -> Result<u64, String> {
    if keep < 0 { return Err("keep must be >= 0".into()); }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // SQLite trick: delete rows whose id is NOT in the newest `keep` for this kind.
    let affected = db
        .execute(
            "DELETE FROM snapshots WHERE kind = ?1 AND id NOT IN (SELECT id FROM snapshots WHERE kind = ?1 ORDER BY created_at DESC LIMIT ?2)",
            rusqlite::params![kind, keep],
        )
        .map_err(|e| e.to_string())?;
    Ok(affected as u64)
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

fn app_icon() -> Image<'static> {
    Image::new(
        app_icon_rgba::APP_ICON_RGBA,
        app_icon_rgba::APP_ICON_WIDTH,
        app_icon_rgba::APP_ICON_HEIGHT,
    )
    .to_owned()
}

fn app_icon_light() -> Image<'static> {
    Image::new(
        app_icon_light_rgba::APP_ICON_LIGHT_RGBA,
        app_icon_light_rgba::APP_ICON_LIGHT_WIDTH,
        app_icon_light_rgba::APP_ICON_LIGHT_HEIGHT,
    )
    .to_owned()
}

fn image_from_data_url(data_url: &str) -> Result<Image<'static>, String> {
    let comma = data_url.find(',').ok_or_else(|| "Invalid data URL: missing comma".to_string())?;
    let (header, payload) = data_url.split_at(comma);
    let payload = &payload[1..];
    if header.contains("svg") {
        return Err("SVG icons are not supported for taskbar/tray; use PNG/JPEG/WEBP".into());
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload.as_bytes())
        .map_err(|e| format!("Base64 decode failed: {e}"))?;
    let img = image::load_from_memory(&bytes)
        .map_err(|e| format!("Image decode failed: {e}"))?;
    let resized = img.resize_exact(32, 32, image::imageops::FilterType::Lanczos3).to_rgba8();
    let (w, h) = resized.dimensions();
    let raw: Vec<u8> = resized.into_raw();
    let leaked: &'static [u8] = Box::leak(raw.into_boxed_slice());
    Ok(Image::new(leaked, w, h).to_owned())
}

fn app_icon_for_style(style: &str, custom_data_url: Option<&str>) -> Result<Image<'static>, String> {
    match style {
        "light" => Ok(app_icon_light()),
        "custom" => {
            let url = custom_data_url.ok_or_else(|| "Custom icon requires a data URL".to_string())?;
            image_from_data_url(url)
        }
        _ => Ok(app_icon()),
    }
}

fn apply_app_icon(app: &AppHandle, icon: Image<'static>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_icon(icon.clone()).map_err(|e| format!("set window icon failed: {e}"))?;
    }
    if let Some(tray) = app.tray_by_id("opendock-tray") {
        tray.set_icon(Some(icon)).map_err(|e| format!("set tray icon failed: {e}"))?;
    }
    Ok(())
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

    builder = builder.icon(app_icon());

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
fn set_app_icon_style(app: AppHandle, style: String, custom_data_url: Option<String>) -> OpenActionResult {
    match app_icon_for_style(&style, custom_data_url.as_deref()).and_then(|icon| apply_app_icon(&app, icon)) {
        Ok(()) => success("App icon updated"),
        Err(err) => failure(err),
    }
}

#[tauri::command]
fn set_global_hotkey(app: AppHandle, key: String) -> OpenActionResult {
    match apply_global_hotkey(&app, &key) {
        Ok(applied) => success(format!("已绑定全局快捷键: {applied}")),
        Err(err) => failure(err),
    }
}

// ---- Tauri commands: marketplace ----

#[tauri::command]
async fn marketplace_fetch_text(url: String) -> Result<String, String> {
    let mut client_builder = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15));
    // Try local proxy: HTTPS_PROXY / HTTP_PROXY env, or default 127.0.0.1:7890 / 7779
    let proxy_url = std::env::var("HTTPS_PROXY")
        .or_else(|_| std::env::var("HTTP_PROXY"))
        .ok()
        .or_else(|| {
            let check = ["http://127.0.0.1:7890", "http://127.0.0.1:7779"];
            check.iter().find(|addr| {
                std::net::TcpStream::connect_timeout(
                    &addr[7..].parse::<std::net::SocketAddr>().unwrap_or("127.0.0.1:1".parse().unwrap()),
                    std::time::Duration::from_millis(300),
                ).is_ok()
            }).map(|s| s.to_string())
        });
    if let Some(proxy_str) = proxy_url {
        if let Ok(proxy) = reqwest::Proxy::all(&proxy_str) {
            client_builder = client_builder.proxy(proxy);
        }
    }
    let client = client_builder.build().map_err(|e| format!("HTTP client error: {e}"))?;
    let resp = client.get(&url).send().await.map_err(|e| format!("Fetch failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let body = resp.text().await.map_err(|e| format!("Read body failed: {e}"))?;
    Ok(body)
}

#[derive(Debug, Serialize, Deserialize)]
struct PluginFileEntry {
    path: String,
    content: String,
}

#[tauri::command]
async fn marketplace_install_plugin_files(plugin_id: String, version: String, files: Vec<PluginFileEntry>) -> Result<String, String> {
    let plugin_dir = get_plugin_install_dir(&plugin_id, &version);
    std::fs::create_dir_all(&plugin_dir).map_err(|e| format!("Create plugin dir failed: {e}"))?;

    for file in &files {
        let file_path = std::path::PathBuf::from(&plugin_dir).join(&file.path);
        if let Some(parent) = file_path.parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Create dir failed: {e}"))?;
            }
        }
        let mut f = std::fs::File::create(&file_path).map_err(|e| format!("Create file failed: {e}"))?;
        f.write_all(file.content.as_bytes()).map_err(|e| format!("Write file failed: {e}"))?;
    }

    Ok(plugin_dir)
}

#[tauri::command]
fn marketplace_get_installed_dir(plugin_id: String, version: String) -> String {
    get_plugin_install_dir(&plugin_id, &version)
}

#[tauri::command]
fn marketplace_delete_plugin_dir(plugin_id: String) -> Result<String, String> {
    let base = get_plugin_install_base();
    let dir = std::path::PathBuf::from(&base).join(&plugin_id);
    if dir.exists() {
        std::fs::remove_dir_all(&dir).map_err(|e| format!("Remove dir failed: {e}"))?;
    }
    Ok(format!("Removed {}", dir.display()))
}

fn get_plugin_install_base() -> String {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    data_dir.join("OpenDock").join("plugins").to_string_lossy().to_string()
}

fn get_plugin_install_dir(plugin_id: &str, version: &str) -> String {
    let base = get_plugin_install_base();
    std::path::PathBuf::from(&base).join(plugin_id).join(version).to_string_lossy().to_string()
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
                let _ = window.set_icon(app_icon());
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
            open_path, open_url, open_file, open_application, open_url_in_browser, prestart_browser, scan_open_tools, run_command,
            test_webdav_connection, sync_webdav_now, webdav_set_credential, webdav_get_credential, set_global_hotkey, set_app_icon_style, write_text_file,
            get_app_version, check_app_update, download_and_install_update, restart_app,
            db_init, db_execute, db_execute_params, db_get_value, db_set_value, db_list_table, db_bulk_insert,
            snapshot_create, snapshot_update_meta, snapshot_list, snapshot_get, snapshot_delete, snapshot_prune,
            marketplace_fetch_text, marketplace_install_plugin_files, marketplace_get_installed_dir, marketplace_delete_plugin_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenDock");
}

