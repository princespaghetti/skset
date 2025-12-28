/**
 * Core type definitions for skset
 */

/**
 * Represents a skill following the Agent Skills specification
 */
export interface Skill {
  /** Skill name (1-64 chars, lowercase alphanumeric + hyphens) */
  name: string;
  /** Skill description (1-1024 chars) */
  description: string;
  /** Optional license identifier */
  license?: string;
  /** Optional compatibility notes (max 500 chars) */
  compatibility?: string;
  /** Optional metadata as string key-value pairs */
  metadata?: Record<string, string>;
  /** Optional experimental allowed-tools field (space-delimited list) */
  allowedTools?: string[];
  /** Absolute path to the skill directory */
  path: string;
  /** Where this skill was found */
  source: 'library' | 'target' | 'plugin';
  /** Target name if source is 'target' */
  target?: string;
  /** Whether this skill source is read-only (prevents push operations) */
  readonly?: boolean;
}

/**
 * Skill validation result
 */
export interface ValidationResult {
  /** Whether the skill passed validation */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
  /** Total line count in SKILL.md */
  lineCount?: number;
  /** Estimated token count for SKILL.md */
  estimatedTokens?: number;
}

/**
 * Target configuration for distributing skills
 */
export interface Target {
  /** Target name (e.g., 'claude-code', 'opencode') */
  name: string;
  /** Global path (e.g., ~/.claude/skills) - expanded */
  global?: string;
  /** Repo-relative path (e.g., .claude/skills) */
  repo?: string;
}

/**
 * Skill group for batch operations
 */
export interface Group {
  /** Group name (e.g., 'core', 'work', 'personal') */
  name: string;
  /** List of skill names in this group */
  skills: string[];
}

/**
 * Read-only source configuration for skill discovery
 */
export interface Source {
  /** Source name (e.g., 'claude-plugins') */
  name: string;
  /** Path to skills (supports glob patterns) */
  path: string;
  /** Whether this source is read-only (prevents push operations) */
  readonly: boolean;
}

/**
 * skset configuration schema
 */
export interface Config {
  /** Path to the central skill library */
  library: string;
  /** Map of target names to their configurations */
  targets: Record<string, Omit<Target, 'name'>>;
  /** Map of group names to skill name arrays */
  groups: Record<string, string[]>;
  /** Map of source names to their configurations (for read-only skill discovery) */
  sources?: Record<string, Omit<Source, 'name'>>;
}

/**
 * Options for the inventory command
 */
export interface InventoryOptions {
  /** Show library skills only */
  library?: boolean;
  /** Show specific target only */
  target?: string;
  /** Filter to show only skills in this group */
  group?: string;
  /** Output as JSON */
  json?: boolean;
}

/**
 * Options for the push command
 */
export interface PushOptions {
  /** Push to specific target only */
  target?: string;
  /** Push to repo-local directories */
  repo?: boolean;
  /** Push all library skills */
  all?: boolean;
  /** Push all skills in this group */
  group?: string;
  /** Dry run - show what would happen */
  dryRun?: boolean;
  /** Force overwrite without confirmation */
  force?: boolean;
}

/**
 * Options for the add command
 */
export interface AddOptions {
  /** Add skill to this group after adding to library */
  group?: string;
}

/**
 * Options for the remove command
 */
export interface RemoveOptions {
  /** Force removal without confirmation */
  force?: boolean;
  /** Remove from group only, keep in library */
  fromGroup?: string;
}

/**
 * Options for the validate command
 */
export interface ValidateOptions {
  /** Validate all library skills */
  all?: boolean;
}
