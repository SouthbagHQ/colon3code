/**
 * The app's icon set: Phosphor, rendered bold via the IconContext in main.tsx
 * (rounder caps and a chunkier stroke than lucide). Icons keep the descriptive
 * names call sites already use, so swapping a glyph is a one-line change here.
 * Project icons chosen by users stay on lucide (see projectIconOptions).
 */
import * as P from "@phosphor-icons/react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";

/** Phosphor's own props type omits `| undefined` on optionals, which this repo's
 * exactOptionalPropertyTypes rejects, so icons are re-typed against this one. */
export interface IconProps extends ComponentPropsWithoutRef<"svg">, RefAttributes<SVGSVGElement> {
  alt?: string | undefined;
  color?: string | undefined;
  size?: string | number | undefined;
  weight?: P.IconWeight | undefined;
  mirrored?: boolean | undefined;
}
export type IconComponent = ForwardRefExoticComponent<IconProps>;

export const ActivityIcon = P.PulseIcon as IconComponent;
export const AlarmClockIcon = P.AlarmIcon as IconComponent;
export const AlarmClockOffIcon = P.BellSlashIcon as IconComponent;
export const ArchiveIcon = P.ArchiveIcon as IconComponent;
export const ArrowDownIcon = P.ArrowDownIcon as IconComponent;
export const ArrowDownUpIcon = P.ArrowsDownUpIcon as IconComponent;
export const ArrowLeftIcon = P.ArrowLeftIcon as IconComponent;
export const ArrowRightIcon = P.ArrowRightIcon as IconComponent;
export const ArrowUpDownIcon = P.ArrowsDownUpIcon as IconComponent;
export const ArrowUpIcon = P.ArrowUpIcon as IconComponent;
export const ArrowUpRightIcon = P.ArrowUpRightIcon as IconComponent;
export const BatteryIcon = P.BatteryMediumIcon as IconComponent;
export const BlocksIcon = P.PuzzlePieceIcon as IconComponent;
export const BookOpenIcon = P.BookOpenIcon as IconComponent;
export const BookmarkIcon = P.BookmarkSimpleIcon as IconComponent;
export const BotIcon = P.RobotIcon as IconComponent;
export const BracesIcon = P.BracketsCurlyIcon as IconComponent;
export const BrainIcon = P.BrainIcon as IconComponent;
export const BugIcon = P.BugIcon as IconComponent;
export const CalendarArrowDownIcon = P.CalendarDotsIcon as IconComponent;
export const CalendarArrowUpIcon = P.CalendarDotsIcon as IconComponent;
export const CalendarIcon = P.CalendarIcon as IconComponent;
export const CameraIcon = P.CameraIcon as IconComponent;
export const ChartNoAxesColumnIcon = P.ChartBarIcon as IconComponent;
export const CheckIcon = P.CheckIcon as IconComponent;
export const ChevronDownIcon = P.CaretDownIcon as IconComponent;
export const ChevronLeftIcon = P.CaretLeftIcon as IconComponent;
export const ChevronRightIcon = P.CaretRightIcon as IconComponent;
export const ChevronUpIcon = P.CaretUpIcon as IconComponent;
export const ChevronsDownUpIcon = P.ArrowsInLineVerticalIcon as IconComponent;
export const ChevronsLeftRightEllipsisIcon = P.PlugsIcon as IconComponent;
export const ChevronsUpDownIcon = P.CaretUpDownIcon as IconComponent;
export const CircleAlertIcon = P.WarningCircleIcon as IconComponent;
export const CircleArrowUpIcon = P.ArrowCircleUpIcon as IconComponent;
export const CircleCheckIcon = P.CheckCircleIcon as IconComponent;
export const CircleDashedIcon = P.CircleDashedIcon as IconComponent;
export const CircleDotIcon = P.RadioButtonIcon as IconComponent;
export const CircleIcon = P.CircleIcon as IconComponent;
export const CircleSlashIcon = P.ProhibitIcon as IconComponent;
export const CircleXIcon = P.XCircleIcon as IconComponent;
export const ClockIcon = P.ClockIcon as IconComponent;
export const CloudDownloadIcon = P.CloudArrowDownIcon as IconComponent;
export const CloudIcon = P.CloudIcon as IconComponent;
export const CloudUploadIcon = P.CloudArrowUpIcon as IconComponent;
export const CodeIcon = P.CodeIcon as IconComponent;
export const ColumnsIcon = P.ColumnsIcon as IconComponent;
export const CopyIcon = P.CopyIcon as IconComponent;
export const CornerLeftUpIcon = P.ArrowElbowLeftUpIcon as IconComponent;
export const CpuIcon = P.CpuIcon as IconComponent;
export const DatabaseIcon = P.DatabaseIcon as IconComponent;
export const DownloadIcon = P.DownloadSimpleIcon as IconComponent;
export const EllipsisIcon = P.DotsThreeIcon as IconComponent;
export const ExternalLinkIcon = P.ArrowSquareOutIcon as IconComponent;
export const EyeIcon = P.EyeIcon as IconComponent;
export const EyeOffIcon = P.EyeSlashIcon as IconComponent;
export const FileCodeIcon = P.FileCodeIcon as IconComponent;
export const FileDiffIcon = P.GitDiffIcon as IconComponent;
export const FileIcon = P.FileIcon as IconComponent;
export const FileJsonIcon = P.FileJsIcon as IconComponent;
export const FileSearchIcon = P.FileMagnifyingGlassIcon as IconComponent;
export const FileSpreadsheetIcon = P.FileXlsIcon as IconComponent;
export const FileTextIcon = P.FileTextIcon as IconComponent;
export const FilesIcon = P.FilesIcon as IconComponent;
export const FilmIcon = P.FilmStripIcon as IconComponent;
export const FlaskConicalIcon = P.FlaskIcon as IconComponent;
export const FolderClosedIcon = P.FolderIcon as IconComponent;
export const FolderCodeIcon = P.FolderIcon as IconComponent;
export const FolderGit2Icon = P.FolderIcon as IconComponent;
export const FolderGitIcon = P.FolderIcon as IconComponent;
export const FolderIcon = P.FolderIcon as IconComponent;
export const FolderOpenIcon = P.FolderOpenIcon as IconComponent;
export const FolderPlusIcon = P.FolderPlusIcon as IconComponent;
export const FolderTreeIcon = P.TreeStructureIcon as IconComponent;
export const GaugeIcon = P.GaugeIcon as IconComponent;
export const GitBranchIcon = P.GitBranchIcon as IconComponent;
export const GitBranchPlusIcon = P.GitBranchIcon as IconComponent;
export const GitCommitIcon = P.GitCommitIcon as IconComponent;
export const GitMergeIcon = P.GitMergeIcon as IconComponent;
export const GitPullRequestArrowIcon = P.GitPullRequestIcon as IconComponent;
export const GitPullRequestClosedIcon = P.GitPullRequestIcon as IconComponent;
export const GitPullRequestDraftIcon = P.GitPullRequestIcon as IconComponent;
export const GitPullRequestIcon = P.GitPullRequestIcon as IconComponent;
export const GlobeIcon = P.GlobeIcon as IconComponent;
export const HammerIcon = P.HammerIcon as IconComponent;
export const HardDriveIcon = P.HardDriveIcon as IconComponent;
export const HistoryIcon = P.ClockCounterClockwiseIcon as IconComponent;
export const HomeIcon = P.HouseIcon as IconComponent;
export const ImageIcon = P.ImageIcon as IconComponent;
export const InfoIcon = P.InfoIcon as IconComponent;
export const KeyboardIcon = P.KeyboardIcon as IconComponent;
export const LaptopIcon = P.LaptopIcon as IconComponent;
export const LayersIcon = P.StackIcon as IconComponent;
export const LightbulbIcon = P.LightbulbIcon as IconComponent;
export const LinkIcon = P.LinkIcon as IconComponent;
export const ListChecksIcon = P.ListChecksIcon as IconComponent;
export const ListFilterIcon = P.FunnelIcon as IconComponent;
export const ListTodoIcon = P.ListChecksIcon as IconComponent;
export const LoaderCircleIcon = P.CircleNotchIcon as IconComponent;
export const LockIcon = P.LockIcon as IconComponent;
export const LockOpenIcon = P.LockOpenIcon as IconComponent;
export const LogInIcon = P.SignInIcon as IconComponent;
export const MailIcon = P.EnvelopeIcon as IconComponent;
export const MaximizeIcon = P.ArrowsOutSimpleIcon as IconComponent;
export const MemoryStickIcon = P.MemoryIcon as IconComponent;
export const MessageCircleIcon = P.ChatCircleIcon as IconComponent;
export const MessageCircleQuestionIcon = P.QuestionIcon as IconComponent;
export const MessageSquareIcon = P.ChatIcon as IconComponent;
export const MessageSquareOffIcon = P.ChatSlashIcon as IconComponent;
export const MessageSquareWarningIcon = P.ChatCenteredTextIcon as IconComponent;
export const MinimizeIcon = P.ArrowsInSimpleIcon as IconComponent;
export const MinusIcon = P.MinusIcon as IconComponent;
export const MonitorIcon = P.MonitorIcon as IconComponent;
export const MoonIcon = P.MoonIcon as IconComponent;
export const MoreVerticalIcon = P.DotsThreeVerticalIcon as IconComponent;
export const MousePointerClickIcon = P.CursorClickIcon as IconComponent;
export const MousePointerIcon = P.CursorIcon as IconComponent;
export const OctagonAlertIcon = P.WarningOctagonIcon as IconComponent;
export const PackageIcon = P.PackageIcon as IconComponent;
export const PackagePlusIcon = P.PackageIcon as IconComponent;
export const PaintbrushIcon = P.PaintBrushIcon as IconComponent;
export const PaletteIcon = P.PaletteIcon as IconComponent;
export const PanelBottomIcon = P.SquareHalfBottomIcon as IconComponent;
export const PanelLeftCloseIcon = P.SidebarSimpleIcon as IconComponent;
export const PanelLeftIcon = P.SidebarIcon as IconComponent;
export const PanelsTopLeftIcon = P.BrowsersIcon as IconComponent;
export const PaperclipIcon = P.PaperclipIcon as IconComponent;
export const PenLineIcon = P.PencilSimpleLineIcon as IconComponent;
export const PencilIcon = P.PencilSimpleIcon as IconComponent;
export const PencilRulerIcon = P.PencilRulerIcon as IconComponent;
export const PictureInPictureIcon = P.PictureInPictureIcon as IconComponent;
export const PilcrowIcon = P.ParagraphIcon as IconComponent;
export const PinIcon = P.PushPinIcon as IconComponent;
export const PinOffIcon = P.PushPinSlashIcon as IconComponent;
export const PipetteIcon = P.EyedropperIcon as IconComponent;
export const PlayIcon = P.PlayIcon as IconComponent;
export const PlugIcon = P.PlugIcon as IconComponent;
export const PlusIcon = P.PlusIcon as IconComponent;
export const PowerIcon = P.PowerIcon as IconComponent;
export const PresentationIcon = P.PresentationIcon as IconComponent;
export const QrCodeIcon = P.QrCodeIcon as IconComponent;
export const QuoteIcon = P.QuotesIcon as IconComponent;
export const RadioTowerIcon = P.BroadcastIcon as IconComponent;
export const RefreshCwIcon = P.ArrowsClockwiseIcon as IconComponent;
export const RotateCcwIcon = P.ArrowCounterClockwiseIcon as IconComponent;
export const RotateCwIcon = P.ArrowClockwiseIcon as IconComponent;
export const RowsIcon = P.RowsIcon as IconComponent;
export const ScaleIcon = P.ScalesIcon as IconComponent;
export const SearchIcon = P.MagnifyingGlassIcon as IconComponent;
export const SendIcon = P.PaperPlaneRightIcon as IconComponent;
export const ServerIcon = P.HardDrivesIcon as IconComponent;
export const SettingsIcon = P.GearIcon as IconComponent;
export const ShieldQuestionIcon = P.ShieldWarningIcon as IconComponent;
export const SlidersHorizontalIcon = P.SlidersHorizontalIcon as IconComponent;
export const SlidersIcon = P.SlidersIcon as IconComponent;
export const SmartphoneIcon = P.DeviceMobileIcon as IconComponent;
export const SmilePlusIcon = P.SmileyIcon as IconComponent;
export const SparklesIcon = P.SparkleIcon as IconComponent;
export const SquareIcon = P.SquareIcon as IconComponent;
export const SquarePenIcon = P.NotePencilIcon as IconComponent;
export const SquareSplitHorizontalIcon = P.SquareSplitHorizontalIcon as IconComponent;
export const SquareSplitVerticalIcon = P.SquareSplitVerticalIcon as IconComponent;
export const StarIcon = P.StarIcon as IconComponent;
export const SunIcon = P.SunIcon as IconComponent;
export const TableIcon = P.TableIcon as IconComponent;
export const TagIcon = P.TagIcon as IconComponent;
export const TerminalIcon = P.TerminalIcon as IconComponent;
export const TerminalSquareIcon = P.TerminalWindowIcon as IconComponent;
export const TextIcon = P.TextAlignLeftIcon as IconComponent;
export const TextSearchIcon = P.MagnifyingGlassIcon as IconComponent;
export const TextWrapIcon = P.ArrowElbowDownLeftIcon as IconComponent;
export const TicketIcon = P.TicketIcon as IconComponent;
export const TrashIcon = P.TrashIcon as IconComponent;
export const TrendingDownIcon = P.TrendDownIcon as IconComponent;
export const TrendingUpIcon = P.TrendUpIcon as IconComponent;
export const TriangleAlertIcon = P.WarningIcon as IconComponent;
export const UnarchiveIcon = P.BoxArrowUpIcon as IconComponent;
export const UndoIcon = P.ArrowUUpLeftIcon as IconComponent;
export const UnlinkIcon = P.LinkBreakIcon as IconComponent;
export const UploadIcon = P.UploadSimpleIcon as IconComponent;
export const UserCheckIcon = P.UserCheckIcon as IconComponent;
export const UserPlusIcon = P.UserPlusIcon as IconComponent;
export const UserRoundIcon = P.UserIcon as IconComponent;
export const UsersIcon = P.UsersIcon as IconComponent;
export const VolumeIcon = P.SpeakerHighIcon as IconComponent;
export const VolumeOffIcon = P.SpeakerSlashIcon as IconComponent;
export const WifiOffIcon = P.WifiSlashIcon as IconComponent;
export const WrapTextIcon = P.ArrowElbowDownLeftIcon as IconComponent;
export const WrenchIcon = P.WrenchIcon as IconComponent;
export const XCircleIcon = P.XCircleIcon as IconComponent;
export const XIcon = P.XIcon as IconComponent;
export const ZapIcon = P.LightningIcon as IconComponent;

/** Phosphor only ships the left-hand sidebar glyph; mirror it for the right panel. */
export const PanelRightIcon = forwardRef<SVGSVGElement, IconProps>(
  function PanelRightIcon(props, ref) {
    return <P.SidebarIcon ref={ref} mirrored {...(props as P.IconProps)} />;
  },
);
