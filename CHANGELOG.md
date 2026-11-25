# Changelog

All notable changes to **Database Studio** will be documented in this file.

## [1.0.2] - Bug Fix Release

### Fixed
- **WSL & Remote Data Export**: Switched file export writes from synchronous `fs.writeFileSync` to VS Code's async `vscode.workspace.fs.writeFile`, added a safe `os.homedir()` fallback when no workspace folder is open, and wrapped save dialog handling in `try/catch` so exports work reliably in WSL, Remote-SSH, and Dev Containers.
- **Safe Result Serialization & UI Feedback**: Added `BigInt`- and circular-reference-safe JSON serialization for CSV/JSON/SQL/Markdown exports and non-blocking UI status feedback in the result grid.

## [1.0.1] - Bug Fix Release

### Fixed
- **Connection Persistence Across Restarts**: Connection profiles are now persisted in VS Code `globalState` (stripped of passwords and SSH secrets, which remain in `SecretStorage`) and automatically restored along with live driver registrations when reopening VS Code.

## [1.0.0] - Initial Release

### Added
- **Universal Live Drivers**: Support for PostgreSQL, MySQL, MariaDB, Microsoft SQL Server, Oracle (Thin Mode), ClickHouse, MongoDB, Redis, DuckDB, and embedded SQLite.
- **SSH Tunnel (Bastion Host)**: Built-in SSH port forwarding for all network databases with Private Key, SSH Agent, and Password authentication.
- **Security**: OS-backed credential persistence via VS Code `SecretStorage`, TLS/SSL toggles with self-signed certificate option, and Connection URI parsing/copying.
- **Database Navigator**: Multi-schema introspection and grouping, engine-accurate object folders (`Tables`, `Collections`, `Keyspace`, `Views`, `Procedures`, `Functions`, `Packages`), Oracle-maintained table visibility toggle, hover shortcuts, and confirmation dialogs for destructive actions.
- **SQL Console**: Dialect-aware autocomplete, SQL formatting, selection execution, and live `EXPLAIN` execution plan visualization.
- **Paginated Data Grid**: Automatic 1,000-row batch pagination on both local and live SQL connections, configurable page sizes (`10`, `25`, `50`, `100`, `500`, `1000`), inline editing, and CSV/JSON/SQL/Markdown export.
- **Visual Tools & Theming**: Visual Table Designer, interactive schema ER Diagram viewer, and full VS Code Dark, Light, and High Contrast theme support.
