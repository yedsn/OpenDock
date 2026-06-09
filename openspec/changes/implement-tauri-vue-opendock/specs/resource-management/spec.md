## ADDED Requirements

### Requirement: Workspace management
The system SHALL allow users to create, edit, delete, switch, and manage workspaces from the lower-left workspace switcher.

#### Scenario: Create workspace
- **WHEN** the user creates a workspace from workspace management
- **THEN** the workspace appears in the workspace switcher and can be selected

### Requirement: Scene management
The system SHALL allow users to create, edit, delete, select, and search scenes.

#### Scenario: Create project scene
- **WHEN** the user creates a project-type scene named `官网`
- **THEN** the system creates default collections for code directory, local web pages, development web pages, production web pages, and common commands

### Requirement: Collection management
The system SHALL allow users to create, edit, delete, select, filter, favorite, and open collections.

#### Scenario: Create unbound collection
- **WHEN** the user creates a collection without selecting a scene
- **THEN** the collection appears in the unbound quick view

### Requirement: Collection item management
The system SHALL allow users to add, edit, delete, and open collection items.

#### Scenario: Add URL item
- **WHEN** the user adds a URL item to a web collection
- **THEN** the item appears in the selected collection detail list

### Requirement: Quick views
The system SHALL provide quick views for all resources, favorite collections, recent opens, and unbound collections.

#### Scenario: View favorites
- **WHEN** the user selects the favorite quick view
- **THEN** only favorite collections or collections in favorite scenes are shown

### Requirement: Search
The system SHALL search scenes, collections, collection items, tools, and relevant metadata from the sidebar search box.

#### Scenario: Search by URL
- **WHEN** the user enters a URL keyword in search
- **THEN** matching collection items and their parent collections remain visible
