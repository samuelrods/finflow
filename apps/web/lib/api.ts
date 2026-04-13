/**
 * Typed API client.
 *
 * Responsibilities:
 * - Attach the access token to every request via Authorization header
 * - On 401, attempt a silent token refresh, then retry the original request once
 * - On second 401 (refresh failed), clear auth state and redirect to login
 *
 * The access token is never stored here — it is passed in per-request from
 * the auth context. This keeps the client stateless and easy to test.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

if (!/^https?:\/\//i.test(API_BASE)) {
  throw new Error(
    `[api] NEXT_PUBLIC_API_URL must be an absolute URL including the protocol ` +
      `(e.g. "https://your-api.up.railway.app/api/v1"). ` +
      `Got: "${API_BASE}". Without the protocol the browser resolves it as a ` +
      `relative path and requests will be sent to the wrong host.`,
  );
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RefreshResult =
  | { success: true; accessToken: string }
  | { success: false };

/**
 * Attempts to refresh the access token using the httpOnly refresh cookie.
 * Returns the new access token on success, or signals failure.
 */
export async function refreshAccessToken(): Promise<RefreshResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include", // sends the httpOnly refresh_token cookie
    });

    if (!res.ok) return { success: false };

    const data = (await res.json()) as { accessToken: string };
    return { success: true, accessToken: data.accessToken };
  } catch {
    return { success: false };
  }
}

interface FetchOptions extends RequestInit {
  accessToken?: string;
  /** Called when a token refresh succeeds, so the caller can update its state */
  onTokenRefreshed?: (newToken: string) => void;
  /** Called when refresh fails — caller should clear auth and redirect */
  onAuthFailure?: () => void;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const body = await res.json();
    if (!res.ok) {
      // NestJS validation errors come back as { message: string[] }
      const message = Array.isArray(body.message)
        ? body.message[0]
        : (body.message ?? "An error occurred");
      throw new ApiError(res.status, message);
    }
    return body as T;
  }

  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return undefined as T;
}

export async function apiFetch<T>(
  path: string,
  { accessToken, onTokenRefreshed, onAuthFailure, ...init }: FetchOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  // Happy path
  if (res.status !== 401) return parseResponse<T>(res);

  // 401 — attempt a silent token refresh
  const refreshResult = await refreshAccessToken();

  if (!refreshResult.success) {
    onAuthFailure?.();
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  // Notify caller of the new token so it can update state
  onTokenRefreshed?.(refreshResult.accessToken);

  // Retry the original request with the new token
  headers.set("Authorization", `Bearer ${refreshResult.accessToken}`);
  const retryRes = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (retryRes.status === 401) {
    onAuthFailure?.();
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  return parseResponse<T>(retryRes);
}
