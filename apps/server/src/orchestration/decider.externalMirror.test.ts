import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import {
  CommandId,
  cursorCloudThreadId,
  EventId,
  MessageId,
  ProjectId,
  ProviderInstanceId,
  type OrchestrationEvent,
  type PlannedOrchestrationEvent,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import { decideOrchestrationCommand } from "./decider.ts";
import { createEmptyReadModel, projectEvent } from "./projector.ts";

const CREATED_AT = "2026-09-01T10:00:00.000Z";
const THREAD_ID = cursorCloudThreadId("bc-1111");
const PROJECT_ID = ProjectId.make("project-1");

const mirroredThreadReadModel = Effect.gen(function* () {
  return yield* projectEvent(createEmptyReadModel(CREATED_AT), {
    sequence: 1,
    eventId: EventId.make("event-thread-created"),
    aggregateKind: "thread",
    aggregateId: THREAD_ID,
    type: "thread.created",
    occurredAt: CREATED_AT,
    commandId: CommandId.make("command-thread-created"),
    causationEventId: null,
    correlationId: CommandId.make("command-thread-created"),
    metadata: { historyImport: true },
    payload: {
      threadId: THREAD_ID,
      projectId: PROJECT_ID,
      title: "Add a README",
      modelSelection: { instanceId: ProviderInstanceId.make("cursorCloud"), model: "cloud" },
      runtimeMode: "full-access",
      interactionMode: "default",
      branch: null,
      worktreePath: null,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    },
  });
});

const applyEvents = Effect.fn("applyEvents")(function* (
  readModel: Awaited<ReturnType<typeof createEmptyReadModel>>,
  events: PlannedOrchestrationEvent | ReadonlyArray<PlannedOrchestrationEvent>,
  startSequence: number,
) {
  let projected = readModel;
  const planned = Array.isArray(events) ? events : [events as PlannedOrchestrationEvent];
  for (const [index, event] of planned.entries()) {
    projected = yield* projectEvent(projected, {
      ...event,
      sequence: startSequence + index,
    } as OrchestrationEvent);
  }
  return projected;
});

const mirrorCommand = (input: {
  readonly messages: ReadonlyArray<{ readonly suffix: string; readonly text: string }>;
  readonly activity: "running" | "settled";
  readonly occurredAt?: string;
}) =>
  ({
    type: "thread.external.mirror",
    commandId: CommandId.make(`command-mirror-${input.activity}-${input.messages.length}`),
    threadId: THREAD_ID,
    messages: input.messages.map((message) => ({
      messageId: MessageId.make(`${THREAD_ID}:${message.suffix}`),
      role: "assistant" as const,
      text: message.text,
      createdAt: CREATED_AT,
    })),
    activity: input.activity,
    occurredAt: input.occurredAt ?? "2026-09-01T10:05:00.000Z",
  }) as const;

it.layer(NodeServices.layer)("thread external mirror", (it) => {
  it.effect("appends remote messages and leaves a running agent unsettled", () =>
    Effect.gen(function* () {
      const readModel = yield* mirroredThreadReadModel;

      const events = yield* decideOrchestrationCommand({
        command: mirrorCommand({
          messages: [{ suffix: "run:run-1", text: "Added README.md" }],
          activity: "running",
        }),
        readModel,
      });

      expect(events).toMatchObject([
        {
          type: "thread.message-sent",
          metadata: { historyImport: true },
          payload: { role: "assistant", text: "Added README.md", turnId: null, streaming: false },
        },
      ]);
    }),
  );

  it.effect("skips messages it has already mirrored", () =>
    Effect.gen(function* () {
      const readModel = yield* mirroredThreadReadModel;
      const first = yield* decideOrchestrationCommand({
        command: mirrorCommand({
          messages: [{ suffix: "run:run-1", text: "Added README.md" }],
          activity: "running",
        }),
        readModel,
      });
      const afterFirst = yield* applyEvents(readModel, first, 2);

      const repeated = yield* decideOrchestrationCommand({
        command: mirrorCommand({
          messages: [{ suffix: "run:run-1", text: "Added README.md" }],
          activity: "running",
        }),
        readModel: afterFirst,
      });
      expect(repeated).toEqual([]);

      const extended = yield* decideOrchestrationCommand({
        command: mirrorCommand({
          messages: [
            { suffix: "run:run-1", text: "Added README.md" },
            { suffix: "run:run-2", text: "Also added troubleshooting steps" },
          ],
          activity: "settled",
        }),
        readModel: afterFirst,
      });

      expect(extended).toMatchObject([
        { type: "thread.message-sent", payload: { text: "Also added troubleshooting steps" } },
        { type: "thread.settled", payload: { settledAt: "2026-09-01T10:05:00.000Z" } },
      ]);
    }),
  );

  it.effect("wakes a settled mirror when the remote agent starts working again", () =>
    Effect.gen(function* () {
      const readModel = yield* mirroredThreadReadModel;
      const settled = yield* decideOrchestrationCommand({
        command: mirrorCommand({
          messages: [{ suffix: "run:run-1", text: "Done" }],
          activity: "settled",
        }),
        readModel,
      });
      const afterSettle = yield* applyEvents(readModel, settled, 2);

      const reopened = yield* decideOrchestrationCommand({
        command: mirrorCommand({
          messages: [{ suffix: "run:run-1", text: "Done" }],
          activity: "running",
          occurredAt: "2026-09-01T11:00:00.000Z",
        }),
        readModel: afterSettle,
      });

      expect(reopened).toMatchObject([
        {
          type: "thread.unsettled",
          payload: { reason: "activity", updatedAt: "2026-09-01T11:00:00.000Z" },
        },
      ]);
    }),
  );

  it.effect("refuses to mirror onto a thread that has a live session", () =>
    Effect.gen(function* () {
      const readModel = yield* mirroredThreadReadModel;
      const withSession = yield* projectEvent(readModel, {
        sequence: 2,
        eventId: EventId.make("event-session-set"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        type: "thread.session-set",
        occurredAt: CREATED_AT,
        commandId: CommandId.make("command-session-set"),
        causationEventId: null,
        correlationId: CommandId.make("command-session-set"),
        metadata: {},
        payload: {
          threadId: THREAD_ID,
          session: {
            threadId: THREAD_ID,
            status: "ready",
            providerName: "cursorCloud",
            providerInstanceId: ProviderInstanceId.make("cursorCloud"),
            runtimeMode: "full-access",
            activeTurnId: null,
            lastError: null,
            updatedAt: CREATED_AT,
          },
          updatedAt: CREATED_AT,
        },
      } as OrchestrationEvent);

      const outcome = yield* decideOrchestrationCommand({
        command: mirrorCommand({
          messages: [{ suffix: "run:run-1", text: "Done" }],
          activity: "settled",
        }),
        readModel: withSession,
      }).pipe(Effect.result);

      expect(outcome._tag).toBe("Failure");
    }),
  );
});
