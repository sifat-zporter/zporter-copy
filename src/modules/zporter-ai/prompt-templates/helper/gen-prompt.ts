import { BadRequestException } from '@nestjs/common';
import {
  LINE_HELPERS,
  REGEX_HELPERS,
  REGEX_PATTERNS,
} from '../constants/regex.constants';
import {
  GeneratePromptOptionsDto,
  PlaceholderInfo,
} from '../dto/generate-prompt-options.dto';

/**
 * Optimized placeholder extraction using single regex pass
 */
export function extractPlaceholders(template: string): string[] {
  const placeholders: string[] = [];
  const regex = new RegExp(REGEX_PATTERNS.PLACEHOLDER_CONTENT.source, 'g');
  let match;

  while ((match = regex.exec(template)) !== null) {
    const name = match[1].split('|')[0].trim(); // Get name before fallback
    if (!placeholders.includes(name)) {
      placeholders.push(name);
    }
  }

  return placeholders;
}

/**
 * Get nested value from object using dot notation (optimized)
 */
function getNestedValue(context: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let value = context;

  for (const key of keys) {
    if (value?.[key] !== undefined) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Optimized fillPlaceholders - single pass processing with combined operations
 */
export function fillPlaceholders(
  template: string,
  context: Record<string, any>,
  options: GeneratePromptOptionsDto = {},
): {
  filledTemplate: string;
  placeholderDetails: PlaceholderInfo[];
  removedPlaceholders: string[];
  linesRemoved: number;
} {
  const placeholderDetails: PlaceholderInfo[] = [];
  const placeholderMap = new Map<string, PlaceholderInfo>();
  let filledTemplate = template;

  // Single regex pass to extract and process all placeholders
  const regex = new RegExp(REGEX_PATTERNS.PLACEHOLDER_WITH_FALLBACK);
  let match;

  while ((match = regex.exec(template)) !== null) {
    const placeholderName = match[1].trim();
    const fallbackPart = match[2];

    // Skip if already processed
    if (placeholderMap.has(placeholderName)) continue;

    const actualValue = getNestedValue(context, placeholderName);
    const hasValue = actualValue !== undefined && actualValue !== null;

    let finalValue = actualValue;
    let fallbackUsed = false;

    // Handle fallback
    if (!hasValue && fallbackPart) {
      finalValue = fallbackPart
        .substring(1)
        .trim()
        .replace(REGEX_PATTERNS.QUOTE_REMOVAL, '');
      fallbackUsed = true;
    }

    const placeholderInfo: PlaceholderInfo = {
      name: placeholderName,
      value: finalValue,
      fallbackUsed,
      lineRemoved: false,
    };

    placeholderMap.set(placeholderName, placeholderInfo);
    placeholderDetails.push(placeholderInfo);
  }

  // Handle line removal if enabled
  let removedPlaceholders: string[] = [];
  let linesRemoved = 0;

  if (options.removeLinesWithMissingPlaceholders) {
    const result = processLineRemoval(template, placeholderDetails);
    filledTemplate = result.processedTemplate;
    linesRemoved = result.linesRemoved;
    removedPlaceholders = result.removedPlaceholders;

    // Update lineRemoved flags
    removedPlaceholders.forEach((name) => {
      const placeholder = placeholderMap.get(name);
      if (placeholder) placeholder.lineRemoved = true;
    });
  }

  // Replace placeholders in single pass
  placeholderDetails.forEach((placeholder) => {
    if (!placeholder.lineRemoved && placeholder.value !== undefined) {
      const escapedName = placeholder.name.replace(
        REGEX_PATTERNS.REGEX_ESCAPE_CHARS,
        '\\$&',
      );
      const pattern = new RegExp(
        `\\{\\{\\s*${escapedName}(?:\\|[^}]*)?\\s*\\}\\}`,
        'g',
      );
      filledTemplate = filledTemplate.replace(
        pattern,
        String(placeholder.value),
      );
    }
  });

  // Clean up remaining placeholders in non-strict mode
  if (!options.strictMode) {
    filledTemplate = filledTemplate.replace(
      new RegExp(REGEX_PATTERNS.PLACEHOLDER_CONTENT),
      '',
    );
  }

  return {
    filledTemplate,
    placeholderDetails,
    removedPlaceholders,
    linesRemoved,
  };
}

/**
 * Optimized line removal processing
 */
function processLineRemoval(
  template: string,
  placeholderDetails: PlaceholderInfo[],
): {
  processedTemplate: string;
  linesRemoved: number;
  removedPlaceholders: string[];
} {
  // Get missing placeholders (no value and no fallback used)
  const missingPlaceholders = placeholderDetails
    .filter((p) => p.value === undefined && !p.fallbackUsed)
    .map((p) => p.name);

  if (missingPlaceholders.length === 0) {
    return {
      processedTemplate: template,
      linesRemoved: 0,
      removedPlaceholders: [],
    };
  }

  const lines = LINE_HELPERS.splitIntoLines(template);
  const removedPlaceholders: string[] = [];
  let linesRemoved = 0;

  // Filter lines and track removed placeholders
  const processedLines = lines.filter((line) => {
    for (const placeholderName of missingPlaceholders) {
      const pattern = REGEX_HELPERS.createLineRemovalPattern(placeholderName);
      if (pattern.test(line)) {
        if (!removedPlaceholders.includes(placeholderName)) {
          removedPlaceholders.push(placeholderName);
        }
        linesRemoved++;
        return false;
      }
    }
    return true;
  });

  return {
    processedTemplate: LINE_HELPERS.joinLines(processedLines),
    linesRemoved,
    removedPlaceholders,
  };
}

/**
 * Optimized validation with simplified logic
 */
export function validateRequiredPlaceholders(
  placeholderDetails: PlaceholderInfo[],
  strictMode = true,
): void {
  if (!strictMode) return;

  const missingPlaceholders = placeholderDetails.filter(
    (p) => p.value === undefined && !p.fallbackUsed && !p.lineRemoved,
  );

  if (missingPlaceholders.length > 0) {
    const missingNames = missingPlaceholders.map((p) => p.name);
    throw new BadRequestException(
      `Strict mode validation failed. Missing placeholders: ${missingNames.join(
        ', ',
      )}`,
    );
  }
}

/**
 * Validation summary
 */
export function getValidationSummary(placeholderDetails: PlaceholderInfo[]): {
  total: number;
  found: number;
  usedFallback: number;
  missing: number;
  linesRemoved: number;
  missingNames: string[];
  removedPlaceholders: string[];
  status: 'valid' | 'has_missing' | 'has_fallbacks' | 'has_removed_lines';
} {
  const total = placeholderDetails.length;
  let found = 0;
  let usedFallback = 0;
  let linesRemoved = 0;
  let missing = 0;
  const missingNames: string[] = [];
  const removedPlaceholders: string[] = [];

  // Single pass to calculate all metrics
  placeholderDetails.forEach((p) => {
    if (p.value !== undefined) found++;
    if (p.fallbackUsed) usedFallback++;
    if (p.lineRemoved) {
      linesRemoved++;
      removedPlaceholders.push(p.name);
    }
    if (p.value === undefined) {
      missing++;
      missingNames.push(p.name);
    }
  });

  let status: 'valid' | 'has_missing' | 'has_fallbacks' | 'has_removed_lines';
  if (missing > 0) {
    status = 'has_missing';
  } else if (linesRemoved > 0) {
    status = 'has_removed_lines';
  } else if (usedFallback > 0) {
    status = 'has_fallbacks';
  } else {
    status = 'valid';
  }

  return {
    total,
    found,
    usedFallback,
    missing,
    linesRemoved,
    missingNames,
    removedPlaceholders,
    status,
  };
}
