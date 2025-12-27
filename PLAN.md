# skset - LLM Skill Manager CLI

## Overview

`skset` is a Bun-based CLI tool for managing LLM agent skills across multiple AI coding tools. It provides a unified interface to inventory, organize, and distribute skills that follow the [Agent Skills open standard](https://agentskills.io/specification).

## Problem Statement

Multiple AI coding tools now support the Agent Skills standard, but each uses different directory locations:

| Tool | Global Path | Repo Path |
|------|-------------|-----------|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| OpenCode | `~/.opencode/skill/` | `.opencode/skill/` |
| Codex | `~/.codex/skills/`, `/etc/codex/skills/` | `.codex/skills/` |
| VS Code Copilot | — | `.github/skills/` |

Managing skills across these tools requires manual copying and synchronization. `skset` solves this by providing a central library and distribution mechanism.

## Core Concepts

### Skill
A directory containing a `SKILL.md` file with YAML frontmatter (`name`, `description`) and markdown instructions. May optionally include `scripts/`, `references/`, and `assets/` subdirectories.

### Library
A central location (`~/.skset/library/`) where skills are stored and organized into groups.

### Target
A destination where skills can be distributed (e.g., Claude Code global, OpenCode repo-local).

### Group
A logical collection of skills that can be distributed together (e.g., "core", "work", "personal").

## Architecture

```
~/.skset/
├── config.yaml          # Configuration file
└── library/             # Central skill storage
    ├── pdf/
    │   └── SKILL.md
    ├── docx/
    │   └── SKILL.md
    └── my-custom-skill/
        ├── SKILL.md
        └── scripts/
            └── helper.py
```

## Configuration Schema

```yaml
# ~/.skset/config.yaml

# Where skills are stored centrally
library: ~/.skset/library

# Target definitions - where skills can be distributed
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

# Skill groups for batch distribution
groups:
  core:
    - pdf
    - docx
    - xlsx
    - pptx
  work:
    - company-style-guide
    - internal-api-standards
  personal:
    - my-workflow
    - custom-templates
```

## CLI Commands

### `skset init`
Initialize skset configuration and library directory.

```bash
skset init
# Creates ~/.skset/config.yaml with defaults
# Creates ~/.skset/library/
```

### `skset inventory`
List all skills found across the library and all target locations.

```bash
# List all skills everywhere
skset inventory

# List skills in a specific target
skset inventory --target claude-code

# List skills in library only
skset inventory --library

# Output as JSON
skset inventory --json
```

**Output format:**
```
Library (3 skills):
  ✓ pdf          - Extract text and tables from PDF files...
  ✓ docx         - Create and edit Word documents...
  ✓ my-workflow  - Custom development workflow...

Claude Code Global (2 skills):
  ✓ pdf          - Extract text and tables from PDF files...
  ✓ docx         - Create and edit Word documents...

OpenCode Global (0 skills):
  (empty)

Current Repo .claude/skills (1 skill):
  ✓ project-specific - Guidelines for this project...
```

### `skset add`
Add a skill to the library.

```bash
# Add from local directory
skset add ./my-skill

# Add from local directory into a group
skset add ./my-skill --group work

# Add from GitHub (future enhancement)
skset add github:anthropics/skills/pdf

# Add from current repo's skill directories
skset add --from-repo
```

**Validation on add:**
- Verify SKILL.md exists
- Validate YAML frontmatter (name, description required)
- Check name matches directory name
- Check name constraints (lowercase, hyphens only, 1-64 chars)
- Warn if skill with same name already exists in library

### `skset remove`
Remove a skill from the library.

```bash
skset remove my-skill

# Remove from group only (keep in library)
skset remove my-skill --group work
```

### `skset push`
Distribute skills from library to targets.

```bash
# Push a single skill to all targets (global locations)
skset push pdf

# Push a skill to a specific target
skset push pdf --target claude-code

# Push to repo-local directories (current working directory)
skset push pdf --repo

# Push an entire group
skset push --group core

# Push all skills in library
skset push --all

# Dry run - show what would happen
skset push --group core --dry-run

# Force overwrite without prompting
skset push pdf --force
```

**Behavior:**
- Copies entire skill directory (SKILL.md + scripts/ + references/ + assets/)
- Prompts before overwriting existing skills (unless --force)
- Creates target directories if they don't exist
- Reports what was copied where

### `skset pull`
Import skills from targets into library.

```bash
# Pull all skills from a target into library
skset pull --target claude-code

# Pull a specific skill from wherever it's found
skset pull pdf

# Pull from current repo's skill directories
skset pull --from-repo
```

### `skset validate`
Validate skills against the Agent Skills specification.

```bash
# Validate a specific skill in library
skset validate pdf

# Validate all skills in library
skset validate --all

# Validate a local directory
skset validate ./my-skill
```

**Validation checks:**
- SKILL.md exists and is valid markdown
- YAML frontmatter is valid
- `name` field: 1-64 chars, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens
- `name` matches parent directory name
- `description` field: 1-1024 chars, non-empty
- Optional fields validated if present: `license`, `compatibility` (max 500 chars), `metadata` (string key-value pairs), `allowed-tools` (space-delimited list)
- Line count warning: Warn if SKILL.md exceeds 500 lines
- Token estimate warning: Warn if SKILL.md exceeds ~5000 tokens
- File reference validation: Check referenced files exist and are one level deep

### `skset new`
Scaffold a new skill.

```bash
# Interactive skill creation
skset new

# Create with name directly
skset new my-new-skill

# Create in a specific group
skset new my-new-skill --group work
```

**Creates:**
```
~/.skset/library/my-new-skill/
├── SKILL.md        # Template with frontmatter
├── scripts/        # Empty directory
├── references/     # Empty directory
└── assets/         # Empty directory
```

**Template SKILL.md:**
```markdown
---
name: my-new-skill
description: [TODO: Describe what this skill does and when to use it]
---

# My New Skill

## Overview
[Describe the skill's purpose]

## When to Use
[Describe when an agent should invoke this skill]

## Instructions
[Step-by-step instructions for the agent]

## Examples
[Provide examples of inputs and expected outputs]
```

### `skset groups`
Manage skill groups.

```bash
# List all groups and their skills
skset groups

# Add a skill to a group
skset groups add core pdf

# Remove a skill from a group
skset groups remove core pdf

# Create a new empty group
skset groups create my-group

# Delete a group (doesn't delete skills)
skset groups delete my-group
```

### `skset config`
View or edit configuration.

```bash
# Show current config
skset config

# Open config in editor
skset config --edit

# Set a specific value
skset config set library ~/my-skills

# Add a custom target
skset config add-target my-tool --global ~/.my-tool/skills --repo .my-tool/skills
```

### `skset sync`
Show differences between library and targets (v1: status only).

```bash
# Show what differs between library and targets
skset sync --status
```

Full bidirectional sync deferred to v2.

## Implementation Details

### Technology Stack
- **Runtime:** Bun
- **Language:** TypeScript
- **CLI Framework:** Consider `commander`, `yargs`, or `citty` (Bun-native)
- **YAML Parsing:** `yaml` package
- **Markdown Parsing:** `gray-matter` for frontmatter extraction
- **File Operations:** Bun's native fs APIs
- **Output Formatting:** `chalk` or `picocolors` for colors, `cli-table3` for tables

### CLI Standards

**Exit Codes:**
- 0: Success
- 1: General error (file not found, permission denied, etc.)
- 2: Validation failure

**Output Control:**
- Respect `NO_COLOR` environment variable
- `--quiet`: Suppress non-error output
- `--verbose`: Show detailed operation logs

**Error Format:**
```
error: skill "foo" not found in library
  hint: run `skset inventory --library` to see available skills
```

### Project Structure

```
skset/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/
│   │   ├── init.ts
│   │   ├── inventory.ts
│   │   ├── add.ts
│   │   ├── remove.ts
│   │   ├── push.ts
│   │   ├── pull.ts
│   │   ├── validate.ts
│   │   ├── new.ts
│   │   ├── groups.ts
│   │   ├── config.ts
│   │   └── sync.ts
│   ├── lib/
│   │   ├── config.ts         # Config loading/saving
│   │   ├── library.ts        # Library operations
│   │   ├── targets.ts        # Target definitions and operations
│   │   ├── skills.ts         # Skill parsing and validation
│   │   ├── copy.ts           # File copy operations
│   │   └── git.ts            # Git repo detection
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   └── utils/
│       ├── paths.ts          # Path resolution utilities
│       ├── output.ts         # Console output helpers
│       └── prompts.ts        # Interactive prompts
├── package.json
├── tsconfig.json
├── bunfig.toml
└── README.md
```

### Key Type Definitions

```typescript
interface Skill {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string[];  // experimental spec field
  path: string;  // Absolute path to skill directory
  source: 'library' | 'target';
  target?: string;  // Which target it was found in
}

interface Target {
  name: string;
  global?: string;  // Global path (expanded)
  repo?: string;    // Repo-relative path
}

interface Group {
  name: string;
  skills: string[];  // Skill names
}

interface Config {
  library: string;
  targets: Record<string, Target>;
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

### Path Resolution

- Expand `~` to home directory
- Resolve repo paths relative to current working directory
- For repo paths, walk up to find git root
- Platform: macOS and Linux only for v1

### Conflict Detection

When pushing skills, detect conflicts:
1. Skill with same name exists at target
2. Compare SKILL.md content (hash or mtime)
3. If different, prompt user: overwrite / skip / diff
4. With `--force`, always overwrite
5. With `--dry-run`, just report what would happen

### Git Integration

- Detect if current directory is in a git repo
- Find git root for repo-relative paths
- Optionally suggest adding distributed skills to .gitignore (for global targets)

## Testing Strategy

### Unit Tests
- Config parsing and validation
- Skill validation logic
- Path resolution
- YAML/frontmatter parsing

### Integration Tests
- Full command execution with temp directories
- File copy operations
- Config file creation and modification

### Test Fixtures
Create sample skills with various valid/invalid configurations for testing validation logic.

## Distribution

### Binary Compilation

Use Bun's native compilation for standalone executables:

```bash
# Build for current platform
bun build ./src/index.ts --compile --outfile skset

# Cross-compile targets
bun build ./src/index.ts --compile --target=bun-darwin-arm64 --outfile dist/skset-darwin-arm64
bun build ./src/index.ts --compile --target=bun-darwin-x64 --outfile dist/skset-darwin-x64
bun build ./src/index.ts --compile --target=bun-linux-x64 --outfile dist/skset-linux-x64
bun build ./src/index.ts --compile --target=bun-linux-arm64 --outfile dist/skset-linux-arm64
```

### Homebrew Tap (Self-Hosted)

Use the same repository structure as verifi - Cask formula in `Casks/` directory:

```
skset/
├── Casks/
│   └── skset.rb          # Homebrew Cask (auto-generated on release)
├── .github/
│   └── workflows/
│       └── release.yml   # Build + release automation
└── ...
```

Installation:
```bash
brew tap <owner>/skset https://github.com/<owner>/skset
brew install skset
```

### GitHub Actions Release Workflow

Trigger on version tags (v*):

```yaml
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: bun-darwin-arm64
            artifact: skset-darwin-arm64
          - os: macos-13
            target: bun-darwin-x64
            artifact: skset-darwin-x64
          - os: ubuntu-latest
            target: bun-linux-x64
            artifact: skset-linux-x64
          - os: ubuntu-latest
            target: bun-linux-arm64
            artifact: skset-linux-arm64
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun build ./src/index.ts --compile --target=${{ matrix.target }} --outfile ${{ matrix.artifact }}
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.artifact }}
          path: ${{ matrix.artifact }}

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - name: Create archives with checksums
        run: |
          for dir in skset-*; do
            tar -czvf "${dir}.tar.gz" -C "$dir" .
            sha256sum "${dir}.tar.gz" >> checksums.txt
          done
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            *.tar.gz
            checksums.txt

  update-cask:
    needs: release
    runs-on: ubuntu-latest
    steps:
      # Generate and commit updated Casks/skset.rb with new version + SHA256s
