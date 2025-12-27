# skset - LLM Skill Manager CLI

A Bun-based CLI tool for managing LLM agent skills across multiple AI coding tools (Claude Code, OpenCode, Codex, VS Code Copilot, amp). Provides centralized skill storage and distribution following the [Agent Skills open standard](https://agentskills.io/specification).

## Installation

### From Source

```bash
git clone <repository-url>
cd skset
bun install
bun run src/index.ts --help
```

### Development

```bash
# Run CLI during development
bun run dev <command>

# Build standalone binary
bun run build
```

## Quick Start

```bash
# Initialize skset
bun run dev init

# Add a skill to library
bun run dev add ./path/to/skill

# View all skills
bun run dev inventory

# Validate a skill
bun run dev validate my-skill

# Push skills to targets
bun run dev push --all
```

## Commands

### `skset init`

Initialize skset configuration and library directory.

```bash
bun run dev init
```

Creates:
- `~/.skset/config.yaml` - Configuration file
- `~/.skset/library/` - Central skill storage

### `skset add <path>`

Add a skill to the library.

```bash
# Add from local directory
bun run dev add ./my-skill

# The skill must contain a SKILL.md file with valid frontmatter
```

### `skset inventory`

List all skills across library and targets.

```bash
# List all skills everywhere
bun run dev inventory

# List library skills only
bun run dev inventory --library

# List specific target only
bun run dev inventory --target claude-code

# Output as JSON
bun run dev inventory --json
```

### `skset validate`

Validate skills against the Agent Skills specification.

```bash
# Validate a specific skill in library
bun run dev validate my-skill

# Validate a local directory
bun run dev validate ./path/to/skill

# Validate all library skills
bun run dev validate --all
```

### `skset push`

Push skills from library to targets.

```bash
# Push a single skill to all global targets
bun run dev push my-skill

# Push to specific target
bun run dev push my-skill --target claude-code

# Push to repo-local directories
bun run dev push my-skill --repo

# Push all library skills
bun run dev push --all

# Dry run - show what would happen
bun run dev push --all --dry-run

# Force overwrite without confirmation
bun run dev push my-skill --force
```

## Configuration

Default configuration is created at `~/.skset/config.yaml`:

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

## Skill Format

Skills follow the Agent Skills specification with a `SKILL.md` file containing YAML frontmatter:

```markdown
---
name: my-skill
description: A brief description of what this skill does
---

# My Skill

Instructions for the agent...
```

Required fields:
- `name`: 1-64 chars, lowercase alphanumeric + hyphens
- `description`: 1-1024 chars

Optional directories:
- `scripts/` - Helper scripts
- `references/` - Reference files
- `assets/` - Images and other assets

## Development

```bash
# Install dependencies
bun install

# Run CLI
bun run dev <command>

# Build binary
bun run build

# Run tests (when implemented)
bun test
```

## License

MIT
