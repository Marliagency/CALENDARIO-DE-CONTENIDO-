// Thin HTTP client against the Pulse backend.
//
// Uses undici for fetch with timeouts. All workspace-scoped endpoints expect
// a per-workspace API key (sk_ws_...) with scopes `ingest` and `read_brain`.

import { request } from "undici";
import { config } from "./config.js";

export interface PulseRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  apiKey?: string;        // override the env key, used when switching workspaces
}

export class PulseApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function pulseFetch<T = unknown>(
  path: string,
  opts: PulseRequestOptions = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const apiKey = opts.apiKey ?? config().PULSE_API_KEY;
  if (!apiKey) {
    throw new PulseApiError(
      "PULSE_API_KEY not configured — set it in .env.studio",
      0,
      null,
    );
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    ...opts.headers,
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = JSON.stringify(opts.body);
  }

  const url = path.startsWith("http") ? path : `${config().PULSE_API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);

  let res;
  try {
    res = await request(url, { method, headers, body, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  const text = await res.body.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (res.statusCode >= 400) {
    throw new PulseApiError(
      `Pulse ${method} ${path} → ${res.statusCode}`,
      res.statusCode,
      data,
    );
  }
  return data as T;
}

export async function ping(): Promise<boolean> {
  try {
    const res = await request(`${config().PULSE_API_BASE_URL}/health`, {
      method: "GET",
      headersTimeout: 2000,
      bodyTimeout: 2000,
    });
    return res.statusCode === 200;
  } catch {
    return false;
  }
}
