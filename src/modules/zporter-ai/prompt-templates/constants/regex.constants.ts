/**
 * Optimized Regex Constants for Prompt Template Processing
 */

export const REGEX_PATTERNS = {
  /**
   * Extract placeholders with optional fallback values
   * Matches: {{userName}}, {{userName|Guest}}, {{ userName | "Default User" }}
   */
  PLACEHOLDER_WITH_FALLBACK: /{{\s*([^}|]+?)(\|[^}]*)?\s*}}/g,

  /**
   * Extract all placeholder content
   * Matches: {{userName}}, {{userName|Guest}}
   */
  PLACEHOLDER_CONTENT: /{{\s*([^}]+?)\s*}}/g,

  /**
   * Escape special regex characters
   */
  REGEX_ESCAPE_CHARS: /[.*+?^${}()|[\]\\]/g,

  /**
   * Remove quotes from fallback values
   */
  QUOTE_REMOVAL: /^["'`]|["'`]$/g,

  /**
   * Create pattern to match specific placeholder in a line
   */
  createPlaceholderInLinePattern: (placeholderName: string): RegExp => {
    const escapedName = placeholderName.replace(
      REGEX_PATTERNS.REGEX_ESCAPE_CHARS,
      '\\$&',
    );
    return new RegExp(`\\{\\{\\s*${escapedName}[^}]*\\}\\}`, 'g');
  },
} as const;

/**
 * Line processing constants (optimized)
 */
export const LINE_PROCESSING = {
  LINE_SEPARATOR: '\n',
} as const;

/**
 * Optimized helper functions
 */
export const REGEX_HELPERS = {
  /**
   * Create pattern to detect missing placeholder in line for removal
   */
  createLineRemovalPattern: (placeholderName: string): RegExp => {
    return REGEX_PATTERNS.createPlaceholderInLinePattern(placeholderName);
  },
} as const;

/**
 * Optimized line processing utilities
 */
export const LINE_HELPERS = {
  /**
   * Split template into lines
   */
  splitIntoLines: (template: string): string[] => {
    return template.split(LINE_PROCESSING.LINE_SEPARATOR);
  },

  /**
   * Join lines back into template
   */
  joinLines: (lines: string[]): string => {
    return lines.join(LINE_PROCESSING.LINE_SEPARATOR);
  },
} as const;

/**
 * Regex Pattern Explanations:
 *
 * PLACEHOLDER_WITH_FALLBACK: /{{\s*([^}|]+?)(\|[^}]*)?\s*}}/g
 * - {{ : Opening braces
 * - \s* : Optional whitespace
 * - ([^}|]+?) : Capture group 1 - placeholder name (non-greedy, not } or |)
 * - (\|[^}]*)? : Capture group 2 - optional fallback (| followed by anything except })
 * - \s* : Optional whitespace
 * - }} : Closing braces
 * - g : Global flag
 *
 * PLACEHOLDER_CONTENT: /{{\s*([^}]+?)\s*}}/g
 * - Similar but captures everything between braces as one group
 *
 * REGEX_ESCAPE_CHARS: /[.*+?^${}()|[\]\\]/g
 * - Escapes all special regex characters for safe string replacement
 *
 * createPlaceholderInLinePattern: Used to detect specific placeholders in lines for removal
 * - Dynamically creates pattern based on placeholder name
 * - Includes any fallback syntax variations
 */
