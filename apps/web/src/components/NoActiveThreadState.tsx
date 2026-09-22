import { greeting } from "@t3tools/client-runtime/greeting";
import { useState } from "react";

import { CatFace } from "./CatFace";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { SidebarInset } from "./ui/sidebar";
import { isElectron } from "../env";
import { usePrimaryEnvironment } from "../state/environments";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

export function NoActiveThreadState() {
  // Dozes off while the primary server is away; wakes up as soon as it is back.
  const connected = usePrimaryEnvironment()?.connection.phase === "connected";
  // Read the clock once on mount; the hello does not need to roll over live.
  const [hello] = useState(() => greeting(new Date()));

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <WorkspacePageHeader electron={isElectron} className="border-b border-border">
          {isElectron ? (
            <span className="text-xs text-muted-foreground/50">no active thread</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground md:text-muted-foreground/60">
                no active thread
              </span>
            </div>
          )}
        </WorkspacePageHeader>

        <Empty className="flex-1">
          <div className="w-full max-w-lg px-8 py-12">
            <EmptyHeader className="max-w-none">
              <EmptyMedia>
                <CatFace
                  expression={connected ? hello.expression : "sleepy"}
                  className="size-14 text-5xl text-accent/35"
                  aria-hidden
                />
              </EmptyMedia>
              <EmptyTitle className="text-foreground text-xl">{hello.text}</EmptyTitle>
              <EmptyDescription className="mt-2 text-sm text-muted-foreground/78">
                {" "}
                pop into an existing thread, or start a fresh one — we're ready when you are ^w^
              </EmptyDescription>
            </EmptyHeader>
          </div>
        </Empty>
      </div>
    </SidebarInset>
  );
}
