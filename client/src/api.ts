import type { Page, Photo } from './types';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const request = async <T>(path: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Fall through.
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
};

export const api = {
  photos: (
    params: { limit?: number; cursor?: string; favoritesOnly?: boolean },
    signal?: AbortSignal,
  ) => {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.cursor) q.set('cursor', params.cursor);
    if (params.favoritesOnly) q.set('favoritesOnly', 'true');
    return request<Page>(`/api/photos?${q}`, { signal });
  },
  byDate: (date: string, signal?: AbortSignal) =>
    request<Photo>(`/api/photos/${date}`, { signal }),
  random: (signal?: AbortSignal) => request<Photo>('/api/random', { signal }),
  toggleFavorite: (id: string) =>
    request<{ favorited: boolean }>(`/api/photos/${id}/favorite`, { method: 'POST' }),
  favorites: (signal?: AbortSignal) =>
    request<{ items: Photo[] }>('/api/favorites', { signal }),
};
