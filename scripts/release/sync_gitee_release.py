#!/usr/bin/env python3

import argparse
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from shutil import copyfile
from typing import Optional


DEFAULT_GITHUB_OWNER = "yedsn"
DEFAULT_GITHUB_REPO = "OpenDock"
DEFAULT_GITEE_OWNER = "hongxiaojian"
DEFAULT_GITEE_REPO = "open-dock"
LATEST_RELEASE_TAG = "latest"
HTTP_TIMEOUT_SECS = 60
DOWNLOAD_TIMEOUT_SECS = 600
UPLOAD_CONNECT_TIMEOUT_SECS = 30
UPLOAD_MAX_TIME_SECS = 1800


def log(message: str) -> None:
    print(message, flush=True)


def fail(message: str) -> None:
    print(f"[sync-gitee] Error: {message}", file=sys.stderr, flush=True)
    raise SystemExit(1)


def request_json(method: str, url: str, *, data=None, headers=None):
    headers = headers or {}
    request_data = None
    if data is not None:
        request_data = urllib.parse.urlencode(data).encode("utf-8")
        headers = {"Content-Type": "application/x-www-form-urlencoded", **headers}

    req = urllib.request.Request(url, data=request_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_SECS) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "ignore")
        fail(f"{method} {url} failed with HTTP {exc.code}: {body}")
    except urllib.error.URLError as exc:
        fail(f"{method} {url} failed: {exc}")


def try_request_json(method: str, url: str, *, data=None):
    try:
        return request_json(method, url, data=data)
    except SystemExit:
        return None


def request_no_content(method: str, url: str) -> None:
    req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_SECS):
            return
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "ignore")
        fail(f"{method} {url} failed with HTTP {exc.code}: {body}")
    except urllib.error.URLError as exc:
        fail(f"{method} {url} failed: {exc}")


def download_file(url: str, target_path: Path, proxy: Optional[str]) -> None:
    handlers = []
    if proxy:
        handlers.append(urllib.request.ProxyHandler({"http": proxy, "https": proxy}))
    opener = urllib.request.build_opener(*handlers)
    req = urllib.request.Request(url, headers={"User-Agent": "opendock-release-sync"})
    try:
        with opener.open(req, timeout=DOWNLOAD_TIMEOUT_SECS) as response:
            with target_path.open("wb") as fh:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    fh.write(chunk)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "ignore")
        fail(f"Download failed for {url} with HTTP {exc.code}: {body}")
    except urllib.error.URLError as exc:
        fail(f"Download failed for {url}: {exc}")


def upload_attachment(file_path: Path, upload_url: str) -> None:
    subprocess.run(
        [
            "curl",
            "--silent",
            "--show-error",
            "--location",
            "--connect-timeout",
            str(UPLOAD_CONNECT_TIMEOUT_SECS),
            "--max-time",
            str(UPLOAD_MAX_TIME_SECS),
            "--retry",
            "2",
            "--request",
            "POST",
            "-#",
            "--form",
            f"file=@{file_path}",
            upload_url,
        ],
        check=True,
    )


def rewrite_latest_json_urls(source_path: Path, target_path: Path, *, gitee_owner: str, gitee_repo: str) -> None:
    payload = json.loads(source_path.read_text(encoding="utf-8"))
    platforms = payload.get("platforms", {})
    for item in platforms.values():
        url = item.get("url")
        if not url:
            continue
        filename = Path(urllib.parse.urlparse(url).path).name
        item["url"] = f"https://gitee.com/{gitee_owner}/{gitee_repo}/releases/download/{LATEST_RELEASE_TAG}/{filename}"
    target_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def strip_version_from_filename(name: str) -> str:
    import re

    match = re.match(r"^(.+?)-v?\d+\.\d+\.\d+(.*)$", name)
    if match:
        return match.group(1) + match.group(2)
    return name


def ensure_release(*, token: str, owner: str, repo: str, releases: list, tag_name: str, body: str, target_commitish: str):
    existing = next((item for item in releases if item.get("tag_name") == tag_name), None)
    release_url = f"https://gitee.com/api/v5/repos/{owner}/{repo}/releases"
    data = {
        "access_token": token,
        "tag_name": tag_name,
        "name": tag_name,
        "body": body,
        "target_commitish": target_commitish,
        "prerelease": "false",
    }
    if existing:
        release_id = existing.get("id")
        log(f"[sync-gitee] Updating Gitee release {tag_name}")
        return try_request_json("PATCH", f"{release_url}/{release_id}", data=data) or existing
    log(f"[sync-gitee] Creating Gitee release {tag_name}")
    return request_json("POST", release_url, data=data)


