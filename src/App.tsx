import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import TopTracks from './components/TopTracks';
import Playlists from './components/Playlists';
import RecentlyPlayed from './components/RecentlyPlayed';
import ArtistSpotlight from './components/ArtistSpotlight';
import Footer from './components/Footer';
import PlaylistDetail from './components/PlaylistDetail';
import PreviewPlayer from './components/PreviewPlayer';
import type { Playlist, PlayerState, Track } from './types';
import { getTopTracks, getFeaturedPlaylists, getNewReleases } from './services/spotify';
import {
  tracks as mockTracks,
  playlists as mockPlaylists,
  recentlyPlayed as mockRecent,
} from './data/mockData';

type RecentItem = {
  id: string;
  title: string;
  artist: string;
  cover: string;
};

function toRecentItems(items: Array<{ title: string; artist: string; cover: string }>): RecentItem[] {
  return items.map((item, index) => ({
    id: String(index + 1),
    title: item.title,
    artist: item.artist,
    cover: item.cover,
  }));
}

function App() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    track: null,
    isMinimized: false,
  });

  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [fetchedTracks, fetchedPlaylists, fetchedRecent] = await Promise.all([
          getTopTracks(),
          getFeaturedPlaylists(),
          getNewReleases(),
        ]);

        const hasLiveData =
          fetchedTracks.length > 0 ||
          fetchedPlaylists.length > 0 ||
          fetchedRecent.length > 0;

        if (hasLiveData) {
          setTracks(fetchedTracks);
          setPlaylists(fetchedPlaylists);
          setRecent(fetchedRecent);
          setUsingMockData(false);
        } else {
          setTracks(mockTracks);
          setPlaylists(mockPlaylists);
          setRecent(toRecentItems(mockRecent));
          setUsingMockData(true);
        }
      } catch (error) {
        console.warn('Spotify live data unavailable, using local mock data.', error);
        setTracks(mockTracks);
        setPlaylists(mockPlaylists);
        setRecent(toRecentItems(mockRecent));
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, []);

  const handlePlaylistSelect = (playlist: Playlist) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setSelectedPlaylist(playlist);
      });
    } else {
      setSelectedPlaylist(playlist);
    }
  };

  const handlePlaylistClose = () => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setSelectedPlaylist(null);
      });
    } else {
      setSelectedPlaylist(null);
    }
  };

  const handlePlayTrack = (track: Track) => {
    setPlayerState({
      isPlaying: true,
      track,
      isMinimized: false,
    });
  };

  const handleClosePlayer = () => {
    setPlayerState((prev) => ({ ...prev, track: null, isPlaying: false }));
  };

  const handleTogglePlay = () => {
    setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-spotify"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] text-[#e5e5e5] font-sans selection:bg-spotify selection:text-black">
      <div className="noise-overlay"></div>
      <Navbar />

      <main
        id="main-view"
        className={`main-content min-h-screen relative overflow-x-hidden transition-opacity duration-300 ${selectedPlaylist ? 'hidden' : 'block'}`}
      >
        {usingMockData && (
          <div className="mx-auto max-w-5xl px-4 pt-4 text-sm text-amber-200/90">
            Showing local mock data. Add Spotify credentials in <code>.env</code> to load your account.
          </div>
        )}
        <Hero />
        <Marquee />
        <TopTracks onPlay={handlePlayTrack} tracks={tracks} />
        <Playlists onSelect={handlePlaylistSelect} playlists={playlists} />
        <RecentlyPlayed items={recent} />
        <ArtistSpotlight />
        <Footer />
      </main>

      {selectedPlaylist && (
        <PlaylistDetail
          playlist={selectedPlaylist}
          onClose={handlePlaylistClose}
          onPlayTrack={handlePlayTrack}
        />
      )}

      <PreviewPlayer
        playerState={playerState}
        onClose={handleClosePlayer}
        onToggle={handleTogglePlay}
      />
    </div>
  );
}

export default App;
