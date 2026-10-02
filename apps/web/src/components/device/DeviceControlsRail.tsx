import { BoxIcon, CameraIcon, ChevronLeftIcon, HomeIcon, KeyboardIcon, MaximizeIcon, MoonIcon, MoreHorizontalIcon, PictureInPicture2Icon, PowerIcon, RotateCcwIcon, SlidersHorizontalIcon, SmartphoneIcon, SquareIcon, SunIcon, TypeIcon, XIcon } from "~/icons";
import type { DevicePlatform } from "@t3tools/contracts";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
} from "~/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import type { DeviceStreamHandle, DeviceViewControls } from "./DeviceStreamView";
import type { DeviceControls } from "./useDeviceControls";

/** Stable floating controls for both presentations, regardless of panel width. */
export function DeviceControlsRail(props: {
  platform: DevicePlatform;
  handle: DeviceStreamHandle | null;
  view: DeviceViewControls;
  controls: DeviceControls;
  screenshotPending: boolean;
  onScreenshot: () => void;
  toolsOpen: boolean;
  onTools: () => void;
  onFloat: () => void;
  onClose: () => void;
  onPowerOff: () => void;
}) {
  const { view, handle, controls } = props;
  const popupSide = "left";
  const settings = controls.detail?.settings;
  const inputDisabled = !handle?.inputConnected;
  const nextAppearance = settings?.appearance === "dark" ? "light" : "dark";
  return (
    <aside
      aria-label="device controls"
      data-layout="rail"
      className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-14 flex-col items-center gap-2 overflow-y-auto [justify-content:safe_center] py-3 pr-2 [scrollbar-width:none]"
    >
      <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-1 overflow-y-auto rounded-full border border-border/50 bg-background/80 p-2 shadow-sm [scrollbar-width:none]">
        <RailButton
          tooltipSide={popupSide}
          label="home"
          disabled={inputDisabled}
          onClick={() => handle?.pressButton("home")}
        >
          <HomeIcon />
        </RailButton>
        {props.platform === "android" ? (
          <>
            <RailButton
              tooltipSide={popupSide}
              label="back"
              disabled={inputDisabled}
              onClick={() => handle?.pressButton("back")}
            >
              <ChevronLeftIcon />
            </RailButton>
            <RailButton
              tooltipSide={popupSide}
              label="recents"
              disabled={inputDisabled}
              onClick={() => handle?.pressButton("recents")}
            >
              <SquareIcon />
            </RailButton>
            <Menu>
              <MenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="rotate device"
                    disabled={controls.disabled}
                  />
                }
              >
                <RotateCcwIcon />
              </MenuTrigger>
              <MenuPopup side={popupSide}>
                <MenuItem
                  onClick={() => void controls.act({ type: "setOrientation", value: "portrait" })}
                >
                  Portrait
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    void controls.act({ type: "setOrientation", value: "landscape_left" })
                  }
                >
                  Landscape
                </MenuItem>
              </MenuPopup>
            </Menu>
          </>
        ) : (
          <RailButton
            tooltipSide={popupSide}
            label="rotate device"
            disabled={inputDisabled || !!view.keyboard?.attached}
            onClick={() => handle?.rotate()}
          >
            <RotateCcwIcon />
          </RailButton>
        )}
        <RailDivider />
        <RailButton
          tooltipSide={popupSide}
          label={`Switch device to ${nextAppearance} mode`}
          disabled={controls.disabled || !settings?.appearance}
          onClick={() => void controls.act({ type: "setAppearance", value: nextAppearance })}
        >
          {settings?.appearance === "dark" ? <SunIcon /> : <MoonIcon />}
        </RailButton>
        <Menu>
          <MenuTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="device text size"
                title="device text size"
                disabled={controls.disabled || !settings?.textSize}
              />
            }
          >
            <TypeIcon />
          </MenuTrigger>
          <MenuPopup side={popupSide} className="min-w-40">
            <MenuRadioGroup
              value={settings?.textSize ?? ""}
              onValueChange={(value) => {
                if (
                  value === "small" ||
                  value === "default" ||
                  value === "large" ||
                  value === "extra-large"
                )
                  void controls.act({ type: "setTextSize", value });
              }}
            >
              {(
                [
                  ["small", "Small"],
                  ["default", "Default"],
                  ["large", "Large"],
                  ["extra-large", "Extra large"],
                ] as const
              ).map(([value, label]) => (
                <MenuRadioItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <span className="flex-1">{label}</span>
                    <MenuRadioItemIndicator />
                  </span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuPopup>
        </Menu>
        <RailButton
          tooltipSide={popupSide}
          label="device tools"
          pressed={props.toolsOpen}
          onClick={props.onTools}
        >
          <SlidersHorizontalIcon />
        </RailButton>
        <RailButton
          tooltipSide={popupSide}
          label={props.screenshotPending ? "Capturing screenshot" : "Save screenshot"}
          disabled={!view.streaming || props.screenshotPending}
          onClick={props.onScreenshot}
        >
          <CameraIcon />
        </RailButton>
        <Menu>
          <MenuTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="more device actions"
                title="more device actions"
              />
            }
          >
            <MoreHorizontalIcon />
          </MenuTrigger>
          <MenuPopup side={popupSide} align="end">
            <MenuItem onClick={props.onFloat}>
              <PictureInPicture2Icon />
              float device over chat
            </MenuItem>
            <MenuItem onClick={props.onClose}>
              <XIcon />
              close device panel
            </MenuItem>
            <MenuSeparator />
            <MenuItem variant="destructive" onClick={props.onPowerOff}>
              <PowerIcon />
              power off device
            </MenuItem>
          </MenuPopup>
        </Menu>
        <RailDivider />
        <RailButton
          tooltipSide={popupSide}
          label="3D view"
          pressed={view.phone}
          disabled={!view.streaming || !!view.phoneUnavailableReason}
          description={view.phoneUnavailableReason ?? undefined}
          onClick={view.showPhone}
        >
          <BoxIcon />
        </RailButton>
        <RailButton
          tooltipSide={popupSide}
          label="flat view"
          pressed={!view.phone}
          disabled={!view.streaming}
          onClick={view.showFlat}
        >
          <SmartphoneIcon />
        </RailButton>
        {view.keyboard ? (
          <RailButton
            tooltipSide={popupSide}
            label={view.keyboard.attached ? "Detach Magic Keyboard" : "Attach Magic Keyboard"}
            pressed={view.keyboard.attached}
            onClick={view.keyboard.toggle}
          >
            <KeyboardIcon />
          </RailButton>
        ) : null}
        {view.phone ? (
          <RailButton tooltipSide={popupSide} label="restore 3D view" onClick={view.resetView}>
            <MaximizeIcon />
          </RailButton>
        ) : null}
      </div>
      {view.foldingControls}
    </aside>
  );
}

function RailDivider() {
  return <div aria-hidden className="my-1 h-px w-5 shrink-0 bg-border/70" />;
}

function RailButton(props: {
  tooltipSide: "left" | "bottom";
  label: string;
  description?: string | undefined;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const button = (
    <Button
      size="icon-sm"
      variant={props.pressed ? "secondary" : "ghost"}
      aria-label={props.label}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
  return (
    <Tooltip>
      {props.disabled && props.description ? (
        <TooltipTrigger
          render={
            <span className="inline-flex" tabIndex={0} role="group" aria-label={props.label} />
          }
        >
          {button}
        </TooltipTrigger>
      ) : (
        <TooltipTrigger render={button} />
      )}
      <TooltipPopup side={props.tooltipSide}>{props.description ?? props.label}</TooltipPopup>
    </Tooltip>
  );
}
