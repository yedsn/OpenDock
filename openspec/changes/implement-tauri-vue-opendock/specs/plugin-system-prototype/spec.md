## ADDED Requirements

### Requirement: Plugin records
The system SHALL model plugins with id, name, version, category, capability description, permissions, installed status, enabled status, and configurable flag.

#### Scenario: Display installed plugin
- **WHEN** the plugin management page is opened
- **THEN** each installed plugin displays name, version, category, permissions, capability, and enabled state

### Requirement: Plugin management
The system SHALL allow users to enable and disable installed plugins.

#### Scenario: Disable plugin
- **WHEN** the user disables an installed plugin
- **THEN** the plugin remains installed but its enabled state changes to disabled

### Requirement: Plugin library prototype
The system SHALL provide a built-in plugin library list where users can install recommended plugins.

#### Scenario: Install configurable plugin
- **WHEN** the user installs a configurable plugin from the plugin library
- **THEN** the plugin appears in installed plugins and its settings menu entry appears in the settings navigation

### Requirement: Plugin settings menu injection
The system SHALL show settings menu entries for installed configurable plugins between system settings and About.

#### Scenario: WebDAV Sync settings entry
- **WHEN** WebDAV Sync is installed and configurable
- **THEN** `WebDAV Sync` appears as a settings menu entry before About

### Requirement: Plugin permission display
The system SHALL display declared plugin permissions before the user enables or configures the plugin.

#### Scenario: View permissions
- **WHEN** the user views a plugin card
- **THEN** the plugin card shows permission tags such as `workspace:read` or `network:webdav`
