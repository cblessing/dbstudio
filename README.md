# Database Studio (VS Code Extension)

> High-performance WebAssembly database client for Visual Studio Code with universal SQL engine support, visual table designer, and interactive query runner.

## Features

- **⚡ Zero-Latency WebAssembly Engine**: Runs embedded 32-bit `sql.js` (SQLite WASM) locally with zero external network dependencies.
- **🌐 Universal Database Dialect Support**:
  - **Oracle Database** (`VARCHAR2`, `IDENTITY`, `ROWNUM`, `SYSDATE`, `DUAL`, `CASCADE CONSTRAINTS`)
  - **Microsoft SQL Server (T-SQL)** (`NVARCHAR`, `IDENTITY(1,1)`, `TOP N`, `@@VERSION`, `@@SERVERNAME`, brackets `[table]`)
  - **PostgreSQL** (`SERIAL`, `BOOLEAN`, `TIMESTAMPTZ`, `RETURNING`)
  - **MySQL / MariaDB** (`AUTO_INCREMENT`, backticks `` `table` ``)
  - **DuckDB & SQLite**
- **🖱️ Right-Click Object Management**:
  - Right-click any table or column in the Database Navigator.
  - Drop table with foreign-key cascade options.
  - Truncate / clear table data.
  - Rename tables and add/drop/rename columns with instant SQL preview.
  - Visual Table Designer with interactive column types and constraints.
- **📊 Interactive Data Grid**:
  - Inline editing with pending-change indicators.
  - Export to CSV, JSON, SQL INSERT statements, and Markdown tables.
  - Pagination, column sorting, and instant search filter.
- **🗺️ Visual ER Diagram**:
  - Interactive table relationship graphs with smooth bezier connector paths.
  - Foreign key relationship inspection.
- **⚡ Visual Query Execution Plan**:
  - Step-by-step query cost and join pipeline visualizer.

---

## Quickstart & Local Testing in VS Code

### 1. Test via Extension Development Host (F5)

1. Clone or download this repository.
2. Open in VS Code:
   ```bash
   code .
   ```
3. Install dependencies and build the frontend bundle:
   ```bash
   npm install
   npm run build
   ```
4. Press **`F5`** (or go to **Run & Debug** `Ctrl+Shift+D` and select **"Run Database Studio Extension"**).
5. In the new window, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
   ```
   Database Studio: Open Database Studio
   ```

---

## Packaging as `.vsix`

To install the extension directly into your primary VS Code instance:

```bash
# Package into .vsix
npm run package:extension

# Install in VS Code
code --install-extension database-studio-vscode-1.0.0.vsix
```

---

## Git Setup

```bash
# Initialize git repository
git init

# Stage all files
git add .

# Initial commit
git commit -m "feat: initial commit for Database Studio VS Code extension"

# Connect to your GitHub / GitLab repository
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

---

## Publishing to the VS Code Marketplace

1. Create a Personal Access Token on [Azure DevOps](https://dev.azure.com) with **Marketplace (Acquire, Manage)** scope.
2. Create a Publisher ID on [Marketplace Management](https://marketplace.visualstudio.com/manage).
3. Set your publisher ID in `package.extension.json`.
4. Run:
   ```bash
   npx @vscode/vsce login <your-publisher-id>
   npm run publish:extension
   ```

---

## License

Apache-2.0
