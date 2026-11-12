// Bearer Clerk token against NEXT_PUBLIC_API_URL/api/v1. The member routes live
// under /capital/*; /auth/me says which consoles the login opens.
//
// NEXT_PUBLIC_API_MOCK=1 answers every call from src/lib/mock.ts so the portal
// can be reviewed without a backend or a Clerk session.

import { mockRequest } from "./mock";

export const apiBase = `${process.env.NEXT_PUBLIC_API_URL ?? "https://api.qualifiedcommercial.com"}/api/v1`;
export const MOCK = process.env.NEXT_PUBLIC_API_MOCK === "1";

export class ApiError extends Error {
  status: number;
  body: unknown;
  code: string | null;
  constructor(status: number, message: string, body: unknown, code: string | null = null) {
    super(message);
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    const detail = (body as { detail?: unknown } | null)?.detail;
    let message = `Request failed (${res.status})`;
    let code: string | null = null;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      const issues = detail
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const issue = item as { loc?: unknown; msg?: unknown };
          const location = Array.isArray(issue.loc) ? issue.loc.filter((p) => p !== "body").join(".") : "";
          const problem = typeof issue.msg === "string" ? issue.msg.replace(/^Value error,\s*/, "") : "Invalid value";
          return location ? `${location}: ${problem}` : problem;
        })
        .filter((x): x is string => Boolean(x));
      if (issues.length) message = issues.join("; ");
    } else if (detail && typeof detail === "object") {
      const d = detail as { message?: unknown; code?: unknown };
      if (typeof d.message === "string") message = d.message;
      if (typeof d.code === "string") code = d.code;
    }
    throw new ApiError(res.status, message, body, code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function api<T>(path: string, opts: RequestInit & { authToken?: string } = {}): Promise<T> {
  if (MOCK) return mockRequest<T>(path, opts);
  const { authToken, ...init } = opts;
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...(init.headers ?? {}) },
  });
  return unwrap<T>(res);
}

export async function apiBlob(path: string, opts: { authToken?: string } = {}): Promise<Blob> {
  if (MOCK) return new Blob([await mockRequest<string>(path, { method: "GET" })], { type: "text/csv" });
  const res = await fetch(`${apiBase}${path}`, { cache: "no-store", headers: opts.authToken ? { Authorization: `Bearer ${opts.authToken}` } : {} });
  if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`, null);
  return res.blob();
}

/** The gate payload a 403 carries, when the API refused an offering read. */
export function gateFromError(e: unknown): { code: string; gate?: Record<string, unknown> } | null {
  if (!(e instanceof ApiError) || e.status !== 403) return null;
  const detail = (e.body as { detail?: { code?: string; gate?: Record<string, unknown> } } | null)?.detail;
  if (!detail || typeof detail !== "object" || !detail.code) return null;
  return { code: detail.code, gate: detail.gate };
}
