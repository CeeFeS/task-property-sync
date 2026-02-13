/**
 * Represents a task property that can be extracted from Tasks plugin syntax.
 */
export type TaskProperty =
  | "due_date"
  | "scheduled_date"
  | "start_date"
  | "created_date"
  | "done_date"
  | "recurrence"
  | "priority"
  | "status"
  | "description";

/**
 * Available operations that can be applied to task properties.
 */
export type OperationType =
  | "min"         // minimum value (dates: earliest, numbers: smallest)
  | "max"         // maximum value (dates: latest, numbers: largest)
  | "count"       // count of tasks that have this property set
  | "count_all"   // count of all tasks regardless of property
  | "count_done"  // count of completed tasks
  | "count_open"  // count of open (not completed) tasks
  | "percentage_done" // percentage of completed tasks
  | "list"        // comma-separated list of all values
  | "first"       // first occurrence
  | "last";       // last occurrence

/**
 * A single direct mapping: task property -> frontmatter property.
 * When a task property changes, the value is written to the frontmatter property.
 */
export interface DirectMapping {
  id: string;
  taskProperty: TaskProperty;
  frontmatterKey: string;
  overwriteExisting: boolean;
  enabled: boolean;
}

/**
 * Comparison operators for conditions.
 */
export type ConditionOperator =
  | "equals"           // exact match
  | "not_equals"       // not equal
  | "contains"         // string contains
  | "not_contains"     // string does not contain
  | "is_empty"         // value is null/empty
  | "is_not_empty"     // value is set
  | "greater_than"     // for dates: after, for numbers: larger
  | "less_than"        // for dates: before, for numbers: smaller
  | "greater_or_equal" // >=
  | "less_or_equal";   // <=

/**
 * A single condition that filters tasks.
 * Example: { property: "status", operator: "not_equals", value: "x" }
 * means "only tasks that are NOT done".
 */
export interface Condition {
  id: string;
  property: TaskProperty;
  operator: ConditionOperator;
  /** The value to compare against. Ignored for is_empty / is_not_empty. */
  value: string;
}

/**
 * How multiple conditions are combined.
 */
export type ConditionLogic = "AND" | "OR";

/**
 * An operation-based mapping: applies an operation across all tasks
 * in the file and writes the result to the frontmatter property.
 * Optionally filtered by conditions.
 */
export interface OperationMapping {
  id: string;
  taskProperty: TaskProperty;
  operation: OperationType;
  frontmatterKey: string;
  overwriteExisting: boolean;
  enabled: boolean;
  /** Conditions to filter tasks before applying the operation */
  conditions: Condition[];
  /** How to combine multiple conditions: AND (all must match) or OR (any must match) */
  conditionLogic: ConditionLogic;
}

/**
 * Plugin settings
 */
export interface TaskPropertyPluginSettings {
  /** Direct property mappings */
  directMappings: DirectMapping[];
  /** Operation-based mappings */
  operationMappings: OperationMapping[];
  /** Folders to exclude from processing (paths relative to vault root) */
  excludedFolders: string[];
  /** Whether to process on file modify events */
  processOnModify: boolean;
  /** Debounce delay in ms for file modify events */
  debounceDelay: number;
}

export const DEFAULT_SETTINGS: TaskPropertyPluginSettings = {
  directMappings: [],
  operationMappings: [],
  excludedFolders: [],
  processOnModify: true,
  debounceDelay: 1000,
};

/**
 * Represents a parsed task from a markdown file.
 */
export interface ParsedTask {
  /** The full line text */
  line: string;
  /** Line number in the file */
  lineNumber: number;
  /** Whether the task is completed */
  isDone: boolean;
  /** The task description text (without metadata) */
  description: string;
  /** Due date (YYYY-MM-DD) */
  dueDate: string | null;
  /** Scheduled date (YYYY-MM-DD) */
  scheduledDate: string | null;
  /** Start date (YYYY-MM-DD) */
  startDate: string | null;
  /** Created date (YYYY-MM-DD) */
  createdDate: string | null;
  /** Done/completion date (YYYY-MM-DD) */
  doneDate: string | null;
  /** Recurrence rule text */
  recurrence: string | null;
  /** Priority: highest, high, medium, low, lowest */
  priority: string | null;
  /** Status character: ' ', 'x', '/', '-', etc. */
  status: string;
}

/**
 * Human-readable labels for task properties.
 */
export const TASK_PROPERTY_LABELS: Record<TaskProperty, string> = {
  due_date: "Due Date",
  scheduled_date: "Scheduled Date",
  start_date: "Start Date",
  created_date: "Created Date",
  done_date: "Done Date",
  recurrence: "Recurrence",
  priority: "Priority",
  status: "Status",
  description: "Description",
};

/**
 * Human-readable labels for operations.
 */
export const OPERATION_LABELS: Record<OperationType, string> = {
  min: "Minimum (earliest date / smallest value)",
  max: "Maximum (latest date / largest value)",
  count: "Count (tasks with this property set)",
  count_all: "Count All Tasks",
  count_done: "Count Done Tasks",
  count_open: "Count Open Tasks",
  percentage_done: "Percentage Done (%)",
  list: "List (comma-separated values)",
  first: "First Occurrence",
  last: "Last Occurrence",
};

/**
 * Human-readable labels for condition operators.
 */
export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "Equals",
  not_equals: "Not Equals",
  contains: "Contains",
  not_contains: "Not Contains",
  is_empty: "Is Empty",
  is_not_empty: "Is Not Empty",
  greater_than: "Greater Than (date: after)",
  less_than: "Less Than (date: before)",
  greater_or_equal: "Greater or Equal",
  less_or_equal: "Less or Equal",
};
