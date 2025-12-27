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
  source: 'library' | 'target';
  target?: string;
}

interface Config {
  library: string;
  targets: Record<string, { global?: string; repo?: string }>;
  groups: Record<string, string[]>;
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
```

## MVP Scope

The initial v1 implements core commands only:
- `skset init` - Initialize configuration and library
- `skset add <path>` - Add skills to library
- `skset inventory` - List skills across all locations
- `skset push <skill>` - Distribute skills to targets
- `skset validate <skill>` - Validate skills against spec

Deferred: `new`, `remove`, `pull`, `groups`, `config`, `sync`

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

## Development Phases (PLAN.md)

1. **Core Infrastructure**: Project setup, config handling, skill validation, `init` & `validate` commands
2. **Library Management**: `add`, `remove`, `new`, `inventory` (library only)
3. **Distribution**: Target resolution, `push`, `pull`, full `inventory`, conflict detection
4. **Groups & Polish**: `groups`, `config`, `sync`, completions, error handling
5. **Release**: Documentation, GitHub Actions, Homebrew Cask
