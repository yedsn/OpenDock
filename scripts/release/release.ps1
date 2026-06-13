param(
  [Parameter(Position = 0)]
  [string]$Version,
  [string]$Branch,
  [switch]$Push
)

$ErrorActionPreference = "Stop"
$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Fail([string]$Message) {
  Write-Error "[release] $Message"
  exit 1
}

function Read-Json([string]$Path) {
  Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Write-Json([string]$Path, $Data) {
  $json = $Data | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
}

function Set-CargoVersion([string]$Path, [string]$TargetVersion) {
  $text = [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
  $updated = [regex]::Replace($text, '(?m)^version\s*=\s*"[^"]+"', "version = `"$TargetVersion`"", 1)
  if ($updated -eq $text) { Fail "Failed to update Cargo.toml version." }
  [System.IO.File]::WriteAllText($Path, $updated, [System.Text.UTF8Encoding]::new($false))
}

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Fail "Missing required command: $Name"
  }
}

Assert-Command git
Assert-Command npm.cmd

function Invoke-NpmNoDebug([string[]]$Arguments) {
  $oldNodeOptions = $env:NODE_OPTIONS
  $oldInspectorOptions = $env:VSCODE_INSPECTOR_OPTIONS
  try {
    Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
    Remove-Item Env:VSCODE_INSPECTOR_OPTIONS -ErrorAction SilentlyContinue
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) { Fail "npm failed with exit code $LASTEXITCODE." }
  } finally {
    if ($null -ne $oldNodeOptions) { $env:NODE_OPTIONS = $oldNodeOptions }
    if ($null -ne $oldInspectorOptions) { $env:VSCODE_INSPECTOR_OPTIONS = $oldInspectorOptions }
  }
}

$package = Read-Json (Join-Path $RootDir "package.json")
$current = [string]$package.version
$suggestedVersion = ""
if ($current -match '^(\d+)\.(\d+)\.(\d+)$') {
  $suggestedVersion = "$($Matches[1]).$($Matches[2]).$([int]$Matches[3] + 1)"
}

if (-not $Version) {
  if ($suggestedVersion) {
    $inputVersion = Read-Host "Release version [default: $suggestedVersion]"
    $Version = if ($inputVersion.Trim()) { $inputVersion.Trim() } else { $suggestedVersion }
  } else {
    Fail "Missing version argument. Current package version is not semantic: $current"
  }
}

if ($Version -notmatch '^\d+\.\d+\.\d+([.-][0-9A-Za-z.-]+)?$') {
  Fail "Version must look like 0.1.2 or 0.1.2-beta.1"
}

if (-not $Branch) {
  $inputBranch = Read-Host "Release branch [default: master]"
  $Branch = if ($inputBranch.Trim()) { $inputBranch.Trim() } else { "master" }
}

$remotes = @(git -C $RootDir remote)
if ($remotes.Count -eq 0) { Fail "No git remotes configured." }

$dirty = (git -C $RootDir status --porcelain)
if ($dirty) {
  Write-Host "[release] Working tree has changes. They will be included in the release commit:"
  git -C $RootDir status --short
}

$localTag = git -C $RootDir tag --list "v$Version"
if ($localTag) { Fail "Git tag v$Version already exists locally." }

foreach ($remote in $remotes) {
  $existing = git -C $RootDir ls-remote --tags $remote "refs/tags/v$Version"
  if ($existing) { Fail "Git tag v$Version already exists on remote '$remote'." }
}

Write-Host "[release] Preparing OpenDock v$Version"
Write-Host "[release] Branch: $Branch"
Write-Host "[release] Remotes: $($remotes -join ', ')"

$packagePath = Join-Path $RootDir "package.json"
$package = Read-Json $packagePath
$package.version = $Version
Write-Json $packagePath $package

$tauriPath = Join-Path $RootDir "src-tauri\tauri.conf.json"
$tauri = Read-Json $tauriPath
$tauri.version = $Version
Write-Json $tauriPath $tauri

Set-CargoVersion (Join-Path $RootDir "src-tauri\Cargo.toml") $Version

Invoke-NpmNoDebug @("--prefix", $RootDir, "install", "--package-lock-only")

git -C $RootDir add -A
if (-not (git -C $RootDir diff --cached --name-only)) {
  Fail "No staged changes found for release commit. Check whether version files were already updated."
}
git -C $RootDir commit -m "release: v$Version"
git -C $RootDir tag -a "v$Version" -m "Release v$Version"

Write-Host "[release] Created commit and tag v$Version"

if ($Push) {
  foreach ($remote in $remotes) {
    Write-Host "[release] Pushing to $remote"
    git -C $RootDir push $remote $Branch
    git -C $RootDir push $remote "v$Version"
  }
} else {
  Write-Host "[release] Push skipped. Next commands:"
  foreach ($remote in $remotes) {
    Write-Host "  git push $remote $Branch"
    Write-Host "  git push $remote v$Version"
  }
}
