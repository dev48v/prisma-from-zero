// PhotoCard. Renders an image (lazy-loaded) OR a video play-button
// stub (NASA APOD has ~5% video days — YouTube embed in `url`).
import { Link } from 'react-router-dom';
import type { Photo } from '../types';

interface Props {
  photo: Photo;
}

const dateLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const PhotoCard = ({ photo }: Props) => {
  const isVideo = photo.mediaType === 'video';
  return (
    <Link to={`/photo/${photo.date.slice(0, 10)}`} className="card">
      <div className="card-thumb">
        {isVideo ? (
          <div className="video-stub">
            <div className="play-icon">▶</div>
            <div className="video-label">Video</div>
          </div>
        ) : (
          <img src={photo.url} alt={photo.title} loading="lazy" />
        )}
        {photo.favorited && <span className="fav-badge">★</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{photo.title}</h3>
        <div className="card-meta">
          <span>{dateLabel(photo.date)}</span>
          {photo.copyright && <span className="card-copyright">© {photo.copyright}</span>}
        </div>
      </div>
    </Link>
  );
};
