import { Icon } from '@iconify/react';
import type { Playlist, Track } from '../types';

interface PlaylistDetailProps {
    playlist: Playlist | null;
    onClose: () => void;
    onPlayTrack: (track: Track) => void;
}

export default function PlaylistDetail({ playlist, onClose, onPlayTrack }: PlaylistDetailProps) {
    if (!playlist) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-[#050505] overflow-y-auto animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto px-6 py-12">

                {/* Back Button */}
                <button onClick={onClose} className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-400 hover:text-spotify transition-colors mb-16 group">
                    <Icon icon="ph:arrow-left" className="text-xl group-hover:-translate-x-1 transition-transform" />
                    Back to Collection
                </button>

                {/* Header Info */}
                <div className="flex flex-col lg:flex-row gap-12 items-end mb-24">
                    <div className="w-64 h-64 md:w-80 md:h-80 shadow-2xl relative rotate-2">
                        {playlist.coverImages.length > 1 ? (
                            <img src={playlist.coverImages[0]} className="w-full h-full object-cover torn-paper-1 grayscale" alt="Playlist Cover" />
                        ) : (
                            <img src={playlist.coverImages[0]} className="w-full h-full object-cover torn-paper-1 grayscale" alt="Playlist Cover" />
                        )}
                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-spotify rounded-full flex items-center justify-center text-black shadow-lg">
                            <Icon icon="ph:music-notes-fill" className="text-2xl" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="text-spotify text-xs uppercase tracking-[0.4em] mb-4">Public Playlist</div>
                        <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl leading-none mb-6">{playlist.title}</h1>
                        <div className="flex items-center gap-6 text-sm text-gray-400 font-sans tracking-widest uppercase">
                            <span>{playlist.creator}</span>
                            <span>{playlist.stats}</span>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button className="px-8 py-3 bg-spotify text-black text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-2">
                                <Icon icon="ph:play-fill" className="text-lg" /> Play Session
                            </button>
                            <button className="px-8 py-3 border border-white/20 text-xs font-bold uppercase tracking-widest hover:border-spotify hover:text-spotify transition-colors">
                                Follow
                            </button>
                            <button className="w-12 h-12 flex items-center justify-center border border-white/20 hover:text-spotify transition-colors">
                                <Icon icon="ph:share-network" className="text-xl" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tracks Table */}
                <div className="mb-32">
                    <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4">
                        <div className="w-8">#</div>
                        <div>Title</div>
                        <div className="hidden md:block">Album</div>
                        <div className="w-12 text-right"><Icon icon="ph:clock" /></div>
                    </div>

                    <div className="space-y-1">
                        {playlist.tracks.map((track, index) => (
                            <div key={index} className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-4 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer items-center" onClick={() => onPlayTrack(track)}>
                                <div className="w-8 text-gray-500 group-hover:hidden">{index + 1}</div>
                                <div className="w-8 hidden group-hover:block text-spotify"><Icon icon="ph:play-fill" /></div>
                                <div className="flex items-center gap-4">
                                    <img src={track.cover} className="w-10 h-10 object-cover grayscale group-hover:grayscale-0 transition-all" />
                                    <div>
                                        <div className="text-sm text-white font-medium group-hover:text-spotify transition-colors">{track.title}</div>
                                        <div className="text-xs text-gray-500">{track.artist}</div>
                                    </div>
                                </div>
                                <div className="hidden md:block text-xs text-gray-400 italic font-serif">{track.album || "Single"}</div>
                                <div className="w-12 text-right text-xs text-gray-500 font-mono">{track.duration}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
