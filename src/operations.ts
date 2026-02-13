import { ParsedTask, Condition, ConditionLogic } from "./types";
import { getTaskPropertyValue } from "./taskParser";

/**
 * Filters tasks by a set of conditions and returns only the matching tasks.
 */
export function filterTasksByConditions(
  tasks: ParsedTask[],
  conditions: Condition[],
  logic: ConditionLogic
): ParsedTask[] {
  if (!conditions || conditions.length === 0) return tasks;

  return tasks.filter((task) => {
    if (logic === "AND") {
      return conditions.every((cond) => evaluateCondition(task, cond));
    } else {
      return conditions.some((cond) => evaluateCondition(task, cond));
    }
  });
}

/**
 * Evaluates a single condition against a task.
 */
function evaluateCondition(task: ParsedTask, condition: Condition): boolean {
  const taskValue = getTaskPropertyValue(task, condition.property);
  const condValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return taskValue === condValue;

    case "not_equals":
      return taskValue !== condValue;

    case "contains":
      return taskValue !== null && taskValue.includes(condValue);

    case "not_contains":
      return taskValue === null || !taskValue.includes(condValue);

    case "is_empty":
      return taskValue === null || taskValue === "";

    case "is_not_empty":
      return taskValue !== null && taskValue !== "";

    case "greater_than":
      if (taskValue === null) return false;
      return taskValue > condValue;

    case "less_than":
      if (taskValue === null) return false;
      return taskValue < condValue;

    case "greater_or_equal":
      if (taskValue === null) return false;
      return taskValue >= condValue;

    case "less_or_equal":
      if (taskValue === null) return false;
      return taskValue <= condValue;

    default:
      return true;
  }
}

/**
 * Executes an operation on a list of tasks for a given property
 * and returns the result as a string suitable for frontmatter.
 * Tasks should already be filtered by conditions before calling this.
 */
export function executeOperation(
  tasks: ParsedTask[],
  taskProperty: string,
  operation: string
): string | null {
  if (tasks.length === 0) return null;

  switch (operation) {
    case "min":
      return computeMin(tasks, taskProperty);
    case "max":
      return computeMax(tasks, taskProperty);
    case "count":
      return computeCount(tasks, taskProperty);
    case "count_all":
      return String(tasks.length);
    case "count_done":
      return String(tasks.filter((t) => t.isDone).length);
    case "count_open":
      return String(tasks.filter((t) => !t.isDone).length);
    case "percentage_done":
      return computePercentageDone(tasks);
    case "list":
      return computeList(tasks, taskProperty);
    case "first":
      return computeFirst(tasks, taskProperty);
    case "last":
      return computeLast(tasks, taskProperty);
    default:
      return null;
  }
}

/**
 * Returns the minimum value of a task property across all tasks.
 * For dates, this means the earliest date.
 */
function computeMin(tasks: ParsedTask[], property: string): string | null {
  const values = getPropertyValues(tasks, property);
  if (values.length === 0) return null;

  // Sort lexicographically (works for YYYY-MM-DD dates and most string values)
  values.sort();
  return values[0];
}

/**
 * Returns the maximum value of a task property across all tasks.
 * For dates, this means the latest date.
 */
function computeMax(tasks: ParsedTask[], property: string): string | null {
  const values = getPropertyValues(tasks, property);
  if (values.length === 0) return null;

  values.sort();
  return values[values.length - 1];
}

/**
 * Returns the count of tasks that have this property set.
 */
function computeCount(tasks: ParsedTask[], property: string): string {
  const values = getPropertyValues(tasks, property);
  return String(values.length);
}

/**
 * Returns the percentage of tasks that are done.
 */
function computePercentageDone(tasks: ParsedTask[]): string {
  if (tasks.length === 0) return "0";
  const doneCount = tasks.filter((t) => t.isDone).length;
  const percentage = Math.round((doneCount / tasks.length) * 100);
  return String(percentage);
}

/**
 * Returns a comma-separated list of all values for a property.
 */
function computeList(tasks: ParsedTask[], property: string): string | null {
  const values = getPropertyValues(tasks, property);
  if (values.length === 0) return null;
  return values.join(", ");
}

/**
 * Returns the first occurrence of a property value.
 */
function computeFirst(tasks: ParsedTask[], property: string): string | null {
  for (const task of tasks) {
    const value = getTaskPropertyValue(task, property);
    if (value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

/**
 * Returns the last occurrence of a property value.
 */
function computeLast(tasks: ParsedTask[], property: string): string | null {
  for (let i = tasks.length - 1; i >= 0; i--) {
    const value = getTaskPropertyValue(tasks[i], property);
    if (value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

/**
 * Collects all non-null values of a property from all tasks.
 */
function getPropertyValues(tasks: ParsedTask[], property: string): string[] {
  const values: string[] = [];
  for (const task of tasks) {
    const value = getTaskPropertyValue(task, property);
    if (value !== null && value !== "") {
      values.push(value);
    }
  }
  return values;
}
