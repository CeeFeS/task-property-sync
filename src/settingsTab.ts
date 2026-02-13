import {
  App,
  PluginSettingTab,
  Setting,
  Notice,
} from "obsidian";
import type TaskPropertyPlugin from "./main";
import {
  TaskPropertyPluginSettings,
  DirectMapping,
  OperationMapping,
  TaskProperty,
  OperationType,
  ConditionOperator,
  ConditionLogic,
  Condition,
  TASK_PROPERTY_LABELS,
  OPERATION_LABELS,
  CONDITION_OPERATOR_LABELS,
} from "./types";

/**
 * Available task properties for dropdowns.
 */
const TASK_PROPERTIES: TaskProperty[] = [
  "due_date",
  "scheduled_date",
  "start_date",
  "created_date",
  "done_date",
  "recurrence",
  "priority",
  "status",
  "description",
];

/**
 * Available operations for dropdowns.
 */
const OPERATIONS: OperationType[] = [
  "min",
  "max",
  "count",
  "count_all",
  "count_done",
  "count_open",
  "percentage_done",
  "list",
  "first",
  "last",
];

/**
 * Available condition operators for dropdowns.
 */
const CONDITION_OPERATORS: ConditionOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
  "greater_than",
  "less_than",
  "greater_or_equal",
  "less_or_equal",
];

/**
 * Operators that don't need a comparison value.
 */
const VALUE_LESS_OPERATORS: ConditionOperator[] = ["is_empty", "is_not_empty"];

