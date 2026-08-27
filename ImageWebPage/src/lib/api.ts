import { ImageGroupDto, ImageDto, TagCountDto } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Module-level token store — set by AuthContext on login / refresh / logout. */
let _authToken: string | null = null;

export function setApiToken(token: string | null) {
  _authToken = token;
}

/**
 * API error with status code and parsed error details.
 * Used by API consumers to handle different error types granularly.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly errorType?: string;
  public readonly details?: Record<string, any>;

  constructor(status: number, message: string, errorType?: string, details?: Record<string, any>) {
    super(message);
    this.status = status;
    this.errorType = errorType;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (_authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    // Try to parse error details from JSON response
    let errorType: string | undefined;
    let details: Record<string, any> | undefined;
    let message: string | undefined;
    try {
      const data = await res.json();
      // Support both 'error' and 'errorType' fields (for auth errors specifically)
      errorType = data.errorType || data.error;
      message = data.message;
      details = data;
    } catch {
      // Fall back to text if JSON parsing fails
    }

    const text = message || (await res.text().catch(() => res.statusText));
    throw new ApiError(
      res.status,
      text || `HTTP ${res.status}`,
      errorType,
      details
    );
  }
  // Handle 204 No Content and other empty responses
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function fetchImages(params?: { tag?: string; favourites?: boolean }): Promise<ImageGroupDto[]> {
  const query = new URLSearchParams();
  if (params?.tag) query.set("tag", params.tag);
  if (params?.favourites) query.set("favourites", "true");
  const qs = query.toString() ? `?${query}` : "";
  return request<ImageGroupDto[]>(`/api/images${qs}`);
}

export async function toggleFavourite(id: number): Promise<ImageDto> {
  return request<ImageDto>(`/api/images/${id}/favourite`, { method: "PATCH" });
}

export async function addTag(imageId: number, tag: string): Promise<ImageDto> {
  return request<ImageDto>(`/api/images/${imageId}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag }),
  });
}

export async function removeTag(imageId: number, tagName: string): Promise<ImageDto> {
  return request<ImageDto>(`/api/images/${imageId}/tags/${encodeURIComponent(tagName)}`, {
    method: "DELETE",
  });
}

export async function fetchTags(prefix?: string): Promise<string[]> {
  const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
  return request<string[]>(`/api/tags${qs}`);
}

export async function uploadImage(file: File): Promise<ImageDto> {
  const form = new FormData();
  form.append("file", file);

  // Build headers with auth token if available
  const headers: Record<string, string> = {};
  if (_authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }

  // Note: Don't set Content-Type manually when using FormData —
  // the browser will set it to multipart/form-data with the correct boundary.
  const res = await fetch(`${BASE}/api/images`, {
    method: "POST",
    body: form,
    headers,
    credentials: "include", // Include cookies (refresh token, session, etc.)
  });

  if (!res.ok) {
    // Try to parse error details from JSON response (matching the request helper)
    let errorType: string | undefined;
    let details: Record<string, any> | undefined;
    let message: string | undefined;
    try {
      const data = await res.json();
      errorType = data.errorType || data.error;
      message = data.message;
      details = data;
    } catch {
      // Fall back to text if JSON parsing fails
    }

    const text = message || (await res.text().catch(() => res.statusText));
    throw new ApiError(
      res.status,
      text || `HTTP ${res.status}`,
      errorType,
      details
    );
  }

  return res.json() as Promise<ImageDto>;
}

export async function deleteImage(id: number): Promise<void> {
  await request<void>(`/api/images/${id}`, { method: "DELETE" });
}

export async function deleteImages(ids: number[]): Promise<void> {
  await request<void>(`/api/images`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  });
}

export function thumbnailSrc(id: number): string {
  return `${BASE}/api/images/${id}/thumbnail`;
}

export function fullSrc(id: number): string {
  return `${BASE}/api/images/${id}/full`;
}

/**
 * Fetch the full-resolution image data with authentication.
 * Returns a blob URL that can be used with <img> tags.
 * Caller is responsible for calling URL.revokeObjectURL() when done with the blob URL.
 */
export async function fetchFullImageBlob(id: number): Promise<string> {
  const headers: Record<string, string> = {};
  const hasToken = !!_authToken;
  if (_authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }

  console.log(`[fetchFullImageBlob] Fetching id=${id}, token=${hasToken ? 'set' : 'NOT SET'}, url=${BASE}/api/images/${id}/full`);

  try {
    const res = await fetch(`${BASE}/api/images/${id}/full`, {
      headers,
      // Explicitly include credentials for same-origin requests
      credentials: "include",
    });

    console.log(`[fetchFullImageBlob] Response: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        errorMsg = data.message || data.error || errorMsg;
      } catch {
        // fallback to status text if JSON parsing fails
        errorMsg = res.statusText || errorMsg;
      }
      throw new ApiError(res.status, `Failed to load full image: ${errorMsg}`);
    }
    const blob = await res.blob();
    console.log(`[fetchFullImageBlob] Success: loaded ${blob.size} bytes`);
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error(`[fetchFullImageBlob] Error:`, e);
    if (e instanceof ApiError) throw e;
    // Network error or other fetch failure
    throw new ApiError(0, `Failed to fetch full image: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Fetch the thumbnail image data with authentication.
 * Returns a blob URL that can be used with <img> tags.
 * Caller is responsible for calling URL.revokeObjectURL() when done with the blob URL.
 */
export async function fetchThumbnailBlob(id: number): Promise<string> {
  const headers: Record<string, string> = {};
  if (_authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }
  const res = await fetch(`${BASE}/api/images/${id}/thumbnail`, { headers });
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to load thumbnail: ${res.statusText}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function fetchMediaCounts(): Promise<Record<string, number>> {
  return request<Record<string, number>>("/api/images/counts");
}

export async function fetchTagsRanked(): Promise<TagCountDto[]> {
  return request<TagCountDto[]>("/api/tags/ranked");
}

export async function fetchSearchResults(params: {
  /** Visual content search query — passed as ?q= to the backend vision search. */
  q?: string;
  tags?: string[];
  type?: string;
  favourites?: boolean;
}): Promise<ImageGroupDto[]> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  params.tags?.forEach((t) => query.append("tags", t));
  if (params.type) query.set("type", params.type);
  if (params.favourites) query.set("favourites", "true");
  const qs = query.toString() ? `?${query}` : "";
  return request<ImageGroupDto[]>(`/api/images${qs}`);
}

export async function registerAccount(email: string, password: string): Promise<{ accessToken: string; email: string }> {
  return request<{ accessToken: string; email: string }>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function importSeedImages(): Promise<ImageDto[]> {
  return request<ImageDto[]>("/api/users/me/import-seed-images", { method: "POST" });
}

/**
 * Checks if a filename is a video based on its extension
 */
export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'm4v', 'wmv', 'webm'];
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return videoExtensions.includes(ext);
}
