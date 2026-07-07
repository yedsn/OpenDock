## ADDED Requirements

### Requirement: Settings navigation
The system SHALL provide a settings page with system settings, plugin settings, and about entries in the left settings menu.

#### Scenario: Plugin settings position
- **WHEN** configurable plugins are installed
- **THEN** their menu entries appear between the system settings entries and the About entry with visual spacing

### Requirement: General settings
The system SHALL allow users to configure default view, recent-open limit, confirmation behavior, logging behavior, and language.

#### Scenario: Save general settings
- **WHEN** the user changes general settings and saves
- **THEN** the new values persist locally

### Requirement: Opening tool settings
The system SHALL allow users to manage opening tools by type and select one default tool per tool type.

#### Scenario: Select default browser
- **WHEN** the user marks Chrome as the default browser tool
- **THEN** new web collections default to Chrome

### Requirement: Collection template settings
The system SHALL allow users to edit default collection templates used when creating project-type scenes.

#### Scenario: Edit project template
- **WHEN** the user changes the project scene collection template
- **THEN** newly created project scenes use the updated template

### Requirement: Data and backup settings
The system SHALL provide import, export, clear recent records, and reset prototype/application data actions.

#### Scenario: Export settings
- **WHEN** the user triggers export
- **THEN** the system creates an exportable workspace data payload without plain-text secrets

### Requirement: Appearance settings
The system SHALL allow users to configure theme, density, sidebar width, and console visibility.

#### Scenario: Hide console
- **WHEN** the user disables console visibility
- **THEN** the console pane is hidden in the main workbench
