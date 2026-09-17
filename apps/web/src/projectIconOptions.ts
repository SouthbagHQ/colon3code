import { iconNames, type IconName } from "lucide-react/dynamic";
export { PROJECT_ICON_COLORS, projectIconColorClassName } from "./projectIconColors";

const POPULAR_PROJECT_ICONS = [
  "folder-code",
  "code-2",
  "terminal",
  "globe-2",
  "server",
  "database",
  "bot",
  "sparkles",
  "smartphone",
  "monitor",
  "cloud-cog",
  "package",
  "book-open",
  "flask-conical",
  "shield-check",
  "rocket",
  "gamepad-2",
  "music",
  "image",
  "shopping-bag",
  "git-branch",
  "workflow",
  "wrench",
  "layers-3",
] as const satisfies ReadonlyArray<IconName>;

export const PROJECT_EMOJIS: ReadonlyArray<{ readonly emoji: string; readonly label: string }> = [
  { emoji: "💻", label: "computer" },
  { emoji: "🛠️", label: "tools" },
  { emoji: "🚀", label: "rocket" },
  { emoji: "🤖", label: "robot" },
  { emoji: "✨", label: "sparkles" },
  { emoji: "⚡", label: "lightning" },
  { emoji: "🌐", label: "web" },
  { emoji: "📱", label: "mobile" },
  { emoji: "🖥️", label: "desktop" },
  { emoji: "⌨️", label: "keyboard" },
  { emoji: "⚙️", label: "gear" },
  { emoji: "🗄️", label: "database" },
  { emoji: "☁️", label: "cloud" },
  { emoji: "📦", label: "package" },
  { emoji: "📚", label: "books" },
  { emoji: "🧪", label: "test tube" },
  { emoji: "🔒", label: "lock" },
  { emoji: "🎮", label: "game" },
  { emoji: "🎵", label: "music" },
  { emoji: "🎬", label: "movie" },
  { emoji: "🖼️", label: "picture" },
  { emoji: "🛍️", label: "shopping" },
  { emoji: "🔥", label: "fire" },
  { emoji: "💡", label: "idea" },
  { emoji: "🧩", label: "puzzle" },
  { emoji: "📊", label: "chart" },
  { emoji: "🧠", label: "brain" },
  { emoji: "🦄", label: "unicorn" },
  { emoji: "🐙", label: "octopus" },
  { emoji: "🌱", label: "seedling" },
];

export function filterProjectIconNames(query: string): ReadonlyArray<IconName> {
  const normalized = query.trim().toLowerCase().replaceAll(/\s+/g, "-");
  if (!normalized) return POPULAR_PROJECT_ICONS;
  return iconNames.filter((name) => name.includes(normalized)).slice(0, 60);
}

export function firstEmoji(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const segments = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed);
  const segment = segments[Symbol.iterator]().next().value?.segment;
  const isFlag = /^\p{Regional_Indicator}{2}$/u.test(segment ?? "");
  const isKeycap = /^[#*0-9]\uFE0F?\u20E3$/u.test(segment ?? "");
  if (!segment || (!/\p{Extended_Pictographic}/u.test(segment) && !isFlag && !isKeycap)) {
    return null;
  }
  return segment;
}
