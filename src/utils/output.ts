/**
 * Console output utilities with colored formatting
 */

import pc from 'picocolors';

/**
 * Check if colors should be disabled
 */
export const colorsEnabled = !process.env.NO_COLOR;

/**
 * Print a success message
 */
export function success(message: string): void {
  console.log(colorsEnabled ? pc.green('✓') + ' ' + message : '✓ ' + message);
}

/**
 * Print an error message
 */
export function error(message: string, hint?: string): void {
  const prefix = colorsEnabled ? pc.red('error:') : 'error:';
  console.error(`${prefix} ${message}`);
  if (hint) {
    const hintPrefix = colorsEnabled ? pc.dim('  hint:') : '  hint:';
    console.error(`${hintPrefix} ${hint}`);
  }
}

/**
 * Print a warning message
 */
export function warning(message: string): void {
  const prefix = colorsEnabled ? pc.yellow('warning:') : 'warning:';
  console.warn(`${prefix} ${message}`);
}

/**
 * Print an info message
 */
export function info(message: string): void {
  console.log(message);
}

/**
 * Print a dimmed/gray message
 */
export function dim(message: string): void {
  console.log(colorsEnabled ? pc.dim(message) : message);
}

/**
 * Print a bold message
 */
export function bold(text: string): string {
  return colorsEnabled ? pc.bold(text) : text;
}

/**
 * Print a cyan/highlighted message
 */
export function highlight(text: string): string {
  return colorsEnabled ? pc.cyan(text) : text;
}
