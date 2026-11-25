# Software Development & Engineering Standards

Follow these engineering practices on every change in this repository.

## 1. Scope Discipline & Small-Batch Delivery
- **Clarify Before Coding:** Confirm ambiguous requirements, edge cases, or architectural trade-offs before implementing.
- **Scoped Changes:** Keep edits strictly within the module or feature boundary requested; avoid unrelated refactors in the same change.
- **Small, Reviewable Commits:** Prefer small, incremental commits with clear, high-level descriptions over large bundled diffs.

## 2. Code Quality, Modularity & Complexity
- **DRY & Low Complexity:** Eliminate duplicated logic via shared helpers, hooks, or components. Every function and React component must have a **maximum cyclomatic complexity of 10** (both classic McCabe and strict logical-branch complexity).
- **File Length & Colocation:** Keep source files **under 500 lines**. Split files by responsibility and low co-change coupling (e.g., separating pure utilities, context menus, sub-panels, and seed data from stateful containers). Do not hyper-fragment tightly coupled private helpers.
- **Type Safety & Cleanliness:** Keep `npm run lint` (`tsc --noEmit`) passing with zero errors. Remove unused imports, props, variables, and dead code.
- **Clean Domain Naming:** Do not leak internal runtime or demo jargon (such as `"wasm"` or `"WebAssembly"`) into UI copy, identifiers, file names, or comments.

## 3. Shift-Left Testing & Verification
- **Test Alongside Code:** Add or update unit tests (following the test pyramid: fast unit tests for utilities, engine logic, and dialect translation) whenever adding features or fixing bugs.
- **Definition of Done:** Before completing any code change, run and verify:
  1. `npm run lint` (TypeScript type check)
  2. `npm run build` (frontend bundle + VS Code extension host compilation)
  3. `npm test` (full unit test suite)
  4. Rebuild `database-studio-vscode-<version>.vsix` whenever extension or UI code changes so the installable package stays up to date.

## 4. Security & Performance by Design
- **No Secrets in Source:** Never hardcode credentials, tokens, or private keys in source files.
- **Safe Data Handling:** Properly escape/format SQL values and identifiers; validate user inputs at boundaries.
- **Responsive UI & Data Batching:** Avoid blocking the main thread; paginate/batch unbounded queries (default batch size: 1,000 rows) and load additional rows on demand.

## 5. Living Documentation
- Keep `README.md`, `CHANGELOG.md`, public interfaces, and exported types accurate and in sync with the implementation.

## 6. Branching & Marketplace Release Strategy
- **`main` (Stable Release Channel):** Always matches the latest production Marketplace release. Uses **even minor** versions (`1.0.x`, `1.2.x`, `1.4.x`, ...). Package with `npx @vscode/vsce package --no-dependencies`.
- **`pre-release` (Pre-Release Channel):** Long-running beta branch matching the Marketplace Pre-Release channel. Uses **odd minor** versions (`1.1.x`, `1.3.x`, `1.5.x`, ...) strictly newer than the latest stable release. Package with `npx @vscode/vsce package --pre-release --no-dependencies`.
- **Feature & Bugfix Flow:** Merge `fix/*` or `feat/*` branches into `pre-release` first for beta validation. Once verified, merge `pre-release` into `main`, bump to the next even minor version (e.g., `1.1.x` -> `1.2.0`) so both stable and pre-release users automatically update to the new stable release, and publish.
- **Urgent Stable Hotfixes:** For critical production fixes that cannot wait for `pre-release`, commit/patch directly on `main` (incrementing the patch version, e.g., `1.0.1` -> `1.0.2`), then merge `main` back into `pre-release`.
- **Automated Marketplace CI/CD:** GitHub Actions (`.github/workflows/ci.yml`) runs lint, audit, build, and unit tests on pushes/PRs to `main` and `pre-release`. On successful pushes, if the `package.json` version is not yet on the Marketplace, CI packages and publishes the VSIX via **OIDC Trusted Publishing** (`vsce publish --oidc`, no PAT secrets needed; stable for `main`, `--pre-release` for `pre-release`).
