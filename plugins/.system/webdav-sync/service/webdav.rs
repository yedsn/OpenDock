use std::process::Command;
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct WebDavResult { pub ok: bool, pub message: String }

impl WebDavResult {
    pub fn success(msg: impl Into<String>) -> Self { WebDavResult { ok: true, message: msg.into() } }
    pub fn failure(msg: impl Into<String>) -> Self { WebDavResult { ok: false, message: msg.into() } }
}

/// Build curl args with auth and common options.
fn curl_base_args(username: &str, password: &str, extra_headers: &[&str]) -> Vec<String> {
    let mut args = vec![
        "--silent".to_string(),
        "--show-error".to_string(),
        "--connect-timeout".to_string(), "15".to_string(),
        "--max-time".to_string(), "30".to_string(),
    ];
    if !username.is_empty() {
        args.push("--user".to_string());
        args.push(format!("{username}:{password}"));
    }
    for header in extra_headers {
        args.push("--header".to_string());
        args.push(header.to_string());
    }
    args
}

/// Run curl and capture stdout + exit status.
fn run_curl(args: &[String]) -> Result<(bool, String, String), String> {
    let output = Command::new("curl")
        .args(args)
        .output()
        .map_err(|e| format!("curl startup failed: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok((output.status.success(), stdout, stderr))
}

/// Format the full URL from server_url + remote_path.
pub fn format_url(server_url: &str, remote_path: &str) -> String {
    let base = server_url.trim_end_matches('/');
    let path = if remote_path.starts_with('/') { remote_path.to_string() } else { format!("/{remote_path}") };
    format!("{base}{path}")
}

/// Test WebDAV connection by doing a PROPFIND (depth 0) on the remote path.
pub fn test_connection(server_url: &str, username: &str, password: &str, remote_path: &str) -> WebDavResult {
    let url = format_url(server_url, remote_path);
    let mut args = curl_base_args(username, password, &[
        "Depth: 0",
        "Content-Type: application/xml; charset=utf-8",
    ]);
    args.push("--request".to_string());
    args.push("PROPFIND".to_string());
    args.push("--data".to_string());
    args.push(r#"<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>"#.to_string());
    args.push(url);

    match run_curl(&args) {
        Ok((ok, _stdout, stderr)) => {
            if ok {
                WebDavResult::success("OK")
            } else {
                WebDavResult::failure(stderr.trim().chars().take(200).collect::<String>())
            }
        }
        Err(e) => WebDavResult::failure(e),
    }
}

/// Upload data to a WebDAV path (PUT).
pub fn upload(server_url: &str, username: &str, password: &str, remote_path: &str, data: &str) -> WebDavResult {
    // Ensure the remote directory exists first
    if let Some(parent) = parent_path(remote_path) {
        let _ = ensure_remote_dir(server_url, username, password, &parent);
    }

    let url = format_url(server_url, remote_path);
    let mut args = curl_base_args(username, password, &[
        "Content-Type: application/json; charset=utf-8",
    ]);
    args.push("--request".to_string());
    args.push("PUT".to_string());
    args.push("--data-binary".to_string());
    args.push(data.to_string());
    args.push(url);

    match run_curl(&args) {
        Ok((ok, _stdout, stderr)) => {
            if ok {
                WebDavResult::success("OK")
            } else {
                WebDavResult::failure(stderr.trim().chars().take(200).collect::<String>())
            }
        }
        Err(e) => WebDavResult::failure(e),
    }
}

/// Download data from a WebDAV path (GET).
pub fn download(server_url: &str, username: &str, password: &str, remote_path: &str) -> Result<String, String> {
    let url = format_url(server_url, remote_path);
    let args = curl_base_args(username, password, &[]);
    let mut all_args = args;
    all_args.push("--request".to_string());
    all_args.push("GET".to_string());
    all_args.push(url);

    let (ok, stdout, stderr) = run_curl(&all_args)?;
    if ok {
        Ok(stdout)
    } else {
        Err(stderr.trim().chars().take(200).collect::<String>())
    }
}

/// Check if a remote file exists (HEAD).
pub fn remote_exists(server_url: &str, username: &str, password: &str, remote_path: &str) -> Result<bool, String> {
    let url = format_url(server_url, remote_path);
    let args = curl_base_args(username, password, &[]);
    let mut all_args = args;
    all_args.push("--head".to_string());
    all_args.push(url);

    let (ok, stdout, _) = run_curl(&all_args)?;
    Ok(ok && (stdout.contains("200") || stdout.contains("204") || stdout.contains("207")))
}

/// Create a collection (directory) on the remote WebDAV server (MKCOL).
fn ensure_remote_dir(server_url: &str, username: &str, password: &str, dir_path: &str) -> WebDavResult {
    // Recursively ensure parent directories first
    if let Some(parent) = parent_path(dir_path) {
        let _ = ensure_remote_dir(server_url, username, password, &parent);
    }

    let url = format_url(server_url, dir_path);
    let args = curl_base_args(username, password, &[]);
    let mut all_args = args;
    all_args.push("--request".to_string());
    all_args.push("MKCOL".to_string());
    all_args.push(url);

    match run_curl(&all_args) {
        Ok((ok, stdout, stderr)) => {
            // 201 = created, 405 = already exists
            let output = stdout + &stderr;
            if ok || output.contains("405") {
                WebDavResult::success("OK")
            } else {
                WebDavResult::failure(output.trim().chars().take(200).collect::<String>())
            }
        }
        Err(e) => WebDavResult::failure(e),
    }
}

/// Get the parent directory path (trailing slash).
fn parent_path(remote_path: &str) -> Option<String> {
    let trimmed = remote_path.trim_end_matches('/');
    let idx = trimmed.rfind('/')?;
    let parent = &trimmed[..idx + 1];
    if parent.is_empty() || parent == "/" { return None; }
    Some(parent.to_string())
}