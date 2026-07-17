export interface Track {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration: string;
    cover: string;
    previewUrl?: string; // from Spotify DB
}

export interface Playlist {
    id: string;
    title: string;
    creator: string;
    stats: string;
    description: string;
    coverImages: string[];
    tracks: Track[];
}

export interface PlayerState {
    isPlaying: boolean;
    track: Track | null;
    isMinimized: boolean;
}
