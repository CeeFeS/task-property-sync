import { Plugin, TFile, TAbstractFile, Notice, debounce } from "obsidian";
import {
  TaskPropertyPluginSettings,
  DEFAULT_SETTINGS,
} from "./types";
import { TaskPropertyProcessor } from "./processor";
import { TaskPropertySettingTab } from "./settingsTab";

export default class TaskPropertyPlugin extends Plugin {
  settings: TaskPropertyPluginSettings = DEFAULT_SETTINGS;
  processor: TaskPropertyProcessor;

  /** Debounced file processing to avoid excessive updates */
  private debouncedProcessFile: (file: TFile) => void;

  /** Track if we're currently updating a file to prevent re-triggering */
  private isUpdating: Set<string> = new Set();

  async onload(): Promise<void> {
    // Load settings
    await this.loadSettings();

    // Initialize processor
    this.processor = new TaskPropertyProcessor(this.app, this.settings);

    // Create debounced processor
    this.debouncedProcessFile = debounce(
      (file: TFile) => this.handleFileChange(file),
      this.settings.debounceDelay,
      true
    );

    // Register settings tab
    this.addSettingTab(new TaskPropertySettingTab(this.app, this));

    // Register commands
    this.addCommand({
      id: "process-current-file",
      name: "Process current file",
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          await this.processor.processFile(activeFile);
          new Notice("Task Property Sync: Current file processed.");
        } else {
          new Notice("Task Property Sync: No active file.");
        }
      },
    });

    this.addCommand({
      id: "process-all-files",
      name: "Process all files",
      callback: async () => {
        const count = await this.processor.processAllFiles();
        new Notice(`Task Property Sync: Processed ${count} files.`);
      },
    });

    // Register event: file modified
    this.registerEvent(
      this.app.vault.on("modify", (file: TAbstractFile) => {
        if (!this.settings.processOnModify) return;
        if (!(file instanceof TFile)) return;
        if (file.extension !== "md") return;

        // Prevent re-triggering when we're updating frontmatter
        if (this.isUpdating.has(file.path)) return;

        this.debouncedProcessFile(file);
      })
    );

    // Process current file when a file is opened
    this.registerEvent(
      this.app.workspace.on("file-open", (file: TFile | null) => {
        if (!this.settings.processOnModify) return;
        if (!file) return;
        if (file.extension !== "md") return;

        // Small delay to let the file fully load
        setTimeout(() => {
          this.handleFileChange(file);
        }, 500);
      })
    );

  }

  onunload(): void {
    // Nothing to clean up — all events are registered via registerEvent
  }

  /**
   * Handles a file change event: parses tasks and updates frontmatter.
   */
  private async handleFileChange(file: TFile): Promise<void> {
    // Guard against re-entrant calls
    if (this.isUpdating.has(file.path)) return;

    try {
      this.isUpdating.add(file.path);
      await this.processor.processFile(file);
    } catch (error) {
      console.error(
        `Task Property Sync: Error processing file ${file.path}:`,
        error
      );
    } finally {
      // Remove the guard after a short delay to prevent immediate re-trigger
      setTimeout(() => {
        this.isUpdating.delete(file.path);
      }, 200);
    }
  }

  /**
   * Loads settings from Obsidian's data store.
   */
  async loadSettings(): Promise<void> {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

    // Ensure arrays exist (in case of partial data)
    if (!Array.isArray(this.settings.directMappings)) {
      this.settings.directMappings = [];
    }
    if (!Array.isArray(this.settings.operationMappings)) {
      this.settings.operationMappings = [];
    }
    if (!Array.isArray(this.settings.excludedFolders)) {
      this.settings.excludedFolders = [];
    }
  }

  /**
   * Saves settings to Obsidian's data store.
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);

    // Update the processor with new settings
    if (this.processor) {
      this.processor.updateSettings(this.settings);
    }

    // Recreate debounced function with new delay
    this.debouncedProcessFile = debounce(
      (file: TFile) => this.handleFileChange(file),
      this.settings.debounceDelay,
      true
    );
  }
}
