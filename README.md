# Database Studio

> Universal database client for Visual Studio Code supporting PostgreSQL, MySQL, MariaDB, Microsoft SQL Server, Oracle, ClickHouse, MongoDB, Redis, DuckDB, and SQLite — with SSH bastion tunneling, live execution plans, paginated data grid, visual table designer, and interactive ER diagrams.

## Features

### Supported Database Engines
- **Relational SQL**: PostgreSQL, MySQL, MariaDB, Microsoft SQL Server (T-SQL), Oracle Database (Thin Mode — no Instant Client required), and SQLite (embedded local engine)
- **Analytical / OLAP**: ClickHouse and DuckDB
- **NoSQL**: MongoDB and Redis

### Secure Connectivity & SSH Bastion Tunneling
- **VS Code SecretStorage**: Database passwords and SSH credentials are stored securely in VS Code's OS-backed `SecretStorage` — never saved in plaintext JSON or workspace files.
- **Connection URI Support**: Paste a full connection URI to auto-populate fields, or copy a connection URI on demand.
- **SSL / TLS**: Built-in TLS encryption toggle with optional self-signed certificate support for local dev containers.
- **SSH Tunnel (Bastion Host)**: Forward traffic for any network database through an SSH jump host using **Private Key** (with optional passphrase), **SSH Agent** (`SSH_AUTH_SOCK` / Windows OpenSSH Agent), or **Password** authentication.
- **Profile Import / Export**: Export and import connection lists as JSON (passwords and SSH secrets are always excluded).

### Database Navigator
- **Multi-Schema Grouping**: Automatically discovers and groups accessible user schemas (e.g., PostgreSQL, SQL Server, Oracle), with an optional right-click toggle to show or hide Oracle-maintained internal tables.
- **Engine-Accurate Object Trees**: Displays native object folders per engine (`Tables`, `Views`, `Procedures` / `Stored Procedures`, `Functions`, `Packages`, `Collections`, `Keyspace`).
- **Context Menus & Hover Actions**: View Data, Edit Columns / Structure, Generate `SELECT` / `INSERT` / `CREATE VIEW` / `CREATE PROCEDURE` / `CREATE FUNCTION` / `CREATE PACKAGE` scripts, Refresh Schema, Truncate, and Drop (with confirmation and SQL preview).

### SQL Console & Visual Execution Plans
- **Multi-Dialect SQL Editor**: Context-aware autocomplete for tables, views, procedures, and columns, SQL formatting, and selection-based execution (`Ctrl+Enter` / `F5`).
- **Live `EXPLAIN` Plans**: Click **Explain** to execute your query and inspect the visual execution plan tree (real `EXPLAIN` plans for PostgreSQL, MySQL/MariaDB, Oracle, and ClickHouse).

### Paginated Data Grid & Visual Tools
- **Smart 1,000-Row Batching**: Automatically paginates large tables and unbounded queries in 1,000-row batches with configurable page sizes (`10`, `25`, `50`, `100`, `500`, `1000`) and seamless paging beyond 1,000 rows.
- **Data Export**: Export results to CSV, JSON, SQL `INSERT` statements, or Markdown tables, or copy directly as TSV.
- **Visual Table Designer & ER Diagrams**: Create/alter tables visually and explore schema foreign-key relationships in an interactive ER diagram.
- **Full VS Code Theme Support**: Automatically adapts to Dark, Light, High Contrast, High Contrast Light, and third-party VS Code color themes.

## Getting Started

1. Click the **Database Studio** icon in the VS Code Activity Bar.
2. Click **+ New Connection**, choose your database engine, and enter your connection details (or paste a Connection URI).
3. Click **Test** to verify connectivity, then **Connect** to introspect your schemas and start querying.

## Feedback & Issues

Report bugs or request features at [github.com/cblessing/dbstudio/issues](https://github.com/cblessing/dbstudio/issues).

## License

Apache-2.0 — see [LICENSE](LICENSE).
