/**
 * Time-of-day hello in the app's voice. Pure over the given local time so
 * clients compute it once on mount; nothing here ticks. The expression names
 * a subset of the web `CatFace` set so mobile can map it to a glyph too.
 */
export type GreetingExpression = "happy" | "sleepy";

export interface Greeting {
  readonly text: string;
  readonly expression: GreetingExpression;
}

const MORNING: Greeting = { text: "good morning, mrrp", expression: "happy" };
const AFTERNOON: Greeting = { text: "good afternoon :3", expression: "happy" };
const EVENING: Greeting = { text: "good evening, purr", expression: "happy" };
const LATE: Greeting = { text: "late one, mrrp", expression: "sleepy" };

export function greeting(now: Date): Greeting {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return MORNING;
  if (hour >= 12 && hour < 17) return AFTERNOON;
  if (hour >= 17 && hour < 22) return EVENING;
  return LATE;
}
