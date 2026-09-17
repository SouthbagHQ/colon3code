import type { ProjectIconColor } from "@t3tools/contracts";

export const PROJECT_ICON_COLORS: ReadonlyArray<{
  readonly value: ProjectIconColor;
  readonly label: string;
  readonly className: string;
  readonly swatchClassName: string;
}> = [
  {
    value: "gray",
    label: "gray",
    className: "text-gray-600 dark:text-gray-400",
    swatchClassName: "bg-gray-500",
  },
  {
    value: "red",
    label: "red",
    className: "text-red-600 dark:text-red-400",
    swatchClassName: "bg-red-500",
  },
  {
    value: "orange",
    label: "orange",
    className: "text-orange-600 dark:text-orange-400",
    swatchClassName: "bg-orange-500",
  },
  {
    value: "amber",
    label: "amber",
    className: "text-amber-600 dark:text-amber-400",
    swatchClassName: "bg-amber-500",
  },
  {
    value: "yellow",
    label: "yellow",
    className: "text-yellow-600 dark:text-yellow-400",
    swatchClassName: "bg-yellow-500",
  },
  {
    value: "lime",
    label: "lime",
    className: "text-lime-600 dark:text-lime-400",
    swatchClassName: "bg-lime-500",
  },
  {
    value: "green",
    label: "green",
    className: "text-green-600 dark:text-green-400",
    swatchClassName: "bg-green-500",
  },
  {
    value: "emerald",
    label: "emerald",
    className: "text-emerald-600 dark:text-emerald-400",
    swatchClassName: "bg-emerald-500",
  },
  {
    value: "teal",
    label: "teal",
    className: "text-teal-600 dark:text-teal-400",
    swatchClassName: "bg-teal-500",
  },
  {
    value: "cyan",
    label: "cyan",
    className: "text-cyan-600 dark:text-cyan-400",
    swatchClassName: "bg-cyan-500",
  },
  {
    value: "sky",
    label: "sky",
    className: "text-sky-600 dark:text-sky-400",
    swatchClassName: "bg-sky-500",
  },
  {
    value: "blue",
    label: "blue",
    className: "text-blue-600 dark:text-blue-400",
    swatchClassName: "bg-blue-500",
  },
  {
    value: "indigo",
    label: "indigo",
    className: "text-indigo-600 dark:text-indigo-400",
    swatchClassName: "bg-indigo-500",
  },
  {
    value: "violet",
    label: "violet",
    className: "text-violet-600 dark:text-violet-400",
    swatchClassName: "bg-violet-500",
  },
  {
    value: "purple",
    label: "purple",
    className: "text-purple-600 dark:text-purple-400",
    swatchClassName: "bg-purple-500",
  },
  {
    value: "fuchsia",
    label: "fuchsia",
    className: "text-fuchsia-600 dark:text-fuchsia-400",
    swatchClassName: "bg-fuchsia-500",
  },
  {
    value: "pink",
    label: "pink",
    className: "text-pink-600 dark:text-pink-400",
    swatchClassName: "bg-pink-500",
  },
  {
    value: "rose",
    label: "rose",
    className: "text-rose-600 dark:text-rose-400",
    swatchClassName: "bg-rose-500",
  },
];

const PROJECT_ICON_COLOR_CLASSES = Object.fromEntries(
  PROJECT_ICON_COLORS.map(({ value, className }) => [value, className]),
) as Record<ProjectIconColor, string>;

export function projectIconColorClassName(color: ProjectIconColor): string {
  return PROJECT_ICON_COLOR_CLASSES[color];
}
