# skset - LLM Skill Manager CLI

A CLI tool for managing LLM agent skills across multiple AI coding tools (Claude Code, OpenCode, Codex, VS Code Copilot, amp). Provides centralized skill storage and distribution following the [Agent Skills open standard](https://agentskills.io/specification).

## Installation

Coming soon via Homebrew.

For now, install from source:

```bash
git clone https://github.com/princespaghetti/skset.git
cd skset
bun install
bun run dev --help
```

## Quick Start

```bash
# Initialize skset
skset init

# Create a new skill
skset new

# View all skills
skset inventory

# Push skills to targets
skset push --all
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
```

### `skset remove <skill>`

Remove a skill from the library.

```bash
skset remove my-skill
skset remove my-skill --force
```

### `skset validate [skill]`

Validate skills against the [Agent Skills specification](https://agentskills.io/specification).

```bash
skset validate my-skill
skset validate --all
```

### `skset inventory`

List all skills across library and targets.

```bash
skset inventory
skset inventory --library
skset inventory --target claude-code
skset inventory --json
```

### `skset push [skill]`

Distribute skills from library to targets.

```bash
skset push my-skill
skset push --all
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
