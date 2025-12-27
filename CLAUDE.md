# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`skset` is a Bun-based CLI tool for managing LLM agent skills across multiple AI coding tools (Claude Code, OpenCode, Codex, VS Code Copilot, amp). It provides centralized skill storage and distribution following the [Agent Skills open standard](https://agentskills.io/specification).

## Development Commands

**Prerequisites:** Bun runtime installed

```bash
# Install dependencies
bun install

# Run CLI during development
bun run src/index.ts <command>

# Build standalone binary
bun build ./src/index.ts --compile --outfile skset

# Cross-compile for release
bun build ./src/index.ts --compile --target=bun-darwin-arm64 --outfile dist/skset-darwin-arm64
bun build ./src/index.ts --compile --target=bun-darwin-x64 --outfile dist/skset-darwin-x64
bun build ./src/index.ts --compile --target=bun-linux-x64 --outfile dist/skset-linux-x64
bun build ./src/index.ts --compile --target=bun-linux-arm64 --outfile dist/skset-linux-arm64

# Run tests (when implemented)
bun test
```

## Architecture

### Core Concepts

- **Skill**: Directory with `SKILL.md` (YAML frontmatter + markdown) plus optional `scripts/`, `references/`, `assets/`
- **Library**: Central storage at `~/.skset/library/` organizing skills into groups
- **Target**: Destination for skill distribution (e.g., `~/.claude/skills/`, `.github/skills/`)
- **Source**: Read-only location for skill discovery (e.g., marketplace plugin directories). Sources are shown in inventory but never used as push targets.
- **Group**: Logical skill collection for batch operations (e.g., "core", "work", "personal")

### Project Structure

```
src/
├── index.ts              # CLI entry point
├── commands/             # One file per CLI command (init, inventory, add, push, etc.)
├── lib/                  # Core business logic
│   ├── config.ts         # Config loading/saving (~/.skset/config.yaml)
│   ├── library.ts        # Library operations
│   ├── targets.ts        # Target definitions and operations
│   ├── skills.ts         # Skill parsing and validation
│   ├── copy.ts           # File copy operations
│   └── git.ts            # Git repo detection
├── types/
│   └── index.ts          # TypeScript interfaces
└── utils/
    ├── paths.ts          # Path resolution (~ expansion, repo-relative)
    ├── output.ts         # Console formatting
    └── prompts.ts        # Interactive prompts
```

### Key Types

```typescript
interface Skill {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string[];
  path: string;  // Absolute path to skill directory
  source: 'library' | 'target' | 'plugin';
  target?: string;
  readonly?: boolean;  // Prevents push operations to this skill's location
}

interface Source {
  name: string;
  path: string;  // Supports glob patterns (e.g., ~/.claude/plugins/*/*/skills)
  readonly: boolean;  // If true, shown in inventory but not a push target
}

interface Config {
  library: string;
  targets: Record<string, { global?: string; repo?: string }>;
  groups: Record<string, string[]>;
  sources?: Record<string, Omit<Source, 'name'>>;  // Read-only skill sources
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  lineCount?: number;
  estimatedTokens?: number;
}
```

## Implementation Guidelines

### Skill Validation Rules

When implementing `lib/skills.ts` validation:
- Name: 1-64 chars, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens, must match directory name
- Description: 1-1024 chars, non-empty
- YAML frontmatter: Must be valid, `name` and `description` required
- Optional fields: `license`, `compatibility` (max 500 chars), `metadata` (string key-value), `allowed-tools` (space-delimited)
- Warnings: >500 lines or ~5000 tokens in SKILL.md
- File references: Validate existence, must be one level deep

### Path Resolution

- Always expand `~` to home directory
- Resolve repo paths relative to current working directory
- Walk up directory tree to find git root for repo-relative paths
- Target platform: macOS and Linux only (v1)

### CLI Standards