def sync_assets(*, token: str, owner: str, repo: str, release_id: int, files: list[Path]) -> None:
    attachments_url = f"https://gitee.com/api/v5/repos/{owner}/{repo}/releases/{release_id}/attach_files?access_token={urllib.parse.quote(token)}&per_page=100"
    existing = request_json("GET", attachments_url)
    for attachment in existing:
        attachment_id = attachment.get("id")
        name = attachment.get("name")
        if attachment_id:
            delete_url = f"https://gitee.com/api/v5/repos/{owner}/{repo}/releases/{release_id}/attach_files/{attachment_id}?access_token={urllib.parse.quote(token)}"
            log(f"[sync-gitee] Deleting existing asset {name}")
            request_no_content("DELETE", delete_url)

    for file_path in files:
        upload_url = f"https://gitee.com/api/v5/repos/{owner}/{repo}/releases/{release_id}/attach_files?access_token={urllib.parse.quote(token)}"
        log(f"[sync-gitee] Uploading {file_path.name}")
        upload_attachment(file_path, upload_url)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sync OpenDock GitHub release assets to Gitee latest release.")
    parser.add_argument("--tag", help="Git tag to sync, for example v0.1.1. Defaults to latest GitHub release.")
    parser.add_argument("--github-owner", default=DEFAULT_GITHUB_OWNER)
    parser.add_argument("--github-repo", default=DEFAULT_GITHUB_REPO)
    parser.add_argument("--gitee-owner", default=DEFAULT_GITEE_OWNER)
    parser.add_argument("--gitee-repo", default=DEFAULT_GITEE_REPO)
    parser.add_argument("--target-commitish", default="main")
    parser.add_argument("--proxy", help="Proxy server for downloading from GitHub, for example 127.0.0.1:7890.")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    token = os.environ.get("GITEE_ACCESS_TOKEN", "").strip()
    if not token:
        fail("Missing GITEE_ACCESS_TOKEN environment variable")

    if args.tag:
        github_url = f"https://api.github.com/repos/{args.github_owner}/{args.github_repo}/releases/tags/{args.tag}"
    else:
        github_url = f"https://api.github.com/repos/{args.github_owner}/{args.github_repo}/releases/latest"
    github_release = request_json("GET", github_url, headers={"User-Agent": "opendock-release-sync"})
    tag_name = github_release.get("tag_name")
    assets = github_release.get("assets") or []
    if not tag_name or not assets:
        fail("GitHub release has no tag or assets")

    releases_url = f"https://gitee.com/api/v5/repos/{args.gitee_owner}/{args.gitee_repo}/releases?access_token={urllib.parse.quote(token)}&per_page=100"
    gitee_releases = request_json("GET", releases_url)

    with tempfile.TemporaryDirectory(prefix="opendock-gitee-sync-") as tmp_dir:
        tmp_root = Path(tmp_dir)
        files: list[Path] = []
        for asset in assets:
            name = asset.get("name")
            download_url = asset.get("browser_download_url")
            if not name or not download_url:
                continue
            source_path = tmp_root / name
            log(f"[sync-gitee] Downloading {name}")
            download_file(download_url, source_path, args.proxy)
            gitee_name = strip_version_from_filename(name)
            gitee_path = tmp_root / gitee_name
            if gitee_name != name:
                copyfile(source_path, gitee_path)
            else:
                gitee_path = source_path
            if gitee_path.name == "latest.json":
                rewrite_latest_json_urls(gitee_path, gitee_path, gitee_owner=args.gitee_owner, gitee_repo=args.gitee_repo)
            files.append(gitee_path)

        release = ensure_release(
            token=token,
            owner=args.gitee_owner,
            repo=args.gitee_repo,
            releases=gitee_releases,
            tag_name=LATEST_RELEASE_TAG,
            body=f"Auto-maintained latest release. Source release: {tag_name}.",
            target_commitish=args.target_commitish,
        )
        release_id = release.get("id")
        if not release_id:
            fail("Gitee release response does not include id")
        sync_assets(token=token, owner=args.gitee_owner, repo=args.gitee_repo, release_id=release_id, files=files)

    log(f"[sync-gitee] Done: https://gitee.com/{args.gitee_owner}/{args.gitee_repo}/releases/download/{LATEST_RELEASE_TAG}/latest.json")


if __name__ == "__main__":
    main()
