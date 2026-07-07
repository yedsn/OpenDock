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

### Requirement: Collection tags
The system SHALL allow users to assign multiple tags to a collection during collection create and edit flows.

#### Scenario: Create collection with tags
- **WHEN** the user creates a collection and enters multiple tags
- **THEN** the collection is saved with all entered tags after trimming whitespace and removing empty tags

#### Scenario: Edit collection tags
- **WHEN** the user edits a collection's tags
- **THEN** the collection list and collection detail show the updated tags without changing the collection's items

### Requirement: Collection item management
The system SHALL allow users to add, edit, delete, and open collection items.

#### Scenario: Add URL item
- **WHEN** the user adds a URL item to a web collection
- **THEN** the item appears in the selected collection detail list

### Requirement: Quick views
The system SHALL provide quick views for all resources, favorite collections, recent opens, unbound collections, and tag-filtered collections.

#### Scenario: View favorites
- **WHEN** the user selects the favorite quick view
- **THEN** only favorite collections or collections in favorite scenes are shown

#### Scenario: View collections by tag
- **WHEN** the user selects the tag filter quick view and chooses tag `docs`
- **THEN** only collections containing the `docs` tag are shown

#### Scenario: Combine tag and keyword filters
- **WHEN** the user selects tag `docs` and enters a search keyword
- **THEN** only collections that match both the selected tag and the search keyword remain visible

### Requirement: Search
The system SHALL search scenes, collections, collection items, tools, and relevant metadata from the sidebar search box.

#### Scenario: Search by URL
- **WHEN** the user enters a URL keyword in search
- **THEN** matching collection items and their parent collections remain visible

#### Scenario: Search by collection tag
- **WHEN** the user enters a collection tag keyword in search
- **THEN** matching tagged collections remain visible
