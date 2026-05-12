export interface Photo {
  id: string;
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl: string | null;
  mediaType: 'image' | 'video' | string;
  copyright: string | null;
  favoriteCount: number;
  favorited: boolean;
  favoritedAt?: string;
}

export interface Page {
  items: Photo[];
  nextCursor: string | null;
}
