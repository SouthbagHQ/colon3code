/**
 * The app's icon set: Hugeicons (stroke-rounded, drawn a touch heavier than
 * its default) wrapped as plain components so call sites keep the descriptive
 * names they already use. A glyph swap is one line here. User-chosen project
 * icons stay on lucide because their names are persisted settings.
 */
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import * as H from "@hugeicons/core-free-icons";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";

export interface IconProps extends ComponentPropsWithoutRef<"svg">, RefAttributes<SVGSVGElement> {
  size?: string | number | undefined;
  strokeWidth?: number | undefined;
  color?: string | undefined;
}
export type IconComponent = ForwardRefExoticComponent<IconProps>;

// Hugeicons draws at 1.5 by default; keep one dial here for tuning the whole set.
const STROKE_WIDTH = 1.5;

function icon(glyph: IconSvgElement, name: string): IconComponent {
  const Component = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { strokeWidth = STROKE_WIDTH, size = 24, ...props },
    ref,
  ) {
    return (
      <HugeiconsIcon ref={ref} icon={glyph} size={size} strokeWidth={strokeWidth} {...props} />
    );
  });
  Component.displayName = name;
  return Component;
}

export const ActivityIcon = icon(H.ActivityIcon, "ActivityIcon");
export const AlarmClockIcon = icon(H.AlarmClockIcon, "AlarmClockIcon");
export const AlarmClockOffIcon = icon(H.AlarmClockOffIcon, "AlarmClockOffIcon");
export const ArchiveIcon = icon(H.ArchiveIcon, "ArchiveIcon");
export const ArrowDownIcon = icon(H.ArrowDownIcon, "ArrowDownIcon");
export const ArrowDownUpIcon = icon(H.ArrowUpDownIcon, "ArrowDownUpIcon");
export const ArrowLeftIcon = icon(H.ArrowLeftIcon, "ArrowLeftIcon");
export const ArrowRightIcon = icon(H.ArrowRightIcon, "ArrowRightIcon");
export const ArrowUpDownIcon = icon(H.ArrowUpDownIcon, "ArrowUpDownIcon");
export const ArrowUpIcon = icon(H.ArrowUpIcon, "ArrowUpIcon");
export const ArrowUpRightIcon = icon(H.ArrowUpRightIcon, "ArrowUpRightIcon");
export const BatteryIcon = icon(H.BatteryIcon, "BatteryIcon");
export const BlocksIcon = icon(H.BlocksIcon, "BlocksIcon");
export const BookOpenIcon = icon(H.BookOpenIcon, "BookOpenIcon");
export const BookmarkIcon = icon(H.BookmarkIcon, "BookmarkIcon");
export const BotIcon = icon(H.BotIcon, "BotIcon");
export const BracesIcon = icon(H.BracesIcon, "BracesIcon");
export const BrainIcon = icon(H.BrainIcon, "BrainIcon");
export const BugIcon = icon(H.BugIcon, "BugIcon");
export const CalendarArrowDownIcon = icon(H.CalendarArrowDownIcon, "CalendarArrowDownIcon");
export const CalendarArrowUpIcon = icon(H.CalendarArrowUpIcon, "CalendarArrowUpIcon");
export const CalendarIcon = icon(H.CalendarIcon, "CalendarIcon");
export const CameraIcon = icon(H.CameraIcon, "CameraIcon");
export const ChartNoAxesColumnIcon = icon(H.ChartNoAxesColumnIcon, "ChartNoAxesColumnIcon");
export const CheckIcon = icon(H.CheckIcon, "CheckIcon");
export const ChevronDownIcon = icon(H.ChevronDownIcon, "ChevronDownIcon");
export const ChevronLeftIcon = icon(H.ChevronLeftIcon, "ChevronLeftIcon");
export const ChevronRightIcon = icon(H.ChevronRightIcon, "ChevronRightIcon");
export const ChevronUpIcon = icon(H.ChevronUpIcon, "ChevronUpIcon");
export const ChevronsDownUpIcon = icon(H.ChevronsDownUpIcon, "ChevronsDownUpIcon");
export const ChevronsLeftRightEllipsisIcon = icon(
  H.ChevronsLeftRightEllipsisIcon,
  "ChevronsLeftRightEllipsisIcon",
);
export const ChevronsUpDownIcon = icon(H.UnfoldVerticalIcon, "ChevronsUpDownIcon");
export const CircleAlertIcon = icon(H.CircleAlert, "CircleAlertIcon");
export const CircleArrowUpIcon = icon(H.CircleArrowUpIcon, "CircleArrowUpIcon");
export const CircleCheckIcon = icon(H.CircleCheckIcon, "CircleCheckIcon");
export const CircleDashedIcon = icon(H.CircleDashedIcon, "CircleDashedIcon");
export const CircleDotIcon = icon(H.CircleDotIcon, "CircleDotIcon");
export const CircleIcon = icon(H.CircleIcon, "CircleIcon");
export const CircleSlashIcon = icon(H.CircleSlashIcon, "CircleSlashIcon");
export const CircleXIcon = icon(H.CircleXIcon, "CircleXIcon");
export const ClockIcon = icon(H.ClockIcon, "ClockIcon");
export const CloudDownloadIcon = icon(H.CloudDownloadIcon, "CloudDownloadIcon");
export const CloudIcon = icon(H.CloudIcon, "CloudIcon");
export const CloudUploadIcon = icon(H.CloudUploadIcon, "CloudUploadIcon");
export const CodeIcon = icon(H.CodeIcon, "CodeIcon");
export const ColumnsIcon = icon(H.Columns2, "ColumnsIcon");
export const CopyIcon = icon(H.CopyIcon, "CopyIcon");
export const CornerLeftUpIcon = icon(H.CornerLeftUpIcon, "CornerLeftUpIcon");
export const CpuIcon = icon(H.CpuIcon, "CpuIcon");
export const DatabaseIcon = icon(H.DatabaseIcon, "DatabaseIcon");
export const DownloadIcon = icon(H.DownloadIcon, "DownloadIcon");
export const EllipsisIcon = icon(H.EllipsisIcon, "EllipsisIcon");
export const ExternalLinkIcon = icon(H.ExternalLinkIcon, "ExternalLinkIcon");
export const EyeIcon = icon(H.EyeIcon, "EyeIcon");
export const EyeOffIcon = icon(H.EyeOffIcon, "EyeOffIcon");
export const FileCodeIcon = icon(H.FileCodeIcon, "FileCodeIcon");
export const FileDiffIcon = icon(H.FileDiffIcon, "FileDiffIcon");
export const FileIcon = icon(H.FileIcon, "FileIcon");
export const FileJsonIcon = icon(H.FileBracesIcon, "FileJsonIcon");
export const FileSearchIcon = icon(H.FileSearchIcon, "FileSearchIcon");
export const FileSpreadsheetIcon = icon(H.FileSpreadsheetIcon, "FileSpreadsheetIcon");
export const FileTextIcon = icon(H.FileTextIcon, "FileTextIcon");
export const FilesIcon = icon(H.FilesIcon, "FilesIcon");
export const FilmIcon = icon(H.FilmIcon, "FilmIcon");
export const FlaskConicalIcon = icon(H.FlaskConicalIcon, "FlaskConicalIcon");
export const FolderClosedIcon = icon(H.FolderClosedIcon, "FolderClosedIcon");
export const FolderCodeIcon = icon(H.FolderCodeIcon, "FolderCodeIcon");
export const FolderGit2Icon = icon(H.FolderGitTwoIcon, "FolderGit2Icon");
export const FolderGitIcon = icon(H.FolderGitIcon, "FolderGitIcon");
export const FolderIcon = icon(H.FolderIcon, "FolderIcon");
export const FolderOpenIcon = icon(H.FolderOpenIcon, "FolderOpenIcon");
export const FolderPlusIcon = icon(H.FolderPlusIcon, "FolderPlusIcon");
export const FolderTreeIcon = icon(H.FolderTreeIcon, "FolderTreeIcon");
export const GaugeIcon = icon(H.GaugeIcon, "GaugeIcon");
export const GitBranchIcon = icon(H.GitBranchIcon, "GitBranchIcon");
export const GitBranchPlusIcon = icon(H.GitBranchPlusIcon, "GitBranchPlusIcon");
export const GitCommitIcon = icon(H.GitCommitIcon, "GitCommitIcon");
export const GitMergeIcon = icon(H.GitMergeIcon, "GitMergeIcon");
export const GitPullRequestArrowIcon = icon(H.GitPullRequestArrowIcon, "GitPullRequestArrowIcon");
export const GitPullRequestClosedIcon = icon(
  H.GitPullRequestClosedIcon,
  "GitPullRequestClosedIcon",
);
export const GitPullRequestDraftIcon = icon(H.GitPullRequestDraftIcon, "GitPullRequestDraftIcon");
export const GitPullRequestIcon = icon(H.GitPullRequestIcon, "GitPullRequestIcon");
export const GlobeIcon = icon(H.GlobeIcon, "GlobeIcon");
export const HammerIcon = icon(H.HammerIcon, "HammerIcon");
export const HardDriveIcon = icon(H.HardDriveIcon, "HardDriveIcon");
export const HistoryIcon = icon(H.HistoryIcon, "HistoryIcon");
export const HomeIcon = icon(H.HomeIcon, "HomeIcon");
export const ImageIcon = icon(H.ImageIcon, "ImageIcon");
export const InfoIcon = icon(H.InfoIcon, "InfoIcon");
export const KeyboardIcon = icon(H.KeyboardIcon, "KeyboardIcon");
export const LaptopIcon = icon(H.LaptopIcon, "LaptopIcon");
export const LayersIcon = icon(H.LayersIcon, "LayersIcon");
export const LightbulbIcon = icon(H.LightbulbIcon, "LightbulbIcon");
export const LinkIcon = icon(H.LinkIcon, "LinkIcon");
export const ListChecksIcon = icon(H.ListChecksIcon, "ListChecksIcon");
export const ListFilterIcon = icon(H.ListFilterIcon, "ListFilterIcon");
export const ListTodoIcon = icon(H.ListTodoIcon, "ListTodoIcon");
export const LoaderCircleIcon = icon(H.LoaderCircleIcon, "LoaderCircleIcon");
export const LockIcon = icon(H.LockIcon, "LockIcon");
export const LockOpenIcon = icon(H.LockOpenIcon, "LockOpenIcon");
export const LogInIcon = icon(H.LogInIcon, "LogInIcon");
export const MailIcon = icon(H.MailIcon, "MailIcon");
export const MaximizeIcon = icon(H.MaximizeIcon, "MaximizeIcon");
export const MemoryStickIcon = icon(H.MemoryStickIcon, "MemoryStickIcon");
export const MessageCircleIcon = icon(H.MessageCircleIcon, "MessageCircleIcon");
export const MessageCircleQuestionIcon = icon(
  H.MessageCircleQuestionMarkIcon,
  "MessageCircleQuestionIcon",
);
export const MessageSquareIcon = icon(H.MessageSquareIcon, "MessageSquareIcon");
export const MessageSquareOffIcon = icon(H.MessageSquareOffIcon, "MessageSquareOffIcon");
export const MessageSquareWarningIcon = icon(
  H.MessageSquareWarningIcon,
  "MessageSquareWarningIcon",
);
export const MinimizeIcon = icon(H.MinimizeIcon, "MinimizeIcon");
export const MinusIcon = icon(H.MinusIcon, "MinusIcon");
export const MonitorIcon = icon(H.MonitorIcon, "MonitorIcon");
export const MoonIcon = icon(H.MoonIcon, "MoonIcon");
export const MoreVerticalIcon = icon(H.MoreVerticalIcon, "MoreVerticalIcon");
export const MousePointerClickIcon = icon(H.MousePointerClickIcon, "MousePointerClickIcon");
export const MousePointerIcon = icon(H.MousePointerIcon, "MousePointerIcon");
export const OctagonAlertIcon = icon(H.OctagonAlertIcon, "OctagonAlertIcon");
export const PackageIcon = icon(H.PackageIcon, "PackageIcon");
export const PackagePlusIcon = icon(H.PackagePlusIcon, "PackagePlusIcon");
export const PaintbrushIcon = icon(H.PaintbrushIcon, "PaintbrushIcon");
export const PaletteIcon = icon(H.PaletteIcon, "PaletteIcon");
export const PanelBottomIcon = icon(H.PanelBottomIcon, "PanelBottomIcon");
export const PanelLeftCloseIcon = icon(H.PanelLeftCloseIcon, "PanelLeftCloseIcon");
export const PanelLeftIcon = icon(H.PanelLeftIcon, "PanelLeftIcon");
export const PanelRightIcon = icon(H.PanelRightIcon, "PanelRightIcon");
export const PanelsTopLeftIcon = icon(H.PanelsTopLeftIcon, "PanelsTopLeftIcon");
export const PaperclipIcon = icon(H.PaperclipIcon, "PaperclipIcon");
export const PenLineIcon = icon(H.PenLineIcon, "PenLineIcon");
export const PencilIcon = icon(H.PencilIcon, "PencilIcon");
export const PencilRulerIcon = icon(H.PencilRulerIcon, "PencilRulerIcon");
export const PictureInPictureIcon = icon(H.PictureInPictureIcon, "PictureInPictureIcon");
export const PilcrowIcon = icon(H.PilcrowIcon, "PilcrowIcon");
export const PinIcon = icon(H.PinIcon, "PinIcon");
export const PinOffIcon = icon(H.PinOffIcon, "PinOffIcon");
export const PipetteIcon = icon(H.PipetteIcon, "PipetteIcon");
export const PlayIcon = icon(H.PlayIcon, "PlayIcon");
export const PlugIcon = icon(H.PlugIcon, "PlugIcon");
export const PlusIcon = icon(H.PlusIcon, "PlusIcon");
export const PowerIcon = icon(H.PowerIcon, "PowerIcon");
export const PresentationIcon = icon(H.PresentationIcon, "PresentationIcon");
export const QrCodeIcon = icon(H.QrCodeIcon, "QrCodeIcon");
export const QuoteIcon = icon(H.QuoteIcon, "QuoteIcon");
export const RadioTowerIcon = icon(H.RadioTowerIcon, "RadioTowerIcon");
export const RefreshCwIcon = icon(H.RefreshCwIcon, "RefreshCwIcon");
export const RotateCcwIcon = icon(H.RotateCcwIcon, "RotateCcwIcon");
export const RotateCwIcon = icon(H.RotateCwIcon, "RotateCwIcon");
export const RowsIcon = icon(H.RowsThreeIcon, "RowsIcon");
export const ScaleIcon = icon(H.ScaleIcon, "ScaleIcon");
export const SearchIcon = icon(H.SearchIcon, "SearchIcon");
export const SendIcon = icon(H.SendIcon, "SendIcon");
export const ServerIcon = icon(H.ServerIcon, "ServerIcon");
export const SettingsIcon = icon(H.SettingsIcon, "SettingsIcon");
export const ShieldQuestionIcon = icon(H.ShieldQuestionMarkIcon, "ShieldQuestionIcon");
export const SlidersHorizontalIcon = icon(H.SlidersHorizontalIcon, "SlidersHorizontalIcon");
export const SlidersIcon = icon(H.SlidersHorizontalIcon, "SlidersIcon");
export const SmartphoneIcon = icon(H.SmartphoneIcon, "SmartphoneIcon");
export const SmilePlusIcon = icon(H.SmilePlusIcon, "SmilePlusIcon");
export const SparklesIcon = icon(H.SparklesIcon, "SparklesIcon");
export const SquareIcon = icon(H.SquareIcon, "SquareIcon");
export const SquarePenIcon = icon(H.SquarePenIcon, "SquarePenIcon");
export const SquareSplitHorizontalIcon = icon(
  H.SquareSplitHorizontalIcon,
  "SquareSplitHorizontalIcon",
);
export const SquareSplitVerticalIcon = icon(H.SquareSplitVerticalIcon, "SquareSplitVerticalIcon");
export const StarIcon = icon(H.StarIcon, "StarIcon");
export const SunIcon = icon(H.SunIcon, "SunIcon");
export const TableIcon = icon(H.TableIcon, "TableIcon");
export const TagIcon = icon(H.TagIcon, "TagIcon");
export const TerminalIcon = icon(H.TerminalIcon, "TerminalIcon");
export const TerminalSquareIcon = icon(H.SquareTerminalIcon, "TerminalSquareIcon");
export const TextIcon = icon(H.TextIcon, "TextIcon");
export const TextSearchIcon = icon(H.TextSearchIcon, "TextSearchIcon");
export const TextWrapIcon = icon(H.TextWrapIcon, "TextWrapIcon");
export const TicketIcon = icon(H.TicketIcon, "TicketIcon");
export const TrashIcon = icon(H.TrashIcon, "TrashIcon");
export const TrendingDownIcon = icon(H.TrendingDownIcon, "TrendingDownIcon");
export const TrendingUpIcon = icon(H.TrendingUpIcon, "TrendingUpIcon");
export const TriangleAlertIcon = icon(H.TriangleAlertIcon, "TriangleAlertIcon");
export const UnarchiveIcon = icon(H.ArchiveXIcon, "UnarchiveIcon");
export const UndoIcon = icon(H.UndoIcon, "UndoIcon");
export const UnlinkIcon = icon(H.UnlinkIcon, "UnlinkIcon");
export const UploadIcon = icon(H.UploadIcon, "UploadIcon");
export const UserCheckIcon = icon(H.UserCheckIcon, "UserCheckIcon");
export const UserPlusIcon = icon(H.UserPlusIcon, "UserPlusIcon");
export const UserRoundIcon = icon(H.UserRoundIcon, "UserRoundIcon");
export const UsersIcon = icon(H.UsersIcon, "UsersIcon");
export const VolumeIcon = icon(H.VolumeIcon, "VolumeIcon");
export const VolumeOffIcon = icon(H.VolumeOffIcon, "VolumeOffIcon");
export const WifiOffIcon = icon(H.WifiOffIcon, "WifiOffIcon");
export const WrapTextIcon = icon(H.TextWrapIcon, "WrapTextIcon");
export const WrenchIcon = icon(H.WrenchIcon, "WrenchIcon");
export const XCircleIcon = icon(H.CircleXIcon, "XCircleIcon");
export const XIcon = icon(H.XIcon, "XIcon");
export const ZapIcon = icon(H.ZapIcon, "ZapIcon");
