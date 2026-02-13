import { App, TFile } from "obsidian";
import { TaskPropertyPluginSettings, DirectMapping, ParsedTask } from "./types";
import { parseTasks, getTaskPropertyValue } from "./taskParser";
import { executeOperation, filterTasksByConditions } from "./operations";
import { updateFrontmatterProperties } from "./frontmatterWriter";

/**
 * Main processor that coordinates task parsing, operation execution,
 * and frontmatter updates.
 */
export class TaskPropertyProcessor {
  private app: App;
  private settings: TaskPropertyPluginSettings;

  constructor(app: App, settings: TaskPropertyPluginSettings) {
    this.app = app;
    this.settings = settings;
  }

  /**
   * Updates the settings reference (called when settings change).
   */
  updateSettings(settings: TaskPropertyPluginSettings): void {
    this.settings = settings;
  }

  /**
   * Processes a single file: parses tasks, evaluates mappings and operations,
   * then updates frontmatter properties.
   */
  async processFile(file: TFile): Promise<void> {
    // Only process markdown files
    if (file.extension !== "md") return;

    // Check if file is in an excluded folder
    if (this.isExcluded(file)) return;

    // Read file content
    const content = await this.app.vault.read(file);

    // Parse all tasks from the file
    const tasks = parseTasks(content);

    // If no tasks found, skip (unless we have count operations)
    const hasCountOps = this.settings.operationMappings.some(
      (m) =>
        m.enabled &&
        (m.operation === "count_all" ||
          m.operation === "count_done" ||
          m.operation === "count_open" ||
          m.operation === "percentage_done")
    );

    if (tasks.length === 0 && !hasCountOps) return;

    // Collect all frontmatter updates
    const updates: Array<{
      key: string;
      value: string | number | null;
      overwriteExisting: boolean;
    }> = [];

    // Process direct mappings
    for (const mapping of this.settings.directMappings) {
      if (!mapping.enabled) continue;

      const directUpdates = this.processDirectMapping(mapping, tasks);
      updates.push(...directUpdates);
    }

    // Process operation mappings
    for (const mapping of this.settings.operationMappings) {
      if (!mapping.enabled) continue;

      // Apply conditions to filter tasks before running the operation
      const filteredTasks = filterTasksByConditions(
        tasks,
        mapping.conditions || [],
        mapping.conditionLogic || "AND"
      );

      const result = executeOperation(
        filteredTasks,
        mapping.taskProperty,
        mapping.operation
      );

      if (result !== null) {
        updates.push({
          key: mapping.frontmatterKey,
          value: result,
          overwriteExisting: mapping.overwriteExisting,
        });
      }
    }

    // Apply all updates
    if (updates.length > 0) {
      try {
        await updateFrontmatterProperties(this.app, file, updates);
      } catch (error) {
        console.error(
          `TaskPropertyPlugin: Error updating frontmatter for ${file.path}:`,
          error
        );
      }
    }
  }

  /**
   * Processes a direct mapping: for each task, extracts the property value.
   * For direct mappings, we use the "first non-null" value strategy by default,
   * since a file can contain multiple tasks.
   * (The operations engine handles aggregate operations.)
   */
  private processDirectMapping(
    mapping: DirectMapping,
    tasks: ParsedTask[]
  ): Array<{
    key: string;
    value: string | number | null;
    overwriteExisting: boolean;
  }> {
    const updates: Array<{
      key: string;
      value: string | number | null;
      overwriteExisting: boolean;
    }> = [];

    // For direct mappings, collect the first non-null value
    for (const task of tasks) {
      const value = getTaskPropertyValue(task, mapping.taskProperty);
      if (value !== null && value !== "") {
        updates.push({
          key: mapping.frontmatterKey,
          value: value,
          overwriteExisting: mapping.overwriteExisting,
        });
        break; // Only take the first value for direct mappings
      }
    }

    return updates;
  }

  /**
   * Processes all markdown files in the vault.
   */
  async processAllFiles(): Promise<number> {
    const files = this.app.vault.getMarkdownFiles();
    let processedCount = 0;

    for (const file of files) {
      if (!this.isExcluded(file)) {
        await this.processFile(file);
        processedCount++;
      }
    }

    return processedCount;
  }

  /**
   * Checks if a file is in an excluded folder.
   */
  private isExcluded(file: TFile): boolean {
    const filePath = file.path;
    for (const folder of this.settings.excludedFolders) {
      const normalizedFolder = folder.endsWith("/") ? folder : folder + "/";
      if (filePath.startsWith(normalizedFolder)) {
        return true;
      }
    }
    return false;
  }
}
