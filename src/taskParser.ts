import { ParsedTask } from "./types";

/**
 * Regex patterns for Tasks plugin emoji-based metadata.
 * The Tasks plugin uses emoji markers followed by dates/values.
 */
const TASK_CHECKBOX_REGEX = /^(\s*[-*]\s*\[(.)\])\s*(.*)/;

// Tasks plugin emoji format
const DUE_DATE_REGEX = /📅\s*(\d{4}-\d{2}-\d{2})/;
const SCHEDULED_DATE_REGEX = /⏳\s*(\d{4}-\d{2}-\d{2})/;
const START_DATE_REGEX = /🛫\s*(\d{4}-\d{2}-\d{2})/;
const CREATED_DATE_REGEX = /➕\s*(\d{4}-\d{2}-\d{2})/;
const DONE_DATE_REGEX = /✅\s*(\d{4}-\d{2}-\d{2})/;
const RECURRENCE_REGEX = /🔁\s*([^📅⏳🛫➕✅⏫🔼🔽⏬🆔]*)/;

// Priority emojis (Tasks plugin)
const PRIORITY_HIGHEST_REGEX = /🔺/;
const PRIORITY_HIGH_REGEX = /⏫/;
const PRIORITY_MEDIUM_REGEX = /🔼/;
const PRIORITY_LOW_REGEX = /🔽/;
const PRIORITY_LOWEST_REGEX = /⏬/;

/**
 * Parses all tasks from a markdown file content.
 */
export function parseTasks(content: string): ParsedTask[] {
  const lines = content.split("\n");
  const tasks: ParsedTask[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const task = parseTaskLine(line, i);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

/**
 * Parses a single line to extract task information.
 * Returns null if the line is not a task.
 */
export function parseTaskLine(
  line: string,
  lineNumber: number
): ParsedTask | null {
  const match = line.match(TASK_CHECKBOX_REGEX);
  if (!match) return null;

  const statusChar = match[2];
  const taskContent = match[3].trim();

  // Determine completion status
  const isDone = statusChar === "x" || statusChar === "X";

  // Extract dates
  const dueDate = extractMatch(taskContent, DUE_DATE_REGEX);
  const scheduledDate = extractMatch(taskContent, SCHEDULED_DATE_REGEX);
  const startDate = extractMatch(taskContent, START_DATE_REGEX);
  const createdDate = extractMatch(taskContent, CREATED_DATE_REGEX);
  const doneDate = extractMatch(taskContent, DONE_DATE_REGEX);

  // Extract recurrence
  const recurrence = extractMatch(taskContent, RECURRENCE_REGEX);

  // Extract priority
  const priority = extractPriority(taskContent);

  // Extract description (task text without metadata)
  const description = extractDescription(taskContent);

  return {
    line,
    lineNumber,
    isDone,
    description,
    dueDate,
    scheduledDate,
    startDate,
    createdDate,
    doneDate,
    recurrence: recurrence ? recurrence.trim() : null,
    priority,
    status: statusChar,
  };
}

/**
 * Extracts the first capture group from a regex match.
 */
function extractMatch(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  return match ? match[1] : null;
}

/**
 * Extracts priority from task content.
 */
function extractPriority(text: string): string | null {
  if (PRIORITY_HIGHEST_REGEX.test(text)) return "highest";
  if (PRIORITY_HIGH_REGEX.test(text)) return "high";
  if (PRIORITY_MEDIUM_REGEX.test(text)) return "medium";
  if (PRIORITY_LOW_REGEX.test(text)) return "low";
  if (PRIORITY_LOWEST_REGEX.test(text)) return "lowest";
  return null;
}

/**
 * Extracts the description text, removing all emoji metadata.
 */
function extractDescription(taskContent: string): string {
  return taskContent
    .replace(DUE_DATE_REGEX, "")
    .replace(SCHEDULED_DATE_REGEX, "")
    .replace(START_DATE_REGEX, "")
    .replace(CREATED_DATE_REGEX, "")
    .replace(DONE_DATE_REGEX, "")
    .replace(RECURRENCE_REGEX, "")
    .replace(PRIORITY_HIGHEST_REGEX, "")
    .replace(PRIORITY_HIGH_REGEX, "")
    .replace(PRIORITY_MEDIUM_REGEX, "")
    .replace(PRIORITY_LOW_REGEX, "")
    .replace(PRIORITY_LOWEST_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gets the value of a specific task property from a parsed task.
 */
export function getTaskPropertyValue(
  task: ParsedTask,
  property: string
): string | null {
  switch (property) {
    case "due_date":
      return task.dueDate;
    case "scheduled_date":
      return task.scheduledDate;
    case "start_date":
      return task.startDate;
    case "created_date":
      return task.createdDate;
    case "done_date":
      return task.doneDate;
    case "recurrence":
      return task.recurrence;
    case "priority":
      return task.priority;
    case "status":
      return task.status;
    case "description":
      return task.description;
    default:
      return null;
  }
}
