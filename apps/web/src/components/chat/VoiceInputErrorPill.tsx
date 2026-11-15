import { MICROPHONE_PERMISSION_ERROR } from "@t3tools/client-runtime/voice-input";
import { useNavigate } from "@tanstack/react-router";
import { CircleAlertIcon, XIcon } from "~/icons";

import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { VoiceInputPill } from "./VoiceInputPill";

const VOICE_ERROR_LABELS: Record<string, string> = {
  [MICROPHONE_PERMISSION_ERROR]: "mic blocked",
  "Microphone access is required for voice input.": "mic blocked",
  "This draft is no longer available.": "draft unavailable",
  "Another voice recording is already active.": "already recording",
  "Voice transcription is not available.": "voice input unavailable",
  "Voice transcription is still finishing. Try again shortly.": "still transcribing",
  "Voice transcription is not available for this language.": "language unsupported",
  "Could not prepare voice transcription.": "couldn’t start",
  "Could not start voice recording.": "couldn’t start",
  "Voice recording was interrupted.": "recording interrupted",
  "Could not finish voice recording.": "couldn’t finish",
  "Could not transcribe this recording.": "transcription failed",
  "Voice transcription on this environment failed.": "transcription failed",
  "The draft changed while voice input was running. The transcript was not added.": "draft changed",
  "No speech was detected.": "no speech heard",
  "Microphone processing failed.": "mic failed",
  "The microphone disconnected.": "mic disconnected",
};

const RETRYABLE_TRANSCRIPTIONS = new Set([
  "Could not transcribe this recording.",
  "Voice transcription on this environment failed.",
]);

export function VoiceInputErrorPill(props: {
  error: string | null;
  errorAction: "retry" | "settings" | null;
  disabled?: boolean;
  cancelShortcutLabel?: string | null;
  size?: "default" | "compact" | undefined;
  onRetry(): void;
  onDismiss(): void;
}) {
  const navigate = useNavigate();
  const message = props.error ?? "voice input failed";
  const openSettings = props.errorAction === "settings";
  const compact = props.size === "compact";
  const action = openSettings
    ? { label: "open voice settings", text: "settings" }
    : props.error && RETRYABLE_TRANSCRIPTIONS.has(props.error)
      ? { label: "retry transcription", text: "retry" }
      : { label: "record again", text: "record again" };
  return (
    <VoiceInputPill tone="error" size={props.size}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size={compact ? "icon-xs" : "icon-sm-pill"}
              variant="ghost"
              aria-label="dismiss voice input error"
              onPointerDown={(event) => event.preventDefault()}
              onClick={props.onDismiss}
              className="shrink-0"
            >
              <XIcon />
            </Button>
          }
        />
        <TooltipPopup side="top">
          dismiss
          {props.cancelShortcutLabel ? ` (${props.cancelShortcutLabel})` : ""}
        </TooltipPopup>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              role="status"
              aria-label={message}
              className="flex min-w-0 items-center gap-1.5 rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            />
          }
        >
          <CircleAlertIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">
            {(props.error && VOICE_ERROR_LABELS[props.error]) || "voice input failed"}
          </span>
        </TooltipTrigger>
        <TooltipPopup side="top">{message}</TooltipPopup>
      </Tooltip>
      {props.errorAction ? (
        <Button
          type="button"
          size={compact ? "xs" : "sm-pill"}
          variant="outline"
          aria-label={action.label}
          disabled={props.disabled}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            if (openSettings) {
              props.onDismiss();
              void navigate({ to: "/settings/voice" });
            } else {
              props.onRetry();
            }
          }}
          className="ms-auto shrink-0"
        >
          {action.text}
        </Button>
      ) : (
        <span aria-hidden className="w-1.5 shrink-0" />
      )}
    </VoiceInputPill>
  );
}
