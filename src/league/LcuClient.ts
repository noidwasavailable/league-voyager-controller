import type {
  FetchLCUOptions,
  GetCredentialsOptions,
  LCUCredentials,
} from "@/types";
import { $ } from "bun";
/**
 * Regex patterns to capture CLI arguments
 */
const PORT_REGEX = /--app-port(?:=|\s+)"?(\d+)"?/i;
const TOKEN_REGEX = /--remoting-auth-token(?:=|\s+)"?([A-Za-z0-9._-]+)"?/i;

/**
 * Attempt to enumerate processes and capture args for LeagueClientUx.
 *
 * Implementation details:
 *  - Uses `ps -axo pid,comm,args` to list processes.
 *  - Filters lines containing 'LeagueClientUx'.
 *  - Extracts port / token via regex.
 *
 * Returns first match with both values.
 */
async function enumerateProcessCredentials(): Promise<LCUCredentials | null> {
  try {
    // Use a single ps invocation for efficiency
    const text = await $`ps -axo pid,comm,args`.text();
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      if (!line) continue;
      if (!/LeagueClientUx/i.test(line)) continue;

      // Format usually: PID COMM ARGS...
      // We'll simply run regex on entire line.
      const portMatch = line.match(PORT_REGEX);
      const tokenMatch = line.match(TOKEN_REGEX);
      if (portMatch && tokenMatch) {
        const pidPart = line.trim().split(/\s+/)[0];
        const pid = Number(pidPart);
        if (!Number.isInteger(pid)) continue;

        return {
          pid,
          port: Number(portMatch[1]),
          password: tokenMatch[1],
          protocol: "https",
        };
      }
    }
    return null;
  } catch (err) {
    // In strict environments `ps` might fail (unlikely on mac).
    return null;
  }
}

/**
 * Retrieve LCU credentials using lockfile or process scanning (configurable).
 * Supports optional polling until timeout.
 */
