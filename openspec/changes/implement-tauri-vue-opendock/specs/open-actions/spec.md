## ADDED Requirements

### Requirement: Open single resource
The system SHALL open a single collection item using the configured tool for that item type.

#### Scenario: Open URL resource
- **WHEN** the user clicks open on a URL collection item
- **THEN** the system invokes the configured browser tool through a Tauri command

### Requirement: Open collection
The system SHALL open all items in a collection according to the collection open strategy.

#### Scenario: Open web collection
- **WHEN** the user opens a web collection
- **THEN** the system opens each URL item with the collection's configured browser tool

### Requirement: Open scene
The system SHALL open the visible collections in a scene according to each collection's strategy.

#### Scenario: Open current scene
- **WHEN** the user clicks open current scene
- **THEN** the system previews or confirms the batch open action before launching resources

### Requirement: Command execution safety
The system SHALL require explicit user confirmation before executing command resources or command collections.

#### Scenario: Run command item
- **WHEN** the user opens a command item
- **THEN** the system displays confirmation before invoking the terminal command

### Requirement: Tool argument templating
The system SHALL apply configured argument templates when launching tools.

#### Scenario: Launch editor with path
- **WHEN** the user opens a directory with an editor tool configured as `{path}`
- **THEN** the launched command includes the selected directory path in place of `{path}`
