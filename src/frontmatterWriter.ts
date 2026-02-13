import { App, TFile } from "obsidian";

/**
 * Updates a single frontmatter property in a file.
 * Uses Obsidian's processFrontMatter API for safe YAML handling.
 *
 * @param app - The Obsidian App instance
 * @param file - The file to update
 * @param key - The frontmatter key to set
 * @param value - The value to set
 * @param overwriteExisting - Whether to overwrite if a value already exists
 */
export async function updateFrontmatterProperty(
  app: App,
  file: TFile,
  key: string,
  value: string | number | null,
  overwriteExisting: boolean
): Promise<boolean> {
  if (value === null || value === undefined) return false;

  let updated = false;

  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    const existingValue = frontmatter[key];

    // If overwrite is disabled and a value already exists, skip
    if (
      !overwriteExisting &&
      existingValue !== undefined &&
      existingValue !== null &&
      existingValue !== ""
    ) {
      return;
    }

    // Only update if the value is actually different
    const newValue = coerceValue(value);
    if (frontmatter[key] !== newValue) {
      frontmatter[key] = newValue;
      updated = true;
    }
  });

  return updated;
}

/**
 * Updates multiple frontmatter properties in a single pass.
 */
export async function updateFrontmatterProperties(
  app: App,
  file: TFile,
  updates: Array<{
    key: string;
    value: string | number | null;
    overwriteExisting: boolean;
  }>
): Promise<boolean> {
  let updated = false;

  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    for (const update of updates) {
      if (update.value === null || update.value === undefined) continue;

      const existingValue = frontmatter[update.key];

      // If overwrite is disabled and a value already exists, skip
      if (
        !update.overwriteExisting &&
        existingValue !== undefined &&
        existingValue !== null &&
        existingValue !== ""
      ) {
        continue;
      }

      const newValue = coerceValue(update.value);
      if (frontmatter[update.key] !== newValue) {
        frontmatter[update.key] = newValue;
        updated = true;
      }
    }
  });

  return updated;
}

/**
 * Coerces a value to the appropriate type for frontmatter.
 * Numbers stay as numbers, dates stay as strings, etc.
 */
function coerceValue(value: string | number): string | number {
  if (typeof value === "number") return value;

  // If it's a pure integer, convert to number
  if (/^\d+$/.test(value)) return parseInt(value, 10);

  // If it's a percentage-like number, keep as number
  if (/^\d+(\.\d+)?$/.test(value)) return parseFloat(value);

  return value;
}
