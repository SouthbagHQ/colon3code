/**
 * CursorCloudApi — thin typed client for Cursor's Cloud Agents API.
 *
 * Only the read paths the mirror needs are modelled: who the key belongs to,
 * which agents exist, which repositories each agent works on, and the runs
 * that make up its transcript. Writes (creating agents, follow-up runs) are
 * deliberately absent — :3 Code mirrors cloud agents, it does not drive them.
 *
 * Response schemas are permissive on purpose. Cursor's v1 API grows fields,
 * and a mirror that stops syncing because an unknown key appeared would be
 * worse than one that ignores it.
 *
 * @see https://cursor.com/docs/cloud-agent/api/endpoints
 *
 * @module cursorCloud/CursorCloudApi
 */
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";

const CURSOR_CLOUD_API_BASE_URL = "https://api.cursor.com";

/** Pages are capped by Cursor at 100; the mirror never wants more than a page. */
const AGENT_PAGE_LIMIT = 100;
const RUN_PAGE_LIMIT = 100;

const REQUEST_TIMEOUT_MS = 20_000;

type CursorCloudOperation = "getApiKeyInfo" | "listAgents" | "getAgent" | "listRuns";

export class CursorCloudApiError extends Schema.TaggedError<CursorCloudApiError>()(
  "CursorCloudApiError",
  {
    operation: Schema.String,
    /** Absent for transport failures, which never reached a response. */
    status: Schema.optional(Schema.Number),
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    const status = this.status === undefined ? "" : ` (HTTP ${this.status})`;
    return `Cursor Cloud ${this.operation} failed${status}: ${this.detail}`;
  }
}

export const CursorCloudApiKeyInfo = Schema.Struct({
  apiKeyName: Schema.String,
  userEmail: Schema.optional(Schema.String),
});
export type CursorCloudApiKeyInfo = typeof CursorCloudApiKeyInfo.Type;

export const CursorCloudAgentSummary = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  status: Schema.String,
  url: Schema.optional(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
  latestRunId: Schema.optional(Schema.String),
});
export type CursorCloudAgentSummary = typeof CursorCloudAgentSummary.Type;

const CursorCloudRepoConfig = Schema.Struct({
  url: Schema.String,
});

export const CursorCloudAgent = Schema.Struct({
  ...CursorCloudAgentSummary.fields,
  repos: Schema.optional(Schema.Array(CursorCloudRepoConfig)),
});
export type CursorCloudAgent = typeof CursorCloudAgent.Type;

const CursorCloudRunGitBranch = Schema.Struct({
  repoUrl: Schema.String,
  branch: Schema.optional(Schema.String),
  prUrl: Schema.optional(Schema.String),
});

export const CursorCloudRun = Schema.Struct({
  id: Schema.String,
  agentId: Schema.String,
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  result: Schema.optional(Schema.String),
  git: Schema.optional(
    Schema.Struct({
      branches: Schema.optional(Schema.Array(CursorCloudRunGitBranch)),
    }),
  ),
});
export type CursorCloudRun = typeof CursorCloudRun.Type;

const ListAgentsResponse = Schema.Struct({
  items: Schema.Array(CursorCloudAgentSummary),
  nextCursor: Schema.optional(Schema.String),
});

const ListRunsResponse = Schema.Struct({
  items: Schema.Array(CursorCloudRun),
  nextCursor: Schema.optional(Schema.String),
});

export interface CursorCloudApiClient {
  readonly getApiKeyInfo: () => Effect.Effect<CursorCloudApiKeyInfo, CursorCloudApiError>;
  /** Newest first, one page. Archived agents are excluded. */
  readonly listAgents: () => Effect.Effect<
    ReadonlyArray<CursorCloudAgentSummary>,
    CursorCloudApiError
  >;
  readonly getAgent: (agentId: string) => Effect.Effect<CursorCloudAgent, CursorCloudApiError>;
  /** Newest first, one page. */
  readonly listRuns: (
    agentId: string,
  ) => Effect.Effect<ReadonlyArray<CursorCloudRun>, CursorCloudApiError>;
}

export interface CursorCloudApiClientOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
}

/**
 * Build a client bound to one API key. Cheap to construct — callers rebuild
 * it whenever the configured key changes rather than mutating one in place.
 */
export const makeCursorCloudApiClient = Effect.fn("CursorCloudApi.make")(function* (
  options: CursorCloudApiClientOptions,
) {
  const httpClient = yield* HttpClient.HttpClient;
  const baseUrl = (options.baseUrl ?? CURSOR_CLOUD_API_BASE_URL).replace(/\/+$/u, "");

  const decodeResponse = <S extends Schema.Top>(
    operation: CursorCloudOperation,
    schema: S,
    response: HttpClientResponse.HttpClientResponse,
  ): Effect.Effect<S["Type"], CursorCloudApiError, S["DecodingServices"]> =>
    HttpClientResponse.matchStatus({
      "2xx": (success) =>
        HttpClientResponse.schemaBodyJson(schema)(success).pipe(
          Effect.mapError(
            (cause) =>
              new CursorCloudApiError({
                operation,
                status: success.status,
                detail: "response did not match the expected shape",
                cause,
              }),
          ),
        ),
      orElse: (failed) =>
        Effect.fail(
          new CursorCloudApiError({
            operation,
            status: failed.status,
            detail:
              failed.status === 401 || failed.status === 403
                ? "the API key was rejected"
                : `request failed with status ${failed.status}`,
          }),
        ),
    })(response);

  const executeJson = <S extends Schema.Top>(
    operation: CursorCloudOperation,
    path: string,
    schema: S,
  ): Effect.Effect<S["Type"], CursorCloudApiError, S["DecodingServices"]> =>
    httpClient
      .execute(
        HttpClientRequest.get(`${baseUrl}${path}`).pipe(
          HttpClientRequest.acceptJson,
          HttpClientRequest.bearerToken(options.apiKey),
        ),
      )
      .pipe(
        Effect.mapError(
          (cause) =>
            new CursorCloudApiError({
              operation,
              detail: cause.message ?? "request failed",
              cause,
            }),
        ),
        Effect.flatMap((response) => decodeResponse(operation, schema, response)),
        Effect.timeoutOrElse({
          duration: REQUEST_TIMEOUT_MS,
          orElse: () =>
            Effect.fail(
              new CursorCloudApiError({
                operation,
                detail: `request timed out after ${REQUEST_TIMEOUT_MS}ms`,
              }),
            ),
        }),
      );

  return {
    getApiKeyInfo: () => executeJson("getApiKeyInfo", "/v1/me", CursorCloudApiKeyInfo),
    listAgents: () =>
      executeJson(
        "listAgents",
        `/v1/agents?limit=${AGENT_PAGE_LIMIT}&includeArchived=false`,
        ListAgentsResponse,
      ).pipe(Effect.map((response) => response.items)),
    getAgent: (agentId) =>
      executeJson("getAgent", `/v1/agents/${encodeURIComponent(agentId)}`, CursorCloudAgent),
    listRuns: (agentId) =>
      executeJson(
        "listRuns",
        `/v1/agents/${encodeURIComponent(agentId)}/runs?limit=${RUN_PAGE_LIMIT}`,
        ListRunsResponse,
      ).pipe(Effect.map((response) => response.items)),
  } satisfies CursorCloudApiClient;
});
