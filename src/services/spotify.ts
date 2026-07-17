import type { Track, Playlist } from "../types";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET as string | undefined;
const REFRESH_TOKEN = import.meta.env.VITE_SPOTIFY_REFRESH_TOKEN as string | undefined;

let accessToken = "";
let tokenExpirationTime = 0;

type SpotifyImage = { url?: string };
type SpotifyArtist = { name?: string };
type SpotifyAlbum = {
  id?: string;
  name?: string;
  images?: SpotifyImage[];
};
type SpotifyTrack = {
  id?: string;
  name?: string;
  duration_ms?: number;
  preview_url?: string | null;
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
};
type SpotifyPlaylist = {
  id?: string;
  name?: string;
  description?: string | null;
  images?: SpotifyImage[];
  owner?: { display_name?: string };
  tracks?: { total?: number };
};

function credentialsConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

export async function getAccessToken(): Promise<string> {
  if (!credentialsConfigured()) {
    throw new Error(
      "Spotify credentials are missing. Copy .env.example to .env and fill your own values.",
    );
  }

  if (accessToken && Date.now() < tokenExpirationTime) {
    return accessToken;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN!,
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(
      data.error_description || "Failed to refresh Spotify access token",
    );
  }

  accessToken = data.access_token;
  tokenExpirationTime = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
  return accessToken;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

async function spotifyFetch<T>(endpoint: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getTopTracks(): Promise<Track[]> {
  if (!credentialsConfigured()) return [];

  const data = await spotifyFetch<{ items?: SpotifyTrack[] }>(
    "/me/top/tracks?limit=10&time_range=short_term",
  );

  return (data.items ?? [])
    .map((track) => ({
      id: track.id || "",
      title: track.name || "Unknown track",
      artist: track.artists?.[0]?.name || "Unknown Artist",
      album: track.album?.name,
      duration: formatDuration(track.duration_ms || 0),
      cover: track.album?.images?.[0]?.url || "",
      previewUrl: track.preview_url || undefined,
    }))
    .filter((track) => track.id && track.cover);
}

export async function getFeaturedPlaylists(): Promise<Playlist[]> {
  if (!credentialsConfigured()) return [];

  const data = await spotifyFetch<{ items?: Array<SpotifyPlaylist | null> }>(
    "/me/playlists?limit=6",
  );

  const playlists = await Promise.all(
    (data.items ?? [])
      .filter((playlist): playlist is SpotifyPlaylist => Boolean(playlist?.id))
      .map(async (playlist) => {
        const tracksData = await spotifyFetch<{
          items?: Array<{ track?: SpotifyTrack | null }>;
        }>(`/playlists/${playlist.id}/tracks?limit=10`).catch(() => ({
          items: [],
        }));

        const tracks: Track[] = (tracksData.items || [])
          .filter((item) => item?.track?.id)
          .map((item) => {
            const track = item.track!;
            return {
              id: track.id || "",
              title: track.name || "Unknown track",
              artist: track.artists?.[0]?.name || "Unknown",
              album: track.album?.name,
              duration: formatDuration(track.duration_ms || 0),
              cover: track.album?.images?.[0]?.url || "",
              previewUrl: track.preview_url || undefined,
            };
          });

        return {
          id: playlist.id || "",
          title: playlist.name || "Untitled playlist",
          creator: playlist.owner?.display_name || "You",
          stats: `${playlist.tracks?.total || 0} Songs`,
          description: playlist.description || "Your Spotify playlist.",
          coverImages: playlist.images?.map((img) => img.url || "").filter(Boolean) || [],
          tracks,
        };
      }),
  );

  return playlists.filter((playlist) => playlist.id);
}

export async function getNewReleases(): Promise<
  { id: string; title: string; artist: string; cover: string }[]
> {
  if (!credentialsConfigured()) return [];

  const data = await spotifyFetch<{
    items?: Array<{ track?: SpotifyTrack | null }>;
  }>("/me/player/recently-played?limit=10");

  const seen = new Set<string>();
  const result: { id: string; title: string; artist: string; cover: string }[] = [];

  for (const item of data.items ?? []) {
    const track = item.track;
    if (!track?.id) continue;

    const albumId = track.album?.id;
    if (albumId && seen.has(albumId)) continue;
    if (albumId) seen.add(albumId);

    result.push({
      id: track.id,
      title: track.album?.name || track.name || "Unknown",
      artist: track.artists?.[0]?.name || "Unknown Artist",
      cover: track.album?.images?.[0]?.url || "",
    });
  }

  return result;
}
