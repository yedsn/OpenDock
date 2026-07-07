## Context

OpenDock currently consists of a static desktop-style prototype (`index.html`, `styles.css`, `app.js`) and a detailed Chinese requirements document. The prototype already establishes the desired interaction model: Obsidian-like left sidebar, workspaces at the lower-left, settings at the lower-left, quick views, scene list, collection/resource workbench, and settings pages including plugin management and WebDAV Sync plugin configuration.

The requested implementation is a real desktop application based on Tauri and Vue. The app must be able to store local workspace data, open local paths and external tools, manage settings, and provide a plugin-management prototype without requiring a full plugin SDK in the first implementation.

## Goals / Non-Goals

**Goals:**

- Build a Tauri + Vue application that implements the current OpenDock requirements and prototype interactions.
- Use Vue components and stores to model workspaces, scenes, collections, collection items, tools, settings, plugins, and sync configuration.
- Persist OpenDock data locally so the app is usable after restart.
- Use Tauri commands for system-level open actions: folders, URLs, files, commands, applications, and collection/scene batch open flows.
- Implement the settings page with dynamic plugin settings menu injection, including WebDAV Sync as an installed configurable plugin.
- Keep a restrained desktop efficiency-tool visual style close to the current prototype.
- Preserve future extension points for plugin manifests, sync plugins, and AI/MCP context export.

**Non-Goals:**

- Do not implement a real online plugin marketplace in this change.
- Do not implement a full executable third-party plugin SDK in this change.
- Do not implement real WebDAV sync network I/O unless explicitly approved during implementation; provide configuration and command boundaries first.
- Do not implement a real MCP server in this change.
- Do not implement multi-user cloud collaboration or OpenDock-hosted cloud sync.

## Decisions

### Use Tauri + Vue 3 + TypeScript

The application will use Tauri for the desktop shell and system integration, and Vue 3 with TypeScript for UI state and components. Vue is a good fit because the current prototype is mostly componentizable stateful UI: sidebar, scenes, collections, resources, settings, modals, and plugin cards.

Alternative considered: keep the static prototype and add minimal Tauri wrappers. This would move faster initially but would make state management, typed data models, persistence, and future plugin settings harder to maintain.

### Use Pinia-style stores or local composable stores for state

The implementation should use typed stores for:

- workspace store
- scene/collection/resource store
- settings/tool store
- plugin store
- activity/log store

If dependencies are kept minimal, these can be Vue composables first; if Pinia is acceptable during scaffolding, Pinia is preferable for clarity and testability.

Alternative considered: one large app-level reactive object. This mirrors the prototype but would make future persistence and plugin interactions harder to isolate.

### Persist a single workspace data document locally

Initial persistence should store OpenDock data as a local JSON document under the Tauri app data directory. The document should include workspaces, active workspace ID, scenes, collections, items, tools, settings, plugins, WebDAV config metadata, and recent activity as appropriate.

This keeps the first implementation simple and transparent. A future migration can split data into multiple files or add encrypted secret storage.

Alternative considered: SQLite. SQLite is more robust for querying and migrations, but the current data model is small and document-shaped. JSON persistence is enough for the first real desktop implementation.

### Keep secrets out of ordinary exports

WebDAV passwords/tokens and future plugin secrets must be modeled separately from normal workspace data. The first implementation may simulate secret storage, but the code should isolate secret fields so they can move to Tauri secure storage or OS keychain later.

Alternative considered: store everything in one JSON file. This is simpler but conflicts with the documented security boundary for WebDAV Sync.

### Route all system opening through Tauri commands

The Vue UI should not attempt to directly execute system actions. It should call Tauri commands such as:

- `open_path(path, toolId?)`
- `open_url(url, browserToolId?)`
- `run_command(command, workingDirectory?, terminalToolId?)`
- `open_file(path, toolId?)`
- `open_application(path, args?)`
- `open_collection(collectionId)`
- `open_scene(sceneId)`

Rust-side commands will validate input type, resolve the configured tool, and apply confirmation rules before launching anything.

Alternative considered: use browser APIs and links for URLs only. That would not cover local paths, commands, terminals, or desktop app behavior.

### Implement plugin system as manifest-driven UI prototype first

The first implementation should support plugin records with manifest-like fields: id, name, version, category, capabilities, permissions, enabled, installed, configurable, settings schema reference. Plugins can inject settings menu entries if they are installed and configurable.

This is intentionally not a full runtime plugin loader yet. It establishes the product model and UI contract while avoiding unsafe dynamic code execution.

Alternative considered: load plugin JavaScript dynamically. This is higher risk and requires sandboxing, permission enforcement, packaging, versioning, and error isolation that are not needed for the first desktop implementation.

### WebDAV Sync is a configurable plugin with command boundaries

WebDAV Sync should appear as an installed configurable plugin. Its settings page includes server URL, username, credential placeholder, remote path, auto-sync, interval, sync scope, conflict policy, status, last sync time, test connection, and sync now.

For the first implementation, `test connection` and `sync now` can call mocked Tauri commands or no-op commands that update status. Real WebDAV network sync can be implemented behind the same command interface later.

Alternative considered: make WebDAV Sync part of data/backup settings. Keeping it as a plugin better matches the desired Obsidian-like model and leaves room for alternative sync plugins.

### Keep the static prototype as reference during implementation

The existing static files should remain available until the Tauri/Vue implementation is verified. They can serve as visual and interaction references and can be removed or archived in a later cleanup change.

## Risks / Trade-offs

- [Risk] Tauri shell command execution can create security issues if commands are launched without validation. → Mitigation: centralize all launch behavior in Rust commands, require confirmation for command execution and batch open flows, and never execute plugin-provided commands without user confirmation.
- [Risk] JSON persistence can become hard to migrate as the model grows. → Mitigation: include a `schemaVersion` field and write migration functions from the start.
- [Risk] WebDAV credentials may be accidentally stored or exported. → Mitigation: represent credentials as secret references where possible and exclude secrets from normal export output.
- [Risk] Plugin UI may imply a full plugin marketplace exists. → Mitigation: label plugin library as built-in/recommended in the first implementation and keep install actions local/mock until a real marketplace is implemented.
- [Risk] Batch opening many resources can overwhelm the desktop. → Mitigation: require confirmation and show a preview/count before opening a full collection or scene.
- [Risk] Rebuilding the prototype in Vue can drift visually. → Mitigation: port the existing CSS tokens/layout patterns first, then refactor styles into components after behavior is stable.

## Migration Plan

1. Scaffold a Tauri + Vue + TypeScript app in the repository.
2. Port the prototype layout into Vue components using the existing UI as visual reference.
3. Define typed models and seed data matching the current prototype.
4. Add local persistence with schema versioning.
5. Add Tauri commands for open actions, initially with conservative confirmation and logging.
6. Implement settings and plugin configuration flows.
7. Verify with dev server, Tauri dev mode, and targeted UI checks.
8. Keep static prototype files until the user approves cleanup.

Rollback strategy: the existing static prototype remains intact, so the Tauri/Vue implementation can be abandoned or reworked without losing the current prototype.

## Open Questions

- Should the initial Tauri implementation use Pinia, or keep stores as Vue composables to minimize dependencies?
- Should secrets use an OS keychain plugin in the first implementation, or be represented as placeholders until WebDAV real sync is implemented?
- Should real WebDAV sync be included in the first implementation pass, or should this change stop at plugin configuration and mocked sync commands?
- Should command execution open one terminal per command or group commands by terminal/workspace?
