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
    try {
      const data = await res.json();
      errorType = data.error;
      details = data;
    } catch {
      // Fall back to text if JSON parsing fails
    }

    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      text || `HTTP ${res.status}`,
      errorType,
      details
    );
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
  const res = await fetch(`${BASE}/api/images`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<ImageDto>;
}

export async function deleteImage(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/images/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
}

export async function deleteImages(ids: number[]): Promise<void> {
  const res = await fetch(`${BASE}/api/images`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export function thumbnailSrc(id: number): string {
  return `${BASE}/api/images/${id}/thumbnail`;
}

export function fullSrc(id: number): string {
  return `${BASE}/api/images/${id}/full`;
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
