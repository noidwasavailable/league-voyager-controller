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
 * Create a small wrapper client with bound credentials.
 */
export function createLCUClient(creds: LCUCredentials) {
  return {
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
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<unable to read body>";
  }
}
