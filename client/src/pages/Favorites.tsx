// Favorites page — shows only the photos a user has starred.
// The server side does the heavy lifting: WHERE EXISTS (favorites)
// + include the joined favoritedAt timestamp.
import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { PhotoCard } from '../components/PhotoCard';
import type { Photo } from '../types';

export const Favorites = () => {
  const [items, setItems] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .favorites(controller.signal)
      .then((res) => setItems(res.items))
      .catch((err: unknown) => {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof ApiError ? err.message : 'Failed to load favorites');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="home">
      <div className="hero">
        <h1>Your favorites</h1>
        <p>Stars you've added across the APOD archive.</p>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="muted center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          No favorites yet. Open any photo and tap ☆ to add one.
        </div>
      ) : (
        <div className="grid">
          {items.map((p) => (
            <PhotoCard key={p.id} photo={p} />
          ))}
        </div>
      )}
    </div>
  );
};
