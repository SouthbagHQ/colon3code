import { PlusIcon } from "~/icons";
import { useCallback } from "react";

import { openCommandPalette } from "../commandPaletteBus";
import { Button } from "./ui/button";
import { CatFace } from "./CatFace";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { SidebarInset } from "./ui/sidebar";

// Both faces are pre-rendered; hovering or focusing the add button swaps which
// one is shown purely in CSS, so the wink costs no React state or repaint loop.
const HAPPY_FACE_CLASS =
  "size-16 text-accent/35 sm:size-20 group-has-[button:hover]/hero:hidden group-has-[button:focus-visible]/hero:hidden";
const WINK_FACE_CLASS =
  "hidden size-16 text-6xl text-accent/35 sm:size-20 sm:text-7xl group-has-[button:hover]/hero:inline-flex group-has-[button:focus-visible]/hero:inline-flex";

export function NoProjectsHero() {
  const openAddProject = useCallback(() => openCommandPalette({ open: "add-project" }), []);

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <Empty className="flex-1">
          <div className="group/hero w-full max-w-lg px-8 py-12">
            <EmptyHeader className="max-w-none">
              <EmptyMedia>
                <CatFace expression="happy" className={HAPPY_FACE_CLASS} aria-hidden />
                <CatFace expression="wink" className={WINK_FACE_CLASS} />
              </EmptyMedia>
              <EmptyTitle className="text-foreground text-2xl sm:text-3xl">
                {" "}
                meow! what should we make today? :3
              </EmptyTitle>
              <EmptyDescription className="mt-2 text-sm text-muted-foreground/78">
                {" "}
                add a project and we'll start your first thread together :3
              </EmptyDescription>
              <div className="mt-6 flex justify-center">
                <Button size="sm" onClick={openAddProject}>
                  <PlusIcon className="size-4" />
                  add project
                </Button>
              </div>
            </EmptyHeader>
          </div>
        </Empty>
      </div>
    </SidebarInset>
  );
}