/**
 * Generates a unique ID for mappings.
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export class TaskPropertySettingTab extends PluginSettingTab {
  plugin: TaskPropertyPlugin;

  constructor(app: App, plugin: TaskPropertyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ──────────────── Header ────────────────
    containerEl.createEl("h1", { text: "TaskPropertyPlugin Settings" });
    containerEl.createEl("p", {
      text: "Automatically sync task properties from the Tasks plugin into frontmatter properties of your markdown files.",
      cls: "setting-item-description",
    });

    // ──────────────── General Settings ────────────────
    containerEl.createEl("h2", { text: "General" });

    new Setting(containerEl)
      .setName("Process on file modify")
      .setDesc(
        "Automatically process files when they are modified. If disabled, you can still trigger processing manually via the command palette."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.processOnModify)
          .onChange(async (value) => {
            this.plugin.settings.processOnModify = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Debounce delay (ms)")
      .setDesc(
        "How long to wait after the last file change before processing (in milliseconds). Prevents excessive updates while typing."
      )
      .addText((text) =>
        text
          .setPlaceholder("1000")
          .setValue(String(this.plugin.settings.debounceDelay))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num >= 100) {
              this.plugin.settings.debounceDelay = num;
              await this.plugin.saveSettings();
            }
          })
      );

    // ──────────────── Manual Processing ────────────────
    new Setting(containerEl)
      .setName("Process all files now")
      .setDesc(
        "Manually trigger processing of all markdown files in the vault (respecting excluded folders)."
      )
      .addButton((button) =>
        button.setButtonText("Process All Files").onClick(async () => {
          const count = await this.plugin.processor.processAllFiles();
          new Notice(`TaskPropertyPlugin: Processed ${count} files.`);
        })
      );

    // ──────────────── Excluded Folders ────────────────
    containerEl.createEl("h2", { text: "Excluded Folders" });
    containerEl.createEl("p", {
      text: "Files in these folders will not be processed. Enter folder paths relative to the vault root, one per line.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Folder paths to exclude (one per line)")
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder("templates/\narchive/old-notes/")
          .setValue(this.plugin.settings.excludedFolders.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.excludedFolders = value
              .split("\n")
              .map((f) => f.trim())
              .filter((f) => f.length > 0);
            await this.plugin.saveSettings();
          });
        textArea.inputEl.rows = 4;
        textArea.inputEl.cols = 40;
      });

    // ──────────────── Direct Mappings ────────────────
    containerEl.createEl("h2", { text: "Direct Property Mappings" });
    containerEl.createEl("p", {
      text: "Map a task property directly to a frontmatter property. The first matching value found in the file will be used.",
      cls: "setting-item-description",
    });

    // Add button for new direct mapping
    new Setting(containerEl).addButton((button) =>
      button
        .setButtonText("+ Add Direct Mapping")
        .setCta()
        .onClick(async () => {
          const newMapping: DirectMapping = {
            id: generateId(),
            taskProperty: "due_date",
            frontmatterKey: "due",
            overwriteExisting: true,
            enabled: true,
          };
          this.plugin.settings.directMappings.push(newMapping);
          await this.plugin.saveSettings();
          this.display();
        })
    );

    // Render each direct mapping
    for (let i = 0; i < this.plugin.settings.directMappings.length; i++) {
      this.renderDirectMapping(containerEl, i);
    }

    // ──────────────── Operation Mappings ────────────────
    containerEl.createEl("h2", { text: "Operation Mappings" });
    containerEl.createEl("p", {
      text: "Apply an operation (min, max, count, percentage, etc.) across all tasks in a file and write the result to a frontmatter property.",
      cls: "setting-item-description",
    });

    // Add button for new operation mapping
    new Setting(containerEl).addButton((button) =>
      button
        .setButtonText("+ Add Operation Mapping")
        .setCta()
        .onClick(async () => {
          const newMapping: OperationMapping = {
            id: generateId(),
            taskProperty: "scheduled_date",
            operation: "min",
            frontmatterKey: "scheduled_task",
            overwriteExisting: true,
            enabled: true,
            conditions: [],
            conditionLogic: "AND",
          };
          this.plugin.settings.operationMappings.push(newMapping);
          await this.plugin.saveSettings();
          this.display();
        })
    );

    // Render each operation mapping
    for (let i = 0; i < this.plugin.settings.operationMappings.length; i++) {
      this.renderOperationMapping(containerEl, i);
    }
  }

  /**
   * Renders a single direct mapping in the settings UI.
   */
  private renderDirectMapping(containerEl: HTMLElement, index: number): void {
    const mapping = this.plugin.settings.directMappings[index];
    const wrapper = containerEl.createDiv({ cls: "tpp-mapping-container" });

    // Styling
    wrapper.style.border = "1px solid var(--background-modifier-border)";
    wrapper.style.borderRadius = "8px";
    wrapper.style.padding = "12px";
    wrapper.style.marginBottom = "10px";
    wrapper.style.backgroundColor = "var(--background-secondary)";

    // Header row with enable toggle and delete button
    new Setting(wrapper)
      .setName(`Direct Mapping #${index + 1}`)
      .addToggle((toggle) =>
        toggle
          .setTooltip("Enable/disable this mapping")
          .setValue(mapping.enabled)
          .onChange(async (value) => {
            mapping.enabled = value;
            await this.plugin.saveSettings();
          })
      )
      .addExtraButton((button) =>
        button
          .setIcon("trash")
          .setTooltip("Delete this mapping")
          .onClick(async () => {
            this.plugin.settings.directMappings.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // Task property selector
    new Setting(wrapper)
      .setName("Task property")
      .setDesc("Which task property to extract")
      .addDropdown((dropdown) => {
        for (const prop of TASK_PROPERTIES) {
          dropdown.addOption(prop, TASK_PROPERTY_LABELS[prop]);
        }
        dropdown.setValue(mapping.taskProperty);
        dropdown.onChange(async (value) => {
          mapping.taskProperty = value as TaskProperty;
          await this.plugin.saveSettings();
        });
      });

    // Frontmatter key
    new Setting(wrapper)
      .setName("Frontmatter property name")
      .setDesc("The name of the frontmatter property to write to")
      .addText((text) =>
        text
          .setPlaceholder("e.g., due")
          .setValue(mapping.frontmatterKey)
          .onChange(async (value) => {
            mapping.frontmatterKey = value.trim();
            await this.plugin.saveSettings();
          })
      );

    // Overwrite toggle
    new Setting(wrapper)
      .setName("Overwrite existing values")
      .setDesc(
        "If enabled, existing frontmatter values will be overwritten. If disabled, only empty/missing properties will be set."
      )
      .addToggle((toggle) =>
        toggle.setValue(mapping.overwriteExisting).onChange(async (value) => {
          mapping.overwriteExisting = value;
          await this.plugin.saveSettings();
        })
      );
  }

  /**
   * Renders a single operation mapping in the settings UI.
   */
  private renderOperationMapping(
    containerEl: HTMLElement,
    index: number
  ): void {
    const mapping = this.plugin.settings.operationMappings[index];

    // Ensure conditions array exists (migration safety for old settings)
    if (!mapping.conditions) mapping.conditions = [];
    if (!mapping.conditionLogic) mapping.conditionLogic = "AND";

    const wrapper = containerEl.createDiv({ cls: "tpp-mapping-container" });

    // Styling
    wrapper.style.border = "1px solid var(--background-modifier-border)";
    wrapper.style.borderRadius = "8px";
    wrapper.style.padding = "12px";
    wrapper.style.marginBottom = "10px";
    wrapper.style.backgroundColor = "var(--background-secondary)";

    // Header row
    new Setting(wrapper)
      .setName(`Operation Mapping #${index + 1}`)
      .addToggle((toggle) =>
        toggle
          .setTooltip("Enable/disable this mapping")
          .setValue(mapping.enabled)
          .onChange(async (value) => {
            mapping.enabled = value;
            await this.plugin.saveSettings();
          })
      )
      .addExtraButton((button) =>
        button
          .setIcon("trash")
          .setTooltip("Delete this mapping")
          .onClick(async () => {
            this.plugin.settings.operationMappings.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // Task property selector
    new Setting(wrapper)
      .setName("Task property")
      .setDesc("Which task property to apply the operation on")
      .addDropdown((dropdown) => {
        for (const prop of TASK_PROPERTIES) {
          dropdown.addOption(prop, TASK_PROPERTY_LABELS[prop]);
        }
        dropdown.setValue(mapping.taskProperty);
        dropdown.onChange(async (value) => {
          mapping.taskProperty = value as TaskProperty;
          await this.plugin.saveSettings();
        });
      });

    // Operation selector
    new Setting(wrapper)
      .setName("Operation")
      .setDesc("The operation to apply across all tasks in the file")
      .addDropdown((dropdown) => {
        for (const op of OPERATIONS) {
          dropdown.addOption(op, OPERATION_LABELS[op]);
        }
        dropdown.setValue(mapping.operation);
        dropdown.onChange(async (value) => {
          mapping.operation = value as OperationType;
          await this.plugin.saveSettings();
        });
      });

    // Frontmatter key
    new Setting(wrapper)
      .setName("Frontmatter property name")
      .setDesc("The name of the frontmatter property to write the result to")
      .addText((text) =>
        text
          .setPlaceholder("e.g., scheduled_task")
          .setValue(mapping.frontmatterKey)
          .onChange(async (value) => {
            mapping.frontmatterKey = value.trim();
            await this.plugin.saveSettings();
          })
      );

    // Overwrite toggle
    new Setting(wrapper)
      .setName("Overwrite existing values")
      .setDesc(
        "If enabled, existing frontmatter values will be overwritten. If disabled, only empty/missing properties will be set."
      )
      .addToggle((toggle) =>
        toggle.setValue(mapping.overwriteExisting).onChange(async (value) => {
          mapping.overwriteExisting = value;
          await this.plugin.saveSettings();
        })
      );

    // ──────────────── Conditions Section ────────────────
    this.renderConditionsSection(wrapper, mapping);
  }

  /**
   * Renders the conditions section within an operation mapping.
   */
  private renderConditionsSection(
    parentEl: HTMLElement,
    mapping: OperationMapping
  ): void {
    const condSection = parentEl.createDiv({ cls: "tpp-conditions-section" });
    condSection.style.marginTop = "8px";
    condSection.style.borderTop = "1px solid var(--background-modifier-border)";
    condSection.style.paddingTop = "8px";

    // Conditions header with logic toggle and add button
    const condHeaderSetting = new Setting(condSection)
      .setName("Conditions")
      .setDesc(
        mapping.conditions.length === 0
          ? "No conditions — all tasks will be included. Add conditions to filter which tasks are considered."
          : `${mapping.conditions.length} condition(s) applied. Only tasks matching ${mapping.conditionLogic === "AND" ? "ALL" : "ANY"} conditions are included.`
      );

    // Logic toggle (only show if there are 2+ conditions)
    if (mapping.conditions.length >= 2) {
      condHeaderSetting.addDropdown((dropdown) => {
        dropdown.addOption("AND", "Match ALL (AND)");
        dropdown.addOption("OR", "Match ANY (OR)");
        dropdown.setValue(mapping.conditionLogic);
        dropdown.onChange(async (value) => {
          mapping.conditionLogic = value as ConditionLogic;
          await this.plugin.saveSettings();
          this.display();
        });
      });
    }

    condHeaderSetting.addButton((button) =>
      button.setButtonText("+ Add Condition").onClick(async () => {
        const newCondition: Condition = {
          id: generateId(),
          property: "status",
          operator: "not_equals",
          value: "x",
        };
        mapping.conditions.push(newCondition);
        await this.plugin.saveSettings();
        this.display();
      })
    );

    // Render each condition
    for (let i = 0; i < mapping.conditions.length; i++) {
      this.renderCondition(condSection, mapping, i);
    }
  }

  /**
   * Renders a single condition row within the conditions section.
   */
  private renderCondition(
    parentEl: HTMLElement,
    mapping: OperationMapping,
    condIndex: number
  ): void {
    const condition = mapping.conditions[condIndex];
    const condWrapper = parentEl.createDiv({ cls: "tpp-condition-row" });
    condWrapper.style.border = "1px dashed var(--background-modifier-border)";
    condWrapper.style.borderRadius = "6px";
    condWrapper.style.padding = "8px";
    condWrapper.style.marginBottom = "6px";
    condWrapper.style.marginLeft = "12px";
    condWrapper.style.backgroundColor = "var(--background-primary)";

    // Condition header with delete button
    new Setting(condWrapper)
      .setName(`Condition #${condIndex + 1}`)
      .addExtraButton((button) =>
        button
          .setIcon("trash")
          .setTooltip("Remove this condition")
          .onClick(async () => {
            mapping.conditions.splice(condIndex, 1);
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // Property selector
    new Setting(condWrapper)
      .setName("Property to check")
      .setDesc("Which task property to evaluate in this condition")
      .addDropdown((dropdown) => {
        for (const prop of TASK_PROPERTIES) {
          dropdown.addOption(prop, TASK_PROPERTY_LABELS[prop]);
        }
        dropdown.setValue(condition.property);
        dropdown.onChange(async (value) => {
          condition.property = value as TaskProperty;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Operator selector
    new Setting(condWrapper)
      .setName("Operator")
      .setDesc("How to compare the task property value")
      .addDropdown((dropdown) => {
        for (const op of CONDITION_OPERATORS) {
          dropdown.addOption(op, CONDITION_OPERATOR_LABELS[op]);
        }
        dropdown.setValue(condition.operator);
        dropdown.onChange(async (value) => {
          condition.operator = value as ConditionOperator;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Value field (only if operator needs a value)
    const needsValue = !VALUE_LESS_OPERATORS.includes(condition.operator);
    if (needsValue) {
      const valueSetting = new Setting(condWrapper)
        .setName("Comparison value")
        .setDesc(this.getValueHint(condition.property, condition.operator));

      // For status, offer a dropdown with common values
      if (condition.property === "status") {
        valueSetting.addDropdown((dropdown) => {
          dropdown.addOption(" ", "Open (space)");
          dropdown.addOption("x", "Done (x)");
          dropdown.addOption("X", "Done (X)");
          dropdown.addOption("/", "In Progress (/)");
          dropdown.addOption("-", "Cancelled (-)");
          // Also allow custom text
          dropdown.setValue(condition.value || " ");
          dropdown.onChange(async (value) => {
            condition.value = value;
            await this.plugin.saveSettings();
          });
        });
      } else if (condition.property === "priority") {
        valueSetting.addDropdown((dropdown) => {
          dropdown.addOption("highest", "Highest");
          dropdown.addOption("high", "High");
          dropdown.addOption("medium", "Medium");
          dropdown.addOption("low", "Low");
          dropdown.addOption("lowest", "Lowest");
          dropdown.setValue(condition.value || "medium");
          dropdown.onChange(async (value) => {
            condition.value = value;
            await this.plugin.saveSettings();
          });
        });
      } else {
        valueSetting.addText((text) =>
          text
            .setPlaceholder(this.getValuePlaceholder(condition.property))
            .setValue(condition.value)
            .onChange(async (value) => {
              condition.value = value;
              await this.plugin.saveSettings();
            })
        );
      }
    }
  }

  /**
   * Returns a helpful hint for the value field based on property and operator.
   */
  private getValueHint(property: TaskProperty, operator: ConditionOperator): string {
    const isDateProp = ["due_date", "scheduled_date", "start_date", "created_date", "done_date"].includes(property);

    if (isDateProp) {
      if (operator === "greater_than" || operator === "greater_or_equal") {
        return "Enter a date (YYYY-MM-DD). Tasks with a date after this will match.";
      }
      if (operator === "less_than" || operator === "less_or_equal") {
        return "Enter a date (YYYY-MM-DD). Tasks with a date before this will match.";
      }
      return "Enter a date in YYYY-MM-DD format.";
    }

    if (property === "status") {
      return "Select the status character to compare against.";
    }

    if (property === "priority") {
      return "Select the priority level to compare against.";
    }

    return "Enter the value to compare against.";
  }

  /**
   * Returns a placeholder for the value text field based on property type.
   */
  private getValuePlaceholder(property: TaskProperty): string {
    const isDateProp = ["due_date", "scheduled_date", "start_date", "created_date", "done_date"].includes(property);
    if (isDateProp) return "YYYY-MM-DD";
    if (property === "recurrence") return "e.g., every week";
    return "value";
  }
}
