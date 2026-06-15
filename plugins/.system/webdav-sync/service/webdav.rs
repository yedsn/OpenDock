use reqwest::{Client, Method, RequestBuilder};
use serde::Serialize;
use std::time::Duration;

#[derive(Debug, Serialize, Clone)]
pub struct WebDavResult { pub ok: bool, pub message: String }

impl WebDavResult {
    pub fn success(msg: impl Into<String>) -> Self { WebDavResult { ok: true, message: msg.into() } }
    pub fn failure(msg: impl Into<String>) -> Self { WebDavResult { ok: false, message: msg.into() } }
}

fn build_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(90))
        .connect_timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::limited(10))
        .http1_only()
        .build()
        .map_err(|e| format!("HTTP client build failed: {e}"))
}

fn apply_auth(request: RequestBuilder, username: &str, password: &str) -> RequestBuilder {
    if username.is_empty() && password.is_empty() {
        request
    } else {
        request.basic_auth(username, Some(password))
    }
}

fn format_url(server_url: &str, remote_path: &str) -> String {
    let base = server_url.trim_end_matches('/');
    let path = if remote_path.starts_with('/') { remote_path.to_string() } else { format!("/{remote_path}") };
    format!("{base}{path}")
}

fn http_error_message(status: reqwest::StatusCode, body: &str) -> String {
    let snippet = body.chars().take(300).collect::<String>();
    if snippet.is_empty() {
        format!("WebDAV HTTP {}", status.as_u16())
    } else {
        format!("WebDAV HTTP {}: {}", status.as_u16(), snippet)
    }
}

fn req_error_message(err: &reqwest::Error) -> String {
    let msg = err.to_string();
    if msg.contains("timed out") || msg.contains("operation timed out") {
        format!("WebDAV 服务请求超时。请检查地址和远程目录是否正确、网络/代理是否可访问。原始错误: {msg}")
    } else if msg.contains("connect") {
        format!("WebDAV 连接失败。请检查地址是否正确、网络是否可达。原始错误: {msg}")
    } else {
        msg
    }
}

/// Test WebDAV connection by doing a PROPFIND (depth 0) on the remote path.
pub async fn test_connection(server_url: &str, username: &str, password: &str, remote_path: &str) -> WebDavResult {
    let client = match build_client() {
        Ok(c) => c,
        Err(e) => return WebDavResult::failure(e),
    };
    let url = format_url(server_url, remote_path);
    let body = r#"<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>"#;
    let request = client
        .request(Method::from_bytes(b"PROPFIND").unwrap(), &url)
        .header("Depth", "0")
        .header("Content-Type", "application/xml; charset=utf-8")
        .body(body.to_string());
    let response = match apply_auth(request, username, password).send().await {
        Ok(r) => r,
        Err(e) => return WebDavResult::failure(req_error_message(&e)),
    };
    let status = response.status();
    if status.is_success() || status.as_u16() == 207 {
        WebDavResult::success("OK")
    } else {
        let body_text = response.text().await.unwrap_or_default();
        WebDavResult::failure(http_error_message(status, &body_text))
    }
}

/// Upload data to a WebDAV path (PUT).
pub async fn upload(server_url: &str, username: &str, password: &str, remote_path: &str, data: &str) -> WebDavResult {
    // Ensure the remote directory exists first
    if let Some(parent) = parent_path(remote_path) {
        let _ = ensure_remote_dir(server_url, username, password, &parent).await;
    }

    let client = match build_client() {
        Ok(c) => c,
        Err(e) => return WebDavResult::failure(e),
    };
    let url = format_url(server_url, remote_path);
    let request = client
        .put(&url)
        .header("Content-Type", "application/json; charset=utf-8")
        .body(data.to_string());
    let response = match apply_auth(request, username, password).send().await {
        Ok(r) => r,
        Err(e) => return WebDavResult::failure(req_error_message(&e)),
    };
    let status = response.status();
    if status.is_success() || status.as_u16() == 201 {
        WebDavResult::success("OK")
    } else {
        let body_text = response.text().await.unwrap_or_default();
        WebDavResult::failure(http_error_message(status, &body_text))
    }
}

/// Download data from a WebDAV path (GET).
pub async fn download(server_url: &str, username: &str, password: &str, remote_path: &str) -> Result<String, String> {
    let client = build_client()?;
    let url = format_url(server_url, remote_path);
    let request = client.get(&url);
    let response = apply_auth(request, username, password).send().await
        .map_err(|e| req_error_message(&e))?;
    let status = response.status();
    if status.is_success() {
        response.text().await.map_err(|e| format!("读取下载内容失败: {e}"))
    } else {
        let body_text = response.text().await.unwrap_or_default();
        Err(http_error_message(status, &body_text))
    }
}

/// Check if a remote file exists (HEAD).
pub async fn remote_exists(server_url: &str, username: &str, password: &str, remote_path: &str) -> Result<bool, String> {
    let client = build_client()?;
    let url = format_url(server_url, remote_path);
    let request = client.head(&url);
    let response = apply_auth(request, username, password).send().await
        .map_err(|e| req_error_message(&e))?;
    let status = response.status();
    Ok(status.is_success() || status.as_u16() == 207)
}

/// Create a collection (directory) on the remote WebDAV server (MKCOL).
pub async fn ensure_remote_dir(server_url: &str, username: &str, password: &str, dir_path: &str) -> WebDavResult {
    // Iteratively MKCOL each ancestor directory, top-down.
    let trimmed = dir_path.trim_matches('/');
    if trimmed.is_empty() {
        return WebDavResult::success("OK");
    }
    let segments: Vec<&str> = trimmed.split('/').filter(|s| !s.is_empty()).collect();
    if segments.is_empty() {
        return WebDavResult::success("OK");
    }
    let client = match build_client() {
        Ok(c) => c,
        Err(e) => return WebDavResult::failure(e),
    };
    let mut current = String::new();
    let mut last_result = WebDavResult::success("OK");
    for seg in &segments {
        if !current.is_empty() { current.push('/'); }
        current.push_str(seg);
        let url = format_url(server_url, &current);
        let request = client.request(Method::from_bytes(b"MKCOL").unwrap(), &url);
        let response = match apply_auth(request, username, password).send().await {
            Ok(r) => r,
            Err(e) => { last_result = WebDavResult::failure(req_error_message(&e)); continue; }
        };
        let status = response.status();
        // 201 = created, 405 = already exists, 301/2xx generally fine
        if status.is_success() || status.as_u16() == 405 || status.as_u16() == 301 {
            last_result = WebDavResult::success("OK");
        } else {
            let body_text = response.text().await.unwrap_or_default();
            last_result = WebDavResult::failure(http_error_message(status, &body_text));
        }
    }
    last_result
}

/// Get the parent directory path (trailing slash).
fn parent_path(remote_path: &str) -> Option<String> {
    let trimmed = remote_path.trim_end_matches('/');
    let idx = trimmed.rfind('/')?;
    let parent = &trimmed[..idx + 1];
    if parent.is_empty() || parent == "/" { return None; }
    Some(parent.to_string())
}
