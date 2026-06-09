## ADDED Requirements

### Requirement: Workspace data model
The system SHALL model workspaces as top-level containers for scenes, collections, tools, settings, plugins, and sync configuration.

#### Scenario: Active workspace exists
- **WHEN** the application loads persisted data
- **THEN** exactly one workspace is selected as the active workspace

### Requirement: Scene collection item model
The system SHALL model scenes, collections, and collection items with stable IDs, names, types, timestamps, ordering fields, and optional plugin metadata.

#### Scenario: Collection belongs to scene
- **WHEN** a collection is associated with a scene
- **THEN** the collection can be listed under that scene and opened from scene context

### Requirement: Tool configuration model
The system SHALL model opening tools with name, type, executable path, argument template, and default-tool flag.

#### Scenario: Default browser selected
- **WHEN** a web collection is created
- **THEN** the default browser tool is selected as the collection's default opening tool

### Requirement: Local persistence
The system SHALL persist OpenDock workspace data and settings to local application storage with a schema version.

#### Scenario: Restart restores data
- **WHEN** the user creates a collection and restarts the app
- **THEN** the created collection is restored from local storage

### Requirement: Export-safe data boundary
The system SHALL keep secret credential values separate from ordinary exportable workspace data.

#### Scenario: Export workspace data
- **WHEN** the user exports workspace data
- **THEN** WebDAV passwords or tokens are not included as plain text in the exported file