export async function getLCUCredentials(
  opts: GetCredentialsOptions = {},
): Promise<LCUCredentials | null> {
  const { timeoutMs = 0, pollIntervalMs = 500 } = opts;

  const deadline =
    timeoutMs > 0 ? Date.now() + timeoutMs : Number.POSITIVE_INFINITY;

  async function attempt(): Promise<LCUCredentials | null> {
    const pr = await enumerateProcessCredentials();
    if (pr) return pr;
    return null;
  }

  while (true) {
    const creds = await attempt();
    if (creds) return creds;
    if (Date.now() > deadline) return null;
    if (timeoutMs === 0) return null;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
}

/**
 * Build the Basic Authorization header value used by the LCU API.
 * Username is always "riot".
 */
function buildBasicAuth(password: string): string {
  return `Basic ${btoa(`riot:${password}`)}`;
}

/**
 * Convenience to convert credentials into headers for fetch calls.
 */
function buildAuthHeaders(creds: LCUCredentials): HeadersInit {
  return {
    Authorization: buildBasicAuth(creds.password),
  };
}

/**
 * Perform a fetch against the local LCU API with sensible defaults.
 *
 * Example:
 *   const creds = await getLCUCredentials({ timeoutMs: 10_000 });
 *   if (!creds) throw new Error("LCU not found");
 *   const res = await fetchLCU(creds, "/lol-summoner/v1/current-summoner");
 *
 * The path can omit leading slash.
 */
async function fetchLCU(
  creds: LCUCredentials,
  apiPath: string,
  init: FetchLCUOptions = {},
): Promise<Response> {
  const { auth = true, insecureTLS = true, headers, ...rest } = init;

  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;

  const mergedHeaders: Record<string, string> = {
    ...(headers
      ? Object.fromEntries(
          Object.entries(headers).map(([k, v]) => [k, String(v)]),
        )
      : {}),
  };

  if (auth) {
    mergedHeaders.Authorization ??= buildBasicAuth(creds.password);
  }

  // Bun-specific TLS option for the self-signed certificate:
  const fetchOpts: RequestInit & {
    tls?: { rejectUnauthorized?: boolean };
  } = {
    headers: mergedHeaders,
    ...rest,
  };

  if (insecureTLS) {
    fetchOpts.tls = { rejectUnauthorized: false };
  }

  const url = `${creds.protocol}://127.0.0.1:${creds.port}${path}`;
  return await fetch(url, fetchOpts);
}

/**
 * Event types & payload for LCU WebSocket notifications.
 * Matches the structure delivered after subscribing with [5,"OnJsonApiEvent"].
 */
export type LCUEventType = "Create" | "Update" | "Delete";
export interface LCUApiEvent<T = any> {
  uri: string;
  eventType: LCUEventType;
  data: T;
}

/**
 * Create a wrapper client with bound credentials + WebSocket event support.
 *
 * Usage:
 *   const client = createLCUClient(creds);
 *   await client.connectEvents(); // establishes websocket & subscribes
 *   client.on("/lol-champ-select/v1/session", (data, type) => { ... });
 *   client.on("*", (data, type, raw) => { console.log(raw.uri, type); }); // wildcard
 *   client.on("connect", () => console.log("Events connected"));
 *   client.on("disconnect", () => console.log("Events disconnected"));
 */
export function createLCUClient(creds: LCUCredentials) {
  type EventHandler = (
    data: any,
    eventType: LCUEventType,
    raw: LCUApiEvent<any>,
  ) => void;

  const listeners = new Map<string, Set<EventHandler>>();
  // Special pseudo-events: "connect", "disconnect", and wildcard "*"
  let ws: WebSocket | null = null;
  let connecting = false;
  let subscribed = false;
  let reconnectTimer: Timer | null = null;

  const scheme = creds.protocol === "https" ? "wss" : "ws";
  const wsUrl = `${scheme}://127.0.0.1:${creds.port}`;

  function addListener(key: string, fn: EventHandler) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
  }

  function removeListener(key: string, fn: EventHandler) {
    const set = listeners.get(key);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) listeners.delete(key);
  }

  function emit(uri: string, data: any, eventType: LCUEventType) {
    const raw: LCUApiEvent = { uri, data, eventType };
    const direct = listeners.get(uri);
    direct?.forEach((fn) => fn(data, eventType, raw));
    const wildcard = listeners.get("*");
    wildcard?.forEach((fn) => fn(data, eventType, raw));
  }

  function emitPseudo(event: "connect" | "disconnect") {
    const raw: LCUApiEvent = {
      uri: event,
      data: undefined,
      eventType: "Update",
    };
    const direct = listeners.get(event);
    direct?.forEach((fn) => fn(undefined, "Update", raw));
    const wildcard = listeners.get("*");
    wildcard?.forEach((fn) => fn(undefined, "Update", raw));
  }

  async function connectEvents(autoReconnect = true): Promise<void> {
    if (ws && ws.readyState === ws.OPEN) return;
    if (connecting) {
      // Wait until existing attempt finishes
      await new Promise<void>((resolve) => {
        const check = () => {
          if (ws && ws.readyState === ws.OPEN) resolve();
          else if (!connecting) resolve();
          else setTimeout(check, 50);
        };
        check();
      });
      return;
    }

    connecting = true;
    try {
      // Use Authorization header instead of embedding credentials in the URL
      ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: buildBasicAuth(creds.password),
        },
        // Bun-specific TLS override for the local self-signed cert
        tls: { rejectUnauthorized: false },
      } as any);

      await new Promise<void>((resolve, reject) => {
        if (!ws) return reject(new Error("WebSocket not initialized"));
        ws.onopen = () => {
          subscribed = false;
          ws?.send(JSON.stringify([5, "OnJsonApiEvent"]));
          subscribed = true;
          emitPseudo("connect");
          resolve();
        };
        ws.onerror = (ev) => {
          reject(new Error("LCU WebSocket error"));
        };
      });

      if (ws) {
        ws.onmessage = (msg) => {
          try {
            const parsed = JSON.parse(
              typeof msg.data === "string" ? msg.data : "",
            );
            // Expected shape: [<opcode>, <eventName>, { data, eventType, uri }]
            if (Array.isArray(parsed) && parsed[2] && parsed[2].uri) {
              const evObj = parsed[2] as LCUApiEvent;
              emit(evObj.uri, evObj.data, evObj.eventType);
            }
          } catch {
            // Ignore malformed frames
          }
        };
        ws.onclose = () => {
          emitPseudo("disconnect");
          subscribed = false;
          if (autoReconnect) {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              connectEvents(true).catch(() => {
                // silent; another retry will occur
              });
            }, 1000);
          }
        };
        ws.onerror = () => {
          // Will cause a close; rely on onclose for reconnect
        };
      }
    } finally {
      connecting = false;
    }
  }

  function disconnectEvents() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws && ws.readyState === ws.OPEN) ws.close();
    ws = null;
  }

  function on(uri: string, handler: EventHandler) {
    addListener(uri, handler);
    return api;
  }

  function off(uri: string, handler: EventHandler) {
    removeListener(uri, handler);
    return api;
  }

  function once(uri: string, handler: EventHandler) {
    const wrapper: EventHandler = (d, t, r) => {
      off(uri, wrapper);
      handler(d, t, r);
    };
    on(uri, wrapper);
    return api;
  }

  function removeAllListeners(uri?: string) {
    if (uri) listeners.delete(uri);
    else listeners.clear();
    return api;
  }

  const api = {
    creds,
    /**
     * Raw fetch convenience.
     */
    fetch: (path: string, init?: FetchLCUOptions) =>
      fetchLCU(creds, path, init),
    /**
     * JSON convenience. Throws on !response.ok
     */
    json: async <T = unknown>(
      path: string,
      init?: FetchLCUOptions,
    ): Promise<T> => {
      const res = await fetchLCU(creds, path, init);
      if (!res.ok) {
        const body = await safeText(res);
        throw new Error(
          `LCU request failed ${res.status} ${res.statusText} - ${body}`,
        );
      }
      return (await res.json()) as T;
    },

    /**
     * Establish (or ensure) WebSocket subscription to all JSON API events.
     */
    connectEvents,

    /**
     * Close WebSocket & cancel auto-reconnect.
     */
    disconnectEvents,

    /**
     * Register an event listener.
     *  - uri: specific endpoint (e.g. "/lol-champ-select/v1/session")
     *  - "*" : wildcard for all events (includes "connect"/"disconnect")
     *  - "connect" / "disconnect": pseudo lifecycle events
     */
    on,

    /**
     * Remove a specific listener.
     */
    off,

    /**
     * One-time listener.
     */
    once,

    /**
     * Remove listeners (for a uri or all).
     */
    removeAllListeners,

    /**
     * Whether WebSocket is currently open.
     */
    get eventsConnected() {
      return !!ws && ws.readyState === ws.OPEN;
    },
  };

  return api;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<unable to read body>";
  }
}
