import { useState } from 'react';
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

function App() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    track: null,
    isMinimized: false
  });

  const handlePlaylistSelect = (playlist: Playlist) => {
    // View ViewTransition API if available
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
      isMinimized: false
    });
  };

  const handleClosePlayer = () => {
    setPlayerState(prev => ({ ...prev, track: null, isPlaying: false }));
  };

  const handleTogglePlay = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  return (
    <div className="bg-[#050505] text-[#e5e5e5] font-sans selection:bg-spotify selection:text-black">
      <div className="noise-overlay"></div>

      <Navbar />

      <main id="main-view" className={`main-content min-h-screen relative overflow-x-hidden transition-opacity duration-300 ${selectedPlaylist ? 'hidden' : 'block'}`}>
        <Hero />
        <Marquee />
        <TopTracks onPlay={handlePlayTrack} />
        <Playlists onSelect={handlePlaylistSelect} />
        <RecentlyPlayed />
        <ArtistSpotlight />
        <Footer />
      </main>

      {/* Detail Overlay */}
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
  )
}

export default App
