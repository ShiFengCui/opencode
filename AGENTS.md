- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `dev`.
- Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.

## Build & Development Commands

### Root Level

```bash
bun run dev              # Start opencode CLI in dev mode
bun run dev:web          # Start web app dev server
bun run dev:desktop      # Start Tauri desktop dev
bun run typecheck        # Type check all packages via Turbo
bun run test             # Blocked at root - run from package dirs
```

### Package Level (packages/opencode)

```bash
bun run dev              # Run CLI with hot reload
bun run build            # Build production binary
bun run test             # Run all tests (Bun test runner)
bun run test <pattern>   # Run tests matching pattern (e.g., "filesystem")
bun run typecheck        # Type check with TypeScript Go
bun run db generate --name <slug>  # Generate Drizzle migration
```

### Running Single Tests

Tests use Bun's test runner. Run from `packages/opencode`:

```bash
bun test                          # All tests
bun test filesystem               # Tests matching "filesystem"
bun test test/util/glob.test.ts   # Specific file
bun test --timeout 30000          # Custom timeout
```

### Other Packages

```bash
# Web UI (packages/web)
bun run dev        # Astro dev server
bun run build      # Production build

# SDK (packages/sdk/js)
./script/build.ts  # Regenerate SDK
```

## Code Style Guidelines

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible; let errors propagate
- Avoid using the `any` type
- Prefer single word variable names where possible
- Use Bun APIs when possible, like `Bun.file()`, `Bun.$`
- Rely on type inference; avoid explicit type annotations unless necessary for exports
- Prefer functional array methods (flatMap, filter, map) over for loops
- Use type guards on filter to maintain type inference downstream

### Naming Conventions

```ts
// Good
const foo = 1
function journal(dir: string) {}

// Bad
const fooBar = 1
function prepareJournal(dir: string) {}
```

Reduce variable count by inlining when used once:

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Imports

- Use absolute paths with `@/` for `src/` directory
- Use `@tui/` for `src/cli/cmd/tui/` directory
- Group imports: external packages first, then internal imports
- Use default imports for CommonJS modules (path, fs, z)

```ts
import { $ } from "bun"
import path from "path"
import z from "zod"
import { NamedError } from "@opencode-ai/util/error"
import { Instance } from "../project/instance"
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context:

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment:

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns:

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Error Handling

Use `NamedError` pattern for structured errors:

```ts
import { NamedError } from "@opencode-ai/util/error"
import z from "zod"

export const MyError = NamedError.create(
  "MyError",
  z.object({
    message: z.string(),
    code: z.number(),
  }),
)

// Throw
throw new MyError({ message: "Something failed", code: 500 })

// Catch and handle
if (err instanceof NamedError) {
  return c.json(err.toObject(), { status: 500 })
}
```

### Database Schema (Drizzle)

Use snake_case for field names so column names don't need redefinition:

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

### Testing

- Avoid mocks as much as possible
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`)
- Run tests from package dirs like `packages/opencode`
- Use descriptive test names with nested `describe` blocks
- Prefer integration tests that exercise real code paths

### Formatting

- No semicolons (enforced by Prettier)
- Print width: 120 characters
- Single quotes preferred
- Trailing commas in multi-line objects/arrays

### TypeScript Configuration

- Extends `@tsconfig/bun`
- JSX preserved for Solid.js
- Custom conditions: `["browser"]`
- Path aliases: `@/*` → `./src/*`, `@tui/*` → `./src/cli/cmd/tui/*`