```

### Cask Template

```ruby
cask "skset" do
  version "0.1.0"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/<owner>/skset"

  binary "skset"

  on_macos do
    on_arm do
      url "https://github.com/<owner>/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "..."
    end
    on_intel do
      url "https://github.com/<owner>/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "..."
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/<owner>/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "..."
    end
    on_arm do
      url "https://github.com/<owner>/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "..."
    end
  end

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
```

**Note on GitHub Actions:**
https://github.com/oven-sh/setup-bun is the official Bun GitHub Action. Unlike Go's GoReleaser, there's no all-in-one release action for Bun - the workflow above handles build + release manually.

## Future Enhancements (Out of Scope for v1)

1. **Remote registries** - `skset add github:user/repo/skill`
2. **Skill versioning** - Track versions, update notifications
3. **Skill dependencies** - Skills that require other skills
4. **Team sharing** - Shared remote library locations
5. **Watch mode** - Auto-sync on file changes
6. **Plugins** - Extensible target definitions

## Success Criteria

1. `skset init` creates valid config and library directory
2. `skset add ./skill` correctly imports a skill with validation
3. `skset inventory` shows skills across all locations accurately
4. `skset push --group core` distributes skills to all targets
5. `skset validate` catches all spec violations
6. Works correctly on macOS and Linux (Windows deferred)
7. Provides actionable warnings for oversized skills
8. Handles edge cases: missing directories, permission errors, invalid skills

## Development Phases

### Phase 1: Core Infrastructure
- [ ] Project setup (Bun, TypeScript, CLI framework)
- [ ] Config file loading/saving
- [ ] Skill parsing and validation
- [ ] `skset init` command
- [ ] `skset validate` command

### Phase 2: Library Management
- [ ] `skset add` command
- [ ] `skset remove` command
- [ ] `skset new` command
- [ ] `skset inventory` (library only)

### Phase 3: Distribution
- [ ] Target path resolution
- [ ] `skset push` command
- [ ] `skset pull` command
- [ ] `skset inventory` (full)
- [ ] Conflict detection

### Phase 4: Groups & Polish
- [ ] `skset groups` command
- [ ] `skset config` command
- [ ] `skset sync` command
- [ ] Shell completions (bash, zsh, fish)
- [ ] Error handling improvements
- [ ] Help text and documentation

### Phase 5: Release
- [ ] README with usage examples
- [ ] GitHub Actions release workflow (binary builds)
- [ ] Homebrew Cask formula (Casks/skset.rb)
- [ ] GitHub repository setup

