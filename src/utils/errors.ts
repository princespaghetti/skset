/**
 * Error handling utilities for skset CLI
 *
 * Provides custom error classes and error handling utilities
 * for consistent error messaging and exit codes.
 */

import * as out from './output.ts';

/**
 * Safely extract an error message from an unknown thrown value
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

/**
 * Base error class for skset-specific errors
 * Includes optional hint for user guidance
 */
export class SksetError extends Error {
  constructor(
    message: string,
    public readonly hint?: string,
    public readonly exitCode = 1
  ) {
    super(message);
    this.name = 'SksetError';
  }
}

/**
 * Validation error for skill validation failures
 * Uses exit code 2 as per CLI conventions
 */
export class ValidationError extends SksetError {
  constructor(message: string, hint?: string) {
    super(message, hint, 2);
    this.name = 'ValidationError';
  }
}

/**
 * Configuration error for invalid or missing configuration
 */
export class ConfigError extends SksetError {
  constructor(message: string, hint?: string) {
    super(message, hint, 1);
    this.name = 'ConfigError';
  }
}

/**
 * Skill not found error with helpful default hint
 */
export class SkillNotFoundError extends SksetError {
  constructor(skillName: string, hint?: string) {
    super(
      `Skill "${skillName}" not found in library`,
      hint || 'Run "skset inventory --library" to see available skills',
      1
    );
    this.name = 'SkillNotFoundError';
  }
}

/**
 * Group not found error with helpful default hint
 */
export class GroupNotFoundError extends SksetError {
  constructor(groupName: string, hint?: string) {
    super(`Group "${groupName}" does not exist`, hint || 'Run "skset groups list" to see available groups', 1);
    this.name = 'GroupNotFoundError';
  }
}

/**
 * User cancellation error (exit code 0 - not a failure)
 * Used when user cancels interactive prompts
 */
export class UserCancelledError extends SksetError {
  constructor(message = 'Operation cancelled by user') {
    super(message, undefined, 0);
    this.name = 'UserCancelledError';
  }
}

/**
 * Handle errors in command execution
 * Prints formatted error message and exits with appropriate code
 *
 * @param error - Error to handle (SksetError, Error, or unknown)
 */
export function handleError(error: unknown): never {
  if (error instanceof SksetError) {
    // Custom skset error with optional hint
    out.error(error.message, error.hint);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    // Generic JavaScript error
    out.error(error.message);
    process.exit(1);
  }

  // Unknown error type
  out.error('An unexpected error occurred', String(error));
  process.exit(1);
}

/**
 * Wrap an async command function with error handling
 *
 * Use this to wrap command action handlers in src/index.ts
 * Ensures all errors are caught and handled consistently
 *
 * @param fn - Async command function to wrap
 * @returns Wrapped function with error handling
 *
 * @example
 * ```typescript
 * program
 *   .command('add <path>')
 *   .action(withErrorHandling(async (path, options) => {
 *     await add(path, options);
 *   }));
 * ```
 */
export function withErrorHandling<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await fn(...args);
    } catch (error) {
      handleError(error);
    }
  };
}