- Exit codes: 0 (success), 1 (general error), 2 (validation failure)
- Respect `NO_COLOR` environment variable
- Support `--quiet`, `--verbose`, `--json` flags where appropriate
- Error format: `error: <message>\n  hint: <suggestion>`

### Conflict Handling

When pushing skills to targets:
1. Check if skill with same name exists
2. Compare content (hash or mtime)
3. Prompt: overwrite / skip / diff (unless `--force`)
4. `--dry-run` reports actions without executing

### Default Configuration

The `skset init` command creates `~/.skset/config.yaml`:

```yaml
library: ~/.skset/library
targets:
  claude-code:
    global: ~/.claude/skills
    repo: .claude/skills
  opencode:
    global: ~/.opencode/skill
    repo: .opencode/skill
  codex:
    global: ~/.codex/skills
    repo: .codex/skills
  copilot:
    repo: .github/skills
  amp:
    global: ~/.config/agents/skills
    repo: .agents/skills
groups:
  core: []
sources:
  claude-plugins:
    path: ~/.claude/plugins/marketplaces/*/*/skills
    readonly: true
```

## v1 Commands

All core CRUD and distribution commands are implemented:
- `skset init` - Initialize configuration and library
- `skset new [skill]` - Create new skill from template
- `skset add <path>` - Add skills to library (supports `--group`)
- `skset remove <skill>` - Remove skill from library (supports `--from-group`)
- `skset validate <skill>` - Validate skills against spec
- `skset inventory` - List skills across all locations (supports `--group` filter, shows group membership)
- `skset push <skill>` - Distribute skills to targets (supports `--group`)
- `skset pull <skill>` - Import skills from targets
- `skset groups` - Manage skill groups (list, create, delete, add, remove)

Read-only sources (e.g., marketplace plugins) are automatically discovered in inventory but never used as push targets.

**Configuration:** Users edit `~/.skset/config.yaml` directly - no dedicated `config` command planned.

**Sync:** Not planned - `inventory` + `push --dry-run` + groups provide equivalent functionality without additional complexity.

## Technology Stack

- **Runtime**: Bun (use native APIs for file operations)
- **Language**: TypeScript
- **CLI Framework**: `commander`
- **Prompts**: `@clack/prompts` for interactive confirmations
- **Parsing**: `yaml` for config, `gray-matter` for SKILL.md frontmatter
- **Output**: `picocolors` for colors, `cli-table3` for tables

## Distribution

The project uses a self-hosted Homebrew tap in the same repository (like verifi pattern):
- Compiled binaries stored in GitHub releases
- Homebrew Cask formula in `Casks/skset.rb`
- GitHub Actions workflow (`.github/workflows/release.yml`) triggered on `v*` tags
- Builds 4 targets: darwin-arm64, darwin-x64, linux-x64, linux-arm64
- Auto-updates Cask with new version and SHA256 checksums

Installation: `brew tap <owner>/skset && brew install skset`

### Important: Pull Before Push

**The release workflow automatically commits Cask updates to main**, so after any release you must pull/rebase before pushing new commits:

```bash
git pull --rebase  # or git pull --rebase origin main
git push
```

If you forget, you'll get a "rejected (fetch first)" error. This is expected behavior - the release workflow has updated `Casks/skset.rb` on the remote.

## Development Phases (PLAN.md)

1. **Core Infrastructure** ✅: Project setup, config handling, skill validation, `init` & `validate` commands
2. **Library Management** ✅: `add`, `remove`, `new`, `inventory` (library only)
3. **Distribution** ✅: Target resolution, `push`, `pull`, full `inventory`, conflict detection
4. **Groups & Read-Only Sources** ✅: `groups` command, group filtering, read-only source discovery
5. **Release** ✅: Documentation, GitHub Actions, Homebrew Cask

**Not Planned:**
- `config` command - Manual YAML editing is sufficient
- `sync` command - Redundant with `inventory` + `push --dry-run` + groups

**Future Enhancement (if requested):** Shell completions (bash, zsh, fish)
