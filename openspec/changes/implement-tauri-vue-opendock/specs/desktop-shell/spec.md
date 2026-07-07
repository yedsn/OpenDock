## ADDED Requirements

### Requirement: Desktop application shell
The system SHALL provide a Tauri desktop application shell backed by Vue UI.

#### Scenario: Application starts
- **WHEN** the user launches OpenDock
- **THEN** the application displays the OpenDock desktop interface without requiring a browser tab

### Requirement: Obsidian-like left sidebar
The system SHALL render a left sidebar containing the OpenDock title, search box, quick views, scene list, and lower-left workspace/settings controls.

#### Scenario: Sidebar layout is visible
- **WHEN** the main window is displayed
- **THEN** the left sidebar shows OpenDock title, search, quick views, scene list, workspace switcher, and settings button

### Requirement: Main workbench layout
The system SHALL render a main workbench with collection list, selected collection resource details, tabs, console/activity area, and status bar.

#### Scenario: Select collection
- **WHEN** the user selects a collection
- **THEN** the workbench displays that collection's metadata, items, and open actions

### Requirement: Settings route display
The system SHALL replace the workspace workbench with the settings page when the user clicks the settings button.

#### Scenario: Open settings
- **WHEN** the user clicks the lower-left settings button
- **THEN** the settings page is displayed and the settings button appears active
