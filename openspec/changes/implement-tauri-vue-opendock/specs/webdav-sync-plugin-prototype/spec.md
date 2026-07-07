## ADDED Requirements

### Requirement: WebDAV Sync plugin settings
The system SHALL provide a WebDAV Sync plugin settings page when the WebDAV Sync plugin is installed and configurable.

#### Scenario: Open WebDAV Sync settings
- **WHEN** the user selects `WebDAV Sync` in the settings menu
- **THEN** the WebDAV Sync plugin settings page is displayed

### Requirement: WebDAV connection configuration
The system SHALL allow users to configure WebDAV server URL, username, credential placeholder or secret reference, and remote path.

#### Scenario: Save connection configuration
- **WHEN** the user edits WebDAV connection fields and saves settings
- **THEN** the updated WebDAV configuration persists locally without exporting plain-text credentials

### Requirement: WebDAV sync strategy configuration
The system SHALL allow users to configure auto-sync, sync interval, sync scope, and conflict policy.

#### Scenario: Set conflict policy
- **WHEN** the user selects `保留两份` as conflict policy and saves
- **THEN** the WebDAV Sync configuration stores `保留两份`

### Requirement: WebDAV status display
The system SHALL show WebDAV plugin enabled state, sync status, last sync time, and sync scope.

#### Scenario: Sync status visible
- **WHEN** the WebDAV Sync settings page is opened
- **THEN** the page shows plugin enabled state, current status, last sync time, and sync scope

### Requirement: WebDAV test connection action
The system SHALL provide a test connection action for the WebDAV Sync plugin.

#### Scenario: Test connection
- **WHEN** the user clicks test connection
- **THEN** the system updates WebDAV Sync status to reflect the test result

### Requirement: WebDAV sync now action
The system SHALL provide a sync now action for the WebDAV Sync plugin.

#### Scenario: Run sync now
- **WHEN** the user clicks sync now
- **THEN** the system updates last sync time and sync status after the sync command completes or mock completes
