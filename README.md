# skset - Manage Your Skill Sets

**skset** (short for "skill set") is a CLI tool for managing collections of LLM agent skills across multiple AI coding tools. Organize skills into reusable sets, maintain them in a central library, and distribute them to Claude Code, OpenCode, Codex, VS Code Copilot, and amp.

Follows the [Agent Skills open standard](https://agentskills.io/specification).

## Installation

```bash
brew tap princespaghetti/skset https://github.com/princespaghetti/skset
brew install skset
```

## Core Concepts

- **Skills**: Individual agent capabilities (e.g., "dependency-evaluator", "pdf-parser")
- **Library**: Your central collection of skills at `~/.skset/library/`
- **Groups**: Named skill sets for organizing related skills (e.g., "core", "work", "personal")
- **Targets**: AI coding tools where skills are deployed (Claude Code, OpenCode, etc.)
- **Sources**: Discoverable skill locations (e.g., marketplace plugins) - read-only

Groups let you manage skill sets as units: `skset push --group work` deploys your entire work skill set.

## Quick Start

```bash
# Initialize skset
skset init

# Create a new skill
skset new my-skill

# Add it to a skill set (group)
skset add ./my-skill --group core

# View all your skills and groups
skset inventory

# Deploy your core skill set to all targets
skset push --group core
```

## Commands

### `skset init`

Initialize configuration and library.

```bash
skset init
```

### `skset new [skill]`

Create a new skill from template (interactive or with name).

```bash
skset new
skset new my-skill
```

### `skset add <path>`

Add an existing skill to the library.

```bash
skset add ./my-skill
skset add ./my-skill --group core
```

### `skset remove <skill>`

Remove a skill from the library.

```bash
skset remove my-skill
skset remove my-skill --force
skset remove my-skill --from-group work  # Remove from group only
```

### `skset validate [skill]`

Validate skills against the [Agent Skills specification](https://agentskills.io/specification).

```bash
skset validate my-skill
skset validate --all
```

### `skset inventory`

List all skills across library, targets, and sources.

```bash
skset inventory
skset inventory --library
skset inventory --target claude-code
skset inventory --group work  # Filter to show only skills in 'work' group
skset inventory --json
```

### `skset push [skill]`

Distribute skills from library to targets.

```bash
skset push my-skill
skset push --all
skset push --group work  # Push all skills in 'work' group
skset push my-skill --target claude-code
skset push my-skill --repo
skset push --all --dry-run
```

### `skset pull [skill]`

Import skills from targets into library.

```bash
skset pull my-skill
skset pull --all
skset pull --target claude-code
skset pull --all --from-repo
```

### `skset groups`

Manage skill sets (groups). Groups let you organize skills into named collections and operate on them as units.

```bash
# List all groups
skset groups
skset groups list

# Create a new group
skset groups create work

# Add skills to a group
skset groups add work dependency-evaluator
skset groups add work security-scanner

# Remove a skill from a group
skset groups remove work dependency-evaluator

# Delete a group (skills remain in library)
skset groups delete work

# Use groups with other commands
skset push --group work           # Push all skills in 'work' group
skset inventory --group work      # Show only 'work' group skills
skset add ./my-skill --group work # Add skill and assign to group
```

## Configuration

Configuration is stored at `~/.skset/config.yaml` with support for 5 targets:

- **claude-code**: `~/.claude/skills/` (global), `.claude/skills/` (repo)
- **opencode**: `~/.opencode/skill/` (global), `.opencode/skill/` (repo)
- **codex**: `~/.codex/skills/` (global), `.codex/skills/` (repo)
- **copilot**: `.github/skills/` (repo only)
- **amp**: `~/.config/agents/skills/` (global), `.agents/skills/` (repo)

## Skill Format

Skills follow the [Agent Skills specification](https://agentskills.io/specification) with a `SKILL.md` file containing YAML frontmatter and markdown instructions.

## Development

```bash
# Install dependencies
bun install

# Run CLI during development
bun run dev <command>

# Run tests
bun test

# Build standalone binary
bun run build
```
