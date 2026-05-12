// Detail — single APOD with full explanation + favorite toggle.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { Photo } from '../types';

const dateLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const youtubeEmbed = (url: string): string | null => {
  const match = url.match(/[?&]v=([^&#]+)/) ?? url.match(/youtu\.be\/([^?&#]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};

export const Detail = () => {
  const { date } = useParams<{ date: string }>();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    setPhoto(null);
    setError(null);
    api
      .byDate(date, controller.signal)
      .then(setPhoto)
      .catch((err: unknown) => {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof ApiError ? err.message : 'Failed to load photo');
      });
    return () => controller.abort();
  }, [date]);

  const onFavorite = async (): Promise<void> => {
    if (!photo || toggling) return;
    setToggling(true);
    try {
      const result = await api.toggleFavorite(photo.id);
      setPhoto({
        ...photo,
        favorited: result.favorited,
        favoriteCount: result.favorited ? 1 : 0,
      });
    } finally {
      setToggling(false);
    }
  };

  if (error) return <div className="error">{error}</div>;
  if (!photo) return <div className="muted detail-loading">Loading…</div>;

  return (
    <article className="detail">
      <Link to="/" className="detail-back">
        ← Back to gallery
      </Link>

      <div className="detail-media">
        {photo.mediaType === 'video' ? (
          <div className="video-wrap">
            <iframe
              src={youtubeEmbed(photo.url) ?? photo.url}
              title={photo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a href={photo.hdurl ?? photo.url} target="_blank" rel="noreferrer noopener">
            <img src={photo.hdurl ?? photo.url} alt={photo.title} />
          </a>
        )}
      </div>

      <div className="detail-info">
        <div className="detail-row">
          <h1>{photo.title}</h1>
          <button
            className={photo.favorited ? 'fav-btn active' : 'fav-btn'}
            onClick={onFavorite}
            disabled={toggling}
            type="button"
            aria-label={photo.favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            {photo.favorited ? '★ Favorited' : '☆ Favorite'}
          </button>
        </div>
        <div className="detail-meta">
          <span>{dateLabel(photo.date)}</span>
          {photo.copyright && <span>© {photo.copyright}</span>}
          {photo.hdurl && (
            <a href={photo.hdurl} target="_blank" rel="noreferrer noopener">
              View HD ↗
            </a>
          )}
        </div>
        <p className="detail-explanation">{photo.explanation}</p>
      </div>
    </article>
  );
};
