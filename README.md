# Files

> A web-based personal file manager served at [files.oppshan.com](https://files.oppshan.com)

[![Coverage](https://raw.githubusercontent.com/warrenmnocos/oppshan-files/main/.github/badges/jacoco.svg)](https://raw.githubusercontent.com/warrenmnocos/oppshan-files/main/.github/badges/jacoco.svg)
![Java](https://img.shields.io/badge/Java-25-orange?logo=openjdk)
![Quarkus](https://img.shields.io/badge/Quarkus-3.32.4-blue?logo=quarkus)
![Angular](https://img.shields.io/badge/Angular-Material-red?logo=angular)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-blue?logo=postgresql)
![AWS](https://img.shields.io/badge/AWS-Graviton_ARM64-orange?logo=amazonaws)

> **This document is a work in progress.**

---

## Table of Contents

- [Project Overview](#project-overview)
- [Project Management](#project-management)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [User Experience Design](#user-experience-design)
- [Data Model](#data-model)
- [File Streaming](#file-streaming)
- [Security](#security)
- [Database](#database)
- [Infrastructure](#infrastructure)
- [Development Setup](#development-setup)

---

## Project Overview

**Files** is a full-stack personal cloud file manager that allows authenticated users to upload, organize, download, and
manage files through a browser-based interface. It supports folder hierarchies, drag-and-drop uploads with progress
tracking, right-click context menus, list and grid view modes, and per-user storage quota enforcement. All uploaded
files are encrypted at rest using AES/CTR with per-file initialization vectors.

This project is developed as the final exam for **ITMD 504 — Programming and Application Foundations** at **Illinois
Institute of Technology**.

### Features

Files delivers a complete file management experience through six functional areas: authentication via Google OAuth 2.0
with automatic account provisioning, hierarchical directory navigation with breadcrumb trails, folder operations
including create, rename, and recursive delete, file operations including streaming upload, encrypted storage, download,
and rename, contextual right-click menus for files, folders, and empty space, and per-user storage quota tracking with
visual usage indicators.

### Repository

- **Source code:** [github.com/warrenmnocos/oppshan-files](https://github.com/warrenmnocos/oppshan-files)
- **Project board:** [github.com/users/warrenmnocos/projects/1](https://github.com/users/warrenmnocos/projects/1)
- **Live application:** [files.oppshan.com](https://files.oppshan.com)

---

## Project Management

This project follows an Agile workflow using **GitHub Projects** as the Kanban board, **GitHub Issues** as the backlog,
and **GitHub Milestones** as sprint containers. The board is available
at [github.com/users/warrenmnocos/projects/1](https://github.com/users/warrenmnocos/projects/1).

### Board Structure

The Kanban board uses three columns: **To Do** for stories not yet started, **In Progress** for stories with an active
branch, and **Done** for stories whose PR has been merged and issue auto-closed. The board is filtered with `is:issue`
to exclude pull requests from the view, preventing visual duplication since each PR is already linked to its
corresponding issue.

![Project Board](docs/misc/project-board.png)

### User Stories

#### Epic 1 — Authentication and Account

Covers identity and session management. Users sign in via Google OAuth 2.0, are redirected to their root directory on
login, can sign out to end their session, and can view a profile panel showing their Google name, photo, and storage
usage.

##### US-01: As a Guest, I want to sign in with my Google account so I can access Files without creating a separate account.

###### Acceptance Criteria

- Landing page shows a "Sign in with Google" button
- Clicking the button redirects to Google OAuth consent screen
- Successful authentication creates a user record on first login
- Returning users are recognized and not duplicated in the database
- Failed authentication shows an error message
- User is redirected to root directory after successful login

###### Notes

- Use Quarkus OIDC extension with Google as provider
- Store user record: id, googleId, name, email, photoUrl, storageUsed, createdAt
- JWT issued by Quarkus after Google token validation
- Angular route guard (AuthGuard) blocks unauthenticated access to all routes

##### US-02: As a User, I want to be redirected to my root directory after signing in so I can immediately access my files.

###### Acceptance Criteria

- After successful Google login, user lands on their dashboard or /drive (root directory)
- If user navigates to a protected route while unauthenticated, they are redirected to login then back to intended route
  after auth
- No intermediate loading screens longer than 2 seconds

###### Notes

- Angular AuthGuard stores intended URL before redirecting to login
- Use redirectUrl query param pattern: /login?redirectUrl=/drive/folder-id

##### US-03: As a User, I want to sign out so my session is securely ended.

###### Acceptance Criteria

- Sign out option is accessible from the user profile menu
- Clicking sign out clears the session and JWT token
- User is redirected to the landing/login page after sign out
- Accessing protected routes after sign out redirects to login

###### Notes

- Clear JWT from Angular memory (do not store in localStorage)
- Use Angular HTTP interceptor to attach Bearer token to all API calls
- Quarkus session invalidation on sign out endpoint

##### US-04: As a User, I want to see my profile showing my Google name, photo, and storage usage so I know who I am logged in as.

###### Acceptance Criteria

- Profile is accessible from the top navigation bar
- Displays Google profile photo, full name, and email
- Displays storage used vs total quota (e.g. 45 MB of 500 MB used)
- Storage usage updates after uploads and deletions

###### Notes

- Pull name, email, photoUrl from Google ID token claims
- Storage used = sum of sizeBytes of all FileEntry records for the user
- Quota default: 200MB per user (configurable via application.properties)

#### Epic 2 — Navigation and Layout.

Covers how users move through the directory tree and switch between viewing modes. Users land on their root directory
after sign-in, navigate into folders by clicking them, track their location via breadcrumbs, and toggle between list and
grid views.

##### US-05: As a User, I want to see my root directory when I log in so I can immediately access my files and folders.

###### Acceptance Criteria

- Root directory loads automatically after login
- Displays all top-level folders and files owned by the user
- Empty state shown with helpful message when directory is empty
- Folders are visually distinct from files

###### Notes

- Root directory = Directory record with parent = null for that user
- Create the root directory automatically on the first login if not exists
- GET /api/directories/{id}/contents returns folders + files in one response

##### US-06: As a User, I want to navigate into a folder by clicking it so I can browse its contents.

###### Acceptance Criteria

- Clicking a folder opens its contents in the main view
- URL updates to reflect the current directory (e.g. /drive/{name}/{name}/{name})
- Back button works correctly using browser history
- Loading state shown while contents are being fetched

###### Notes

- Use Angular Router with the directory name as route param
- Each directory navigation is a proper route change — supports deep linking
- API: /api/directories/{id}/contents

##### US-07: As a User, I want to see breadcrumb navigation so I always know my current location in the folder tree.

###### Acceptance Criteria

- Breadcrumb shows full path from root to current directory
- Each breadcrumb segment is clickable and navigates to that directory
- Root is always shown as "My Files" or home icon
- Current directory is shown but not clickable

###### Notes

- Backend: GET /api/directories/{id}/breadcrumb returns ordered list of ancestors
- Build breadcrumb by traversing parent chain up to root
- Example: My Files > Documents > Work > 2025

##### US-08: As a User, I want to switch between grid view and list view so I can browse my preferred way.

###### Acceptance Criteria

- Toggle button visible in the directory toolbar
- Grid view shows file/folder icons in a card layout
- List view shows file/folder rows with name, size, type, date columns
- Selected view persists across directory navigation
- Selected view preference is remembered on next login

###### Notes

- Store view preference in localStorage (UI preference only, not server-side)
- Angular Material Grid List for grid view
- Angular Material Table for list view
- Both views support context menu (US-21, US-22)

#### Epic 3 — Folder Management

Covers the full lifecycle of directories. Users can create folders in the current directory, rename them, delete them
along with all nested contents, and inspect their metadata.

##### US-09: As a User, I want to create a folder in my current directory so I can organize my files.

###### Acceptance Criteria

- "New Folder" button visible in the directory toolbar
- Clicking opens a dialog prompting for folder name
- Folder name is required and must be between 1–255 characters
- Duplicate folder names in the same directory are rejected
- New folder appears in the directory immediately after creation
- Default name "New Folder" pre-filled if user submits empty

###### Notes

- `POST /api/directories` with `{ name, parentId }`
- Backend validates name uniqueness within same parent + same user
- Angular Material Dialog for the name input

##### US-10: As a User, I want to rename a folder so I can correct or update its name.

###### Acceptance Criteria

- Rename option accessible via context menu (US-21)
- Clicking rename opens a dialog pre-filled with the current name
- Updated name appears immediately after confirmation
- Empty or duplicate names are rejected with an error message
- Pressing Escape cancels the rename

###### Notes

- `PATCH /api/directories/{id}` with `{ name }`
- Same uniqueness validation as US-09

##### US-11: As a User, I want to delete a folder and all its contents so I can free up space.

###### Acceptance Criteria

- Delete option accessible via context menu (US-21)
- Confirmation dialog shown before deletion with folder name
- Deletes folder and all nested folders and files recursively
- Storage used is updated after deletion
- Deleted folder disappears from directory view immediately

###### Notes

- `DELETE /api/directories/{id}`
- Backend cascades delete to all children (`CascadeType.ALL` in JPA)
- Recalculate user `storageUsed` after delete
- Cannot delete root directory

##### US-12: As a User, I want to see folder properties so I can review its details.

###### Acceptance Criteria

- Properties accessible via context menu (US-21)
- Properties panel or dialog shows: name, date created, item count (folders + files), total size of contents
- Total size is human-readable (KB, MB)

###### Notes

- `GET /api/directories/{id}/properties`
- Item count and total size computed server-side

---

#### Epic 4 — File Management

Covers the full lifecycle of files. Users can upload files via button or drag-and-drop with progress tracking, receive
size-limit feedback, download files, rename them, delete them, and inspect their metadata.

##### US-13: As a User, I want to upload a file using an upload button so I can store it in my current folder.

###### Acceptance Criteria

- "Upload File" button visible in the directory toolbar
- Clicking opens the OS file picker
- Multiple file selection supported
- Upload progress shown per file
- Uploaded files appear in the directory immediately after upload
- Files exceeding 30 MB are rejected before upload begins

###### Notes

- `POST /api/files/upload`
- Fields: `file` (binary), `fileName`, `mimeType`, `parentId`
- Angular HttpClient reports upload progress via `reportProgress: true`

##### US-14: As a User, I want to upload a file via drag-and-drop so I can upload quickly without using a button.

###### Acceptance Criteria

- Entire directory view acts as a drop zone
- Dragging a file over the view shows a visual highlight
- Dropping begins the upload immediately
- Multiple files can be dropped at once
- Upload progress shown per file
- Files exceeding 30 MB are rejected with an error message
- Folders dropped are ignored with a helpful message

###### Notes

- Use Angular CDK drag-and-drop or native HTML5 `dragover`/`drop` events
- `dragover` event must call `preventDefault()` to enable drop
- Check `file.size` before initiating upload
- Folder detection: check if `DataTransferItem.webkitGetAsEntry()` returns a directory

##### US-15: As a User, I want to be notified when a file exceeds 30 MB so I understand why it was rejected.

###### Acceptance Criteria

- Files larger than 30 MB are rejected on the client before upload
- Error message clearly states the file name and size limit
- Other valid files in a multi-file upload still proceed
- Backend also enforces 30 MB limit as a second layer

###### Notes

- Client check: `file.size > 30 * 1024 * 1024`
- Backend: `quarkus.http.limits.max-body-size=31M` in `application.properties`
- Angular Material Snackbar for error notification

##### US-16: As a User, I want to download a file so I can retrieve it to my device.

###### Acceptance Criteria

- Download option accessible via context menu (US-20)
- Clicking download triggers browser file download
- Downloaded file has the correct original filename and extension
- Downloaded file is not corrupted

###### Notes

- `GET /api/files/{id}/download`
- Response headers: `Content-Disposition: attachment; filename=...`
- `Content-Type` set to original `mimeType`
- `@Transactional` on download endpoint to keep Blob stream alive

##### US-17: As a User, I want to rename a file so I can correct or update its name.

###### Acceptance Criteria

- Rename option accessible via context menu (US-20)
- Opens dialog pre-filled with current file name
- Updated name appears immediately after confirmation
- Empty or duplicate names in the same directory are rejected
- File extension is preserved or shown as a separate field

###### Notes

- `PATCH /api/files/{id}` with `{ name }`
- Consider preserving extension automatically if user omits it

##### US-18: As a User, I want to delete a file so I can remove content I no longer need.

###### Acceptance Criteria

- Delete option accessible via context menu (US-20)
- Confirmation dialog shown with file name before deletion
- File disappears from directory view immediately after deletion
- Storage used is updated after deletion

###### Notes

- `DELETE /api/files/{id}`
- Deletes both `FileNode` record and associated Large Object

- Recalculate user `storageUsed` after delete

##### US-19: As a User, I want to see file properties so I can review its details.

###### Acceptance Criteria

- Properties accessible via context menu (US-20)
- Shows: file name, file type (MIME), size (human-readable), upload date, parent folder name
- Size displayed in appropriate unit (KB or MB)

###### Notes

- `GET /api/files/{id}/properties`
- Format size: < 1 MB show KB, ≥ 1 MB show MB rounded to 2 decimal places

---

#### Epic 5 — Context Menu

Covers contextual right-click interactions throughout the file browser. Users can right-click a file, folder, or empty
space to access relevant actions without returning to the toolbar.

##### US-20: As a User, I want to right-click a file to see actions so I can act on it quickly.

###### Acceptance Criteria

- Right-clicking a file opens a context menu
- Menu contains: Download, Rename, Delete, Properties
- Menu closes when clicking outside or pressing Escape
- Menu appears near the cursor without going off-screen
- Each action triggers the correct behavior (US-16, US-17, US-18, US-19)

###### Notes

- No native Angular Material context menu — build custom using `Overlay` + `TemplatePortal` from Angular CDK
- Position strategy: `FlexibleConnectedPositionStrategy`
- Attach to document click listener to close on outside click

##### US-21: As a User, I want to right-click a folder to see actions so I can manage it quickly.

###### Acceptance Criteria

- Right-clicking a folder opens a context menu
- Menu contains: Open, Rename, Delete, Properties
- Menu closes when clicking outside or pressing Escape
- Each action triggers the correct behavior (US-06, US-10, US-11, US-12)

###### Notes

- Reuse same context menu CDK overlay component as US-20
- Pass item type (file vs folder) to determine which actions to show

##### US-22: As a User, I want to right-click empty space to see options so I can create content contextually.

###### Acceptance Criteria

- Right-clicking an empty area in the directory view opens a context menu
- Menu contains: New Folder, Upload File
- New Folder triggers the create folder dialog (US-09)
- Upload File triggers the file picker (US-13)
- Does not trigger when right-clicking a file or folder

###### Notes

- Listen for `contextmenu` event on the directory container element
- Check `event.target` to distinguish empty space from file/folder items
- Call `event.preventDefault()` to suppress browser default context menu

---

#### Epic 6 — Storage

Covers per-user quota visibility and enforcement. Users can see a visual indicator of how much of their storage quota is
in use and are blocked from uploading once the quota is exceeded.

##### US-23: As a User, I want to see a storage usage bar showing how much of my quota I have used.

###### Acceptance Criteria

- Storage bar visible in the sidebar or navigation area
- Shows used vs total (e.g. "128 MB of 500 MB used")
- Progress bar fills proportionally to usage
- Updates after every upload and deletion
- Bar changes color when usage exceeds 80% (warning) and 95% (critical)

###### Notes

- `GET /api/users/me/storage` returns `{ used, quota }`
- Angular Material Progress Bar component
- Color thresholds: default → warn → danger using `ngClass`

##### US-24: As a User, I want to be prevented from uploading when I exceed my storage quota so I know I need to free up space.

###### Acceptance Criteria

- Upload is blocked if current usage + new file size exceeds quota
- Clear error message shown: "Not enough storage. Free up space or upgrade your plan."
- Partial multi-file uploads stop at the file that exceeds quota
- Already uploaded files in the same batch are kept

###### Notes

- Backend check: `user.storageUsed + incomingFileSize > user.quota`
- Return HTTP 413 with descriptive error body
- Angular intercepts 413 and shows quota exceeded message
- Default quota: 500 MB (set in `application.properties`)

### Labels

Stories are organized by epic and priority tier. Epic labels scope each story to its functional area:
`epic: authentication and account` for US-01 through US-04, `epic: navigation and layout` for US-05 through US-08,
`epic: folder management` for US-09 through US-12, `epic: file management` for US-13 through US-19, `epic: context menu`
for US-20 through US-22, and `epic: storage` for US-23 through US-24. Priority labels indicate delivery criticality:
`tier: 1` for core must-have stories, `tier: 2` for exceeded-requirement stories, and `tier: 3` for polish items.

### Branch and PR Convention

Every user story follows a consistent workflow. The branch is created from the GitHub issue sidebar, producing a branch
name like `3-us-01-sign-in-with-google` where `3` is the issue number. Commits reference the issue with the format
`refs #3 Implement Google OIDC callback endpoint`. Pull requests are titled as `feat/US-01: Sign In with Google` and
include `Closes #3` in the body, which triggers auto-close of the issue and moves the card to Done upon merge.

### Sprint Plan

The project is organized into six sprints targeting a **May 9, 2026** submission deadline.

**Sprint 1** (Mar 25 – Apr 4) covers EPIC-01 and US-01 through US-04, delivering Google OAuth sign-in, post-login
redirect, sign-out, and the profile view as a deployable skeleton at files.oppshan.com. This sprint is complete.

**Sprint 2** (Apr 5 – Apr 11) covers EPIC-02 and US-05 through US-08, delivering root directory display, folder
navigation, breadcrumb trails, and the grid/list view toggle.

**Sprint 3** (Apr 12 – Apr 18) covers EPIC-03 and US-09 through US-12, delivering folder creation, rename, recursive
delete, and folder properties.

**Sprint 4** (Apr 19 – Apr 25) covers EPIC-04 and US-13 through US-19, delivering file upload via button and
drag-and-drop, size validation, download, rename, delete, and file properties.

**Sprint 5** (Apr 26 – May 2) covers EPIC-05 and US-20 through US-22, delivering the right-click context menus for
files, folders, and empty space.

**Sprint 6** (May 3 – May 9) covers EPIC-06, US-23, and US-24, delivering storage quota tracking and enforcement,
followed by stabilization and final submission preparation.

### Delivery Tiers

Stories are tiered to ensure a submit-safe baseline even if time runs short.

**Tier 1 (Core)** includes US-01, US-02, US-03, US-05, US-06, US-07, US-09, US-11, US-13, US-15, US-16, and US-18 — the
minimum viable product.

**Tier 2 (Exceeded)** includes US-04, US-08, US-10, US-12, US-14, US-17, US-19, US-20, US-21, and US-22."

**Tier 3 (Polish)** includes US-23 and US-24 for storage quota enforcement.

---

## Tech Stack

The backend is built with **Quarkus 3.32.4** on **Java 25**, using RESTEasy Reactive for JAX-RS endpoints, Hibernate ORM
for persistence, Hibernate Validator for input validation, and the Quarkus OIDC extension for Google OAuth 2.0
authentication. The database is **PostgreSQL 18** using Large Objects for binary file storage and Flyway for schema
migration management. The application runs on JDK 25 virtual threads via `@RunOnVirtualThread` for efficient concurrent
I/O.

The frontend is built with **Angular** and **Angular Material** using SASS for theming. It is compiled with **Yarn** via
the `frontend-maven-plugin` and bundled into the Quarkus application as static resources, eliminating the need for
separate frontend hosting or CORS configuration.

The build pipeline uses **Maven** as the top-level build tool, **GraalVM** for native image compilation targeting ARM64,
and **GitHub Actions** with the native `ubuntu-24.04-arm` runner for CI/CD. Code quality is monitored with **JaCoCo**
for test coverage and **JetBrains Qodana** for static analysis.

The application is deployed on **AWS Graviton** (t4g.micro) ARM64 instances with PostgreSQL hosted on **AWS RDS**. DNS
is managed through **AWS Route 53** with Alias records pointing to the application load balancer.

---

## Architecture

Files uses a single-origin deployment model. The Angular single-page application and the Quarkus REST API are served
from the same domain (`files.oppshan.com`). During the Maven build, the `frontend-maven-plugin` compiles the Angular
project and copies the output into `src/main/resources/META-INF/resources/`. Quarkus serves these static files directly.
API endpoints are namespaced under `/api/`. This eliminates CORS entirely since the frontend and backend share the same
origin, and removes the need for a separate CDN or frontend hosting service.

The request flow is as follows. A browser request to `files.oppshan.com/` serves the Angular SPA. All subsequent API
calls go to `files.oppshan.com/api/` and are handled by JAX-RS resources. Authentication tokens are managed as HTTP-only
cookies by the Quarkus OIDC extension. File uploads are streamed directly from the network through an in-memory pipe (
not a temp file) to the encryption layer and then to PostgreSQL Large Objects, keeping memory usage bounded regardless
of file size.

---

## User Experience Design

The application's visual design was planned before implementation using wireframe mockups. The design system uses a teal
primary color (#0D9488) for interactive elements and active states, amber (#F59E0B) as the accent color for upload
actions and folder icons, and a neutral gray palette for backgrounds and text. The font is Inter. Angular Material
components are themed using SASS mixins with a custom Material palette.

The following wireframes document the user flow through all 24 user stories.

### Sign in (US-01)

![Sign in](docs/mockups/01-sign-in.png)

The landing page for unauthenticated users. A centered card with the application branding, a "Sign in with Google"
button using Google's branded style, and a security note that the application uses OAuth 2.0 and never sees the user's
password.

### Empty drive (US-02, US-05)

![Empty drive](docs/mockups/02-empty-drive.png)

The first screen after sign-in. The navigation bar shows the app logo, a storage usage bar, and the user's profile
avatar. A breadcrumb trail shows "My files." The main content area displays a dashed drop zone with upload instructions,
guiding the user toward their first action. The toolbar provides "New folder" and "Upload" buttons along with list/grid
view toggles.

### Populated drive — list view (US-06, US-07)

![Populated drive — list view](docs/mockups/03-drive-list-view.png)

The main working state showing files and directories in a table layout. Folders are sorted first with amber folder
icons, followed by files with color-coded type icons: red for PDF, blue for DOCX, green for images, and gray for text
files. Columns show name, size, and last modified date. The breadcrumb trail shows the current path with clickable
ancestor segments. A selected row is highlighted with a teal-50 background. The toolbar includes a sort dropdown and
view toggle.

### Populated drive — grid view (US-08)

![Populated drive — grid view](docs/mockups/04-drive-grid-view.png)

The same content rendered as a card grid. Each card shows a large file type icon, the file name (truncated with ellipsis
if too long), and the size or date. The grid uses CSS `auto-fill` with `minmax` for responsive columns. The grid view
toggle is highlighted in the toolbar to indicate the active mode.

### File context menu (US-20)

![File context menu](docs/mockups/05-file-context-menu.png)

Right-clicking a file displays a floating menu via Angular CDK Overlay. The menu offers Download, Rename, Properties,
and Delete (separated by a divider and styled in red). The triggering row is highlighted.

### Folder context menu (US-21)

![Folder context menu](docs/mockups/15-21-22-24.png)

Right-clicking a folder displays a context menu with Open, Rename, Properties, and Delete. The "Open" action navigates
into the folder. The menu structure mirrors the file context menu for consistency, with Open replacing Download.

### Empty space context menu (US-22)

![Empty space context menu](docs/mockups/15-21-22-24.png)

Right-clicking empty space in the file list area displays a context menu with "New folder" and "Upload file." This
provides a contextual alternative to the toolbar buttons.

### Create folder dialog (US-09)

![Create folder dialog](docs/mockups/08-create-folder-dialog.png)

An Angular Material dialog overlaying the drive view. The dialog shows a title, a text input with the label "Folder
name" and placeholder "Untitled folder," and Cancel/Create buttons. The mockup shows the validation error state with a
red border and the message "Folder name is required," with the Create button disabled. This demonstrates Reactive Forms
with validators.

### Rename dialog (US-10, US-17)

![Rename dialog](docs/mockups/09-rename-dialog.png)

A dialog pre-filled with the current file or folder name. The input has a teal focus ring indicating it is editable. A
helper text warns that changing the extension may make the file unusable. The Rename button is styled in teal.

### Delete confirmation dialog (US-11, US-18)

![Delete confirmation dialog](docs/mockups/10-delete-dialog.png)

A destructive action confirmation dialog with a red warning icon, a highlighted warning box explaining that the action
is permanent and detailing the number of affected items, and a red "Delete permanently" button. For folders, the message
includes the count of nested files and subfolders.

### Properties panel (US-12, US-19)

![Properties panel](docs/mockups/11-properties-panel.png)

A dialog displaying read-only metadata for a file or folder. The header shows the file type icon and name. The body
lists properties in a two-column table: type (MIME type), size, location (breadcrumb path), created date, and modified
date.

### Upload progress (US-13, US-14)

![Upload progress](docs/mockups/12-upload-progress.png)

A bottom panel that appears during file uploads. Each uploading file is shown as a row with the file name, a teal
progress bar with percentage, and a cancel button. Multiple concurrent uploads are stacked. This demonstrates Angular
HttpClient progress events.

### Profile dropdown (US-03, US-04, US-23)

![Profile dropdown](docs/mockups/13-profile-dropdown.png)

Clicking the avatar in the navigation bar opens a dropdown panel showing the user's Google name and email, a Profile
link, a storage usage section with a progress bar and percentage, and a red "Sign out" button separated by a divider.
The storage bar changes color based on usage: teal for 0–70%, amber for 70–90%, and red for 90–100%.

### Error states (US-15, US-24)

![Error states](docs/mockups/15-21-22-24.png)

Two inline alert banners. The "File too large" alert (red background) appears when a file exceeds the size limit,
showing the file name and actual size versus the limit. The "Storage quota exceeded" alert (amber background) appears
when the user's storage is full, showing a red 100% progress bar and a disabled upload button.

---

## Data Model

The application uses four core entities organized across two domains.

### User domain

**UserAccount** represents a platform user. It has a sequential ID, a UUID v7 for external references, a display name,
timestamps, and relationships to one or more IdpAccounts and exactly one UserStorage.

**IdpAccount** is the base entity for identity provider accounts, using JPA joined inheritance. It stores the provider
ID (the external identifier from the identity provider), the provider name (such as "google"), and a reference to the
owning UserAccount. This abstraction allows adding new identity providers (such as GitHub or Microsoft) without
modifying the existing schema.

**GoogleAccount** extends IdpAccount and adds Google-specific fields: name, email, and photo URL. It lives in a separate
`google_account` table joined to `idp_account` by primary key.

### File domain

**FileNode** is the unified entity for both files and directories, following an inode-style design. It has a sequential
ID, a UUID v7, a name, a MIME type, a boolean `directory` flag, a `sizeBytes` field, and a `content` field of type
`java.sql.Blob` (mapped to a PostgreSQL OID column for Large Object storage). Directories have `content` set to null and
`sizeBytes` set to zero. Each FileNode references a parent FileNode (null for root nodes) and an owning UserAccount. A
database CHECK constraint enforces that directories must have null content and zero size, while files must have non-null
content.

The unique constraint on `(parent_file_node_id, name, mime_type)` uses PostgreSQL 15+ `NULLS NOT DISTINCT` to prevent
duplicate names within the same directory, including at the root level where `parent_file_node_id` is null.

**UserStorage** tracks each user's storage quota. It references the UserAccount and the user's root FileNode, and stores
the maximum allowed storage in bytes.

---

## File Streaming

File uploads are streamed end-to-end without loading the entire file into memory. When a client sends a `POST` request
with the file body, Quarkus receives the request on the Vert.x event loop and creates an in-memory pipe (a bounded chunk
queue) to bridge the asynchronous Vert.x layer with the blocking `InputStream` API. The endpoint method runs on a
virtual thread via `@RunOnVirtualThread`, which consumes bytes from this pipe. If the application reads slower than the
network delivers, the pipe fills up, Vert.x pauses the socket read, Netty stops draining the TCP receive buffer, and TCP
backpressure propagates to the client. The entire file is never buffered in memory or spooled to a temp file.

The upload stream passes through a `CountingInputStream` (to track the original file size), then into an `IncomingBlob`
wrapper that prepends a random 16-byte IV and encrypts the stream with AES/CTR via `CipherInputStream`. Hibernate
receives this `IncomingBlob` as a `java.sql.Blob` and streams the encrypted bytes into a PostgreSQL Large Object. After
`entityManager.flush()` forces the stream to be consumed, the counted bytes are written to the FileNode's `sizeBytes`
field. The FileNode metadata and the Large Object data are committed atomically in a single transaction.

Downloads reverse the process. The FileNode is loaded, its Blob is wrapped in an `OutgoingBlob` that reads the first 16
bytes as the IV, initializes a decryption cipher, and returns a `CipherInputStream` over the remaining data. The
decrypted stream is piped to the HTTP response via `StreamingOutput`. The transaction remains open for the duration of
the download since the Large Object stream requires an active transaction.

---

## Security

### Authentication

Authentication is delegated entirely to **Google OAuth 2.0** via the Quarkus OIDC extension. No passwords are stored in
the application. On first login, the backend extracts `sub` (Google's unique user identifier), `name`, `email`, and
`picture` from the ID token claims. If no UserAccount exists for that `sub`, a new UserAccount, GoogleAccount,
UserStorage, and root FileNode are created atomically. Subsequent logins match by the Google `sub` identifier. The OIDC
session is managed via HTTP-only cookies by Quarkus.

The identity provider abstraction (`IdpAccount` → `GoogleAccount`) is designed for multi-provider extensibility. Adding
a new provider (such as GitHub) requires creating a new entity extending `IdpAccount`, implementing the token claim
extraction, and adding the OIDC configuration — no changes to the existing user or file domain.

### File encryption

All uploaded file content is encrypted at rest using **AES/CTR/NoPadding**. Each file gets a unique 16-byte
initialization vector generated by `SecureRandom`. The IV is prepended to the encrypted content in the same Large
Object, making the encryption self-contained per file with no separate IV column required.

The encryption key is derived at application startup using **PBKDF2WithHmacSHA256** with 600,000 iterations (per OWASP
recommendations) from a master passphrase stored in the environment variable `APP_STORAGE_ENCRYPTION_PASSPHRASE`. The
PBKDF2 derivation protects against weak passphrases by making brute-force attacks computationally expensive. The derived
256-bit AES key is cached in memory for the lifetime of the application.

On Graviton ARM64 instances, AES/CTR benefits from hardware acceleration via ARMv8 Cryptographic Extensions, which are
enabled by default on AWS Graviton processors.

The encryption is transparent to the rest of the application. The `IncomingBlob` and `OutgoingBlob` wrappers implement
`java.sql.Blob` and handle encryption/decryption in their `getBinaryStream()` methods. The entity, service, and endpoint
layers never interact with cipher logic directly.

### Input validation

File names received via the `X-File-Name` header are validated and sanitized to prevent directory traversal, null bytes,
and excessively long names. MIME types are derived from the `Content-Type` header. The `@HeaderParam` values are
validated using Hibernate Validator constraints on the request bean.

### Least-privilege database role

The application connects to PostgreSQL using a dedicated `oppshan_files_app` role with `NOSUPERUSER`, `NOCREATEDB`,
`NOCREATEROLE`, and `LOGIN` permissions. The role has `CONNECT` on the application database, `USAGE` and `CREATE` on the
public schema (required by Flyway), and default privileges for `SELECT`, `INSERT`, `UPDATE`, `DELETE` on tables and
`USAGE`, `SELECT` on sequences. Large Objects created by this role are owned by it, so no additional Large Object grants
are needed.

### Startup validation

At application startup, the `FileContentCipherService` validates that the encryption passphrase meets a minimum length
requirement. If the passphrase is too short, the application fails to start with a clear error message instructing the
operator to generate a proper key.

---

## Database

The database is **PostgreSQL 18** with all timestamps stored as `TIMESTAMPTZ` (timestamp with time zone) in UTC. The
server timezone is set to UTC via `ALTER SYSTEM SET timezone = 'UTC'`, and the JDBC connection sends
`SET timezone='UTC'` on every connection via the `options` URL parameter.

Schema management is handled by **Flyway**. Hibernate's schema generation is set to `validate` — it checks that the
entity mappings match the Flyway-managed schema at startup and fails fast if they diverge. Migration files live in
`src/main/resources/db/migration/` and are plain PostgreSQL SQL, including the `delete_file_lob()` trigger function that
Hibernate's auto-generation could not create.

### Large Object cleanup trigger

When a FileNode row is deleted, the associated PostgreSQL Large Object must also be removed. The standard approach is
the `lo_manage` extension, but installing extensions requires superuser privileges that may not be available on managed
services like RDS. Instead, a custom trigger function calls `lo_unlink` on the content OID before each row delete. This
is created in the Flyway migration alongside the `file_node` table.

### Sequences

JPA sequences use an `allocationSize` of 100, which must match the `INCREMENT BY 100` in the Flyway-created sequences.
This allows Hibernate to allocate blocks of 100 IDs per `nextval` call, reducing round-trips to the database during
batch inserts.

---

## Infrastructure

### Deployment architecture

The application is compiled to a **GraalVM native image** targeting **ARM64** and deployed on **AWS Graviton** t4g.micro
instances running Ubuntu. The native binary starts in under 100 milliseconds and uses approximately 50–100 MB of RSS
memory, leaving ample headroom on the 1 GB instance for PostgreSQL connections and OS overhead.

The database runs on **AWS RDS** PostgreSQL in the same availability zone as the EC2 instance, eliminating cross-AZ data
transfer charges. The RDS instance uses a custom parameter group with `timezone` and `log_timezone` set to UTC. The JDBC
connection enforces SSL via `sslmode=require` since traffic traverses the VPC network.

For the course deadline, a single t4g.micro instance hosts the application. The intended production
architecture uses an Auto Scaling Group with a minimum of 1 and maximum of 3 instances behind an Application Load
Balancer, with Route 53 Alias records pointing to the ALB.

### CI/CD pipeline

Every push to `main` triggers a GitHub Actions workflow that builds the GraalVM native image on the `ubuntu-24.04-arm`
runner (native ARM64), runs the test suite with JaCoCo coverage, and deploys the binary to the EC2
instance. A separate Qodana workflow runs static analysis on every pull request.

### DNS

Route 53 manages the `files.oppshan.com` domain using Alias records pointing to the ALB. Alias records are preferred
over CNAMEs because they work at the zone apex, are resolved within the AWS network without an extra DNS hop, and incur
no Route 53 query charges.

---

## Development Setup

### Prerequisites

Java 25 (via SDKMAN: `sdk install java 25-graalce`), Maven 3.9+, Node.js 20+ and Yarn, Angular CLI, and Docker (for Dev
Services). A Google Cloud project with OAuth 2.0 credentials is required, with `http://localhost:8080` added as an
authorized redirect URI.

### Running locally

The application uses Quarkus profile-based configuration. In **dev mode**, the local PostgreSQL instance is used (Dev
Services is disabled). Set the `DB_PASSWORD` and Google OAuth environment variables, then run `./mvnw quarkus:dev`. The
application will be available at `http://localhost:8080` with the Angular frontend and REST API on the same origin.

In **test mode**, Quarkus Dev Services automatically starts a PostgreSQL 18 container via Testcontainers. No database
configuration is needed — Flyway runs the migrations against the ephemeral container, tests execute against real
PostgreSQL, and the container is discarded after the test suite completes.

In **production**, the application reads database credentials and the encryption passphrase from environment variables
and connects to the RDS instance.

---

*This project is developed as the final exam for ITMD 504 — Programming and Application Foundations at Illinois
Institute of Technology.*