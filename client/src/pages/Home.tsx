// Home — paginated gallery with "load more" cursor.
//
// Cursor pagination (not offset) means scrolling stays stable even if
// new photos arrive between page loads (the daily ingest tick). Offset
// pagination would skip rows when the data set shifts.
import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { PhotoCard } from '../components/PhotoCard';
import type { Photo } from '../types';

export const Home = () => {
  const [items, setItems] = useState<Photo[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .photos({ limit: 24 }, controller.signal)
      .then((page) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch((err: unknown) => {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof ApiError ? err.message : 'Failed to load photos');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const loadMore = async (): Promise<void> => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api.photos({ limit: 24, cursor: nextCursor });
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      // Show stale data + button stays available for retry.
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="home">
      <div className="hero">
        <h1>Astronomy Picture of the Day</h1>
        <p>NASA's APOD archive — ingested daily, queryable via Prisma.</p>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="muted center">Loading photos…</div>
      ) : items.length === 0 ? (
        <div className="empty">No photos yet. The ingester runs on cold start — give it a minute.</div>
      ) : (
        <>
          <div className="grid">
            {items.map((p) => (
              <PhotoCard key={p.id} photo={p} />
            ))}
          </div>
          {nextCursor && (
            <div className="load-more-row">
              <button className="load-more" onClick={loadMore} disabled={loadingMore} type="button">
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
