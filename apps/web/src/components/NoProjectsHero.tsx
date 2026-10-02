import { MessageSquareDashedIcon, PlusIcon } from "~/icons";
import { useCallback } from "react";

import { openCommandPalette } from "../commandPaletteBus";
import { isElectron } from "../env";
import { useScratchProject } from "../hooks/useScratchProject";
import { usePrimaryEnvironmentId } from "../state/environments";
import { Button } from "./ui/button";
import { CatFace } from "./CatFace";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { SidebarInset } from "./ui/sidebar";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

// Both faces are pre-rendered; hovering or focusing the add button swaps which
// one is shown purely in CSS, so the wink costs no React state or repaint loop.
const HAPPY_FACE_CLASS =
  "size-16 text-accent/35 sm:size-20 group-has-[button:hover]/hero:hidden group-has-[button:focus-visible]/hero:hidden";
const WINK_FACE_CLASS =
  "hidden size-16 text-6xl text-accent/35 sm:size-20 sm:text-7xl group-has-[button:hover]/hero:inline-flex group-has-[button:focus-visible]/hero:inline-flex";

export function NoProjectsHero() {
  const openAddProject = useCallback(() => openCommandPalette({ open: "add-project" }), []);
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const { scratchEnvironmentId, startScratchThread } = useScratchProject();
  const scratchTargetEnvironmentId = scratchEnvironmentId(primaryEnvironmentId);

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <Empty className="flex-1">
          <div className="group/hero w-full max-w-lg px-8 py-12">
            <EmptyHeader className="max-w-none">
              <EmptyMedia>
                <CatFace expression="happy" className={HAPPY_FACE_CLASS} aria-hidden />
                <CatFace expression="wink" className={WINK_FACE_CLASS} />
              </EmptyMedia>
              <EmptyTitle variant="hero">
                {" "}
                meow! what should we make today? :3
              </EmptyTitle>
              <EmptyDescription variant="hero">
                {" "}
                add a project and we'll start your first thread together :3
              </EmptyDescription>
              <div className="mt-6 flex justify-center gap-2">
                <Button size="sm" onClick={openAddProject}>
                  <PlusIcon className="size-4" />
                  add project
                </Button>
                {scratchTargetEnvironmentId === null ? null : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void startScratchThread(scratchTargetEnvironmentId)}
                  >
                    <MessageSquareDashedIcon className="size-4" />
                    start without a project
                  </Button>
                )}
              </div>
            </EmptyHeader>
          </div>
        </Empty>
      </div>
    </SidebarInset>
  );
}
