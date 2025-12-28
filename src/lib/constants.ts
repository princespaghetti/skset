/**
 * Constants and validation rules for the Agent Skills specification
 *
 * These constants define the validation rules according to the
 * Agent Skills open standard (https://agentskills.io/specification)
 */

// Skill Name Validation
/** Minimum length for skill name */
export const SKILL_NAME_MIN_LENGTH = 1;

/** Maximum length for skill name */
export const SKILL_NAME_MAX_LENGTH = 64;

/** Regular expression pattern for valid skill names (lowercase alphanumeric + hyphens) */
export const SKILL_NAME_PATTERN = /^[a-z0-9-]+$/;

// Skill Description Validation
/** Minimum length for skill description */
export const SKILL_DESCRIPTION_MIN_LENGTH = 1;

/** Maximum length for skill description */
export const SKILL_DESCRIPTION_MAX_LENGTH = 1024;

// Optional Field Validation
/** Maximum length for optional fields (license, compatibility) */
export const SKILL_OPTIONAL_FIELD_MAX_LENGTH = 500;

// File Size Limits
/** Recommended maximum number of lines in SKILL.md file */
export const SKILL_MAX_LINES_RECOMMENDED = 500;

/** Recommended maximum number of tokens in SKILL.md file */
export const SKILL_MAX_TOKENS_RECOMMENDED = 5000;

/** Estimated characters per token for rough token counting */
export const CHARS_PER_TOKEN = 4;
