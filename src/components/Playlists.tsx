import { Icon } from '@iconify/react';
import type { Playlist } from '../types';

interface PlaylistsProps {
    onSelect: (playlist: Playlist) => void;
    playlists: Playlist[];
}

export default function Playlists({ onSelect, playlists }: PlaylistsProps) {
    return (
        <section id="playlists" className="py-24 px-6 bg-[#080808] border-y border-white/5">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16">
                    <div>
                        <h2 className="font-serif text-5xl md:text-6xl mb-2">My Playlists</h2>
                        <p className="text-gray-400 font-sans text-sm tracking-wider uppercase">Curated Vibes & Collections</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {playlists.map((playlist, index) => {
                        // Different rotation/paper classes based on index (simulating "organic" look)
                        const rotation = index === 0 ? '-rotate-2' : index === 1 ? 'rotate-1' : '-rotate-1';
                        const paperClass = index === 1 ? 'torn-paper-2' : 'torn-paper-1';

                        return (
                            <div key={playlist.id} className="group relative cursor-pointer playlist-card" onClick={() => onSelect(playlist)}>
                                <div className={`relative aspect-square mb-6 transform ${rotation} group-hover:rotate-0 transition-transform duration-500`}>
                                    {/* Collage or Single Image Cover */}
                                    {playlist.coverImages.length > 1 ? (
                                        <div className={`grid grid-cols-2 w-full h-full shadow-2xl overflow-hidden ${paperClass} grayscale group-hover:grayscale-0 transition-all duration-700`}>
                                            {playlist.coverImages.slice(0, 4).map((img, i) => (
                                                <img key={i} src={img} className={`w-full h-full object-cover ${(i === 0 || i === 2) && 'border-r'} ${i < 2 && 'border-b'} border-white/10`} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={`w-full h-full shadow-2xl overflow-hidden ${paperClass} grayscale group-hover:grayscale-0 transition-all duration-700 bg-gray-800`}>
                                            <img src={playlist.coverImages[0]} className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-spotify/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-4">
                                        <button className="w-16 h-16 rounded-full bg-spotify text-black flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                                            <Icon icon="ph:play-fill" className="text-3xl ml-1" />
                                        </button>
                                        <span className="text-xs uppercase tracking-widest bg-black/80 px-4 py-2 rounded-full">View Collection</span>
                                    </div>
                                </div>
                                <div className="px-2">
                                    <h3 className="font-serif text-3xl mb-1 group-hover:text-spotify transition-colors">{playlist.title}</h3>
                                    <p className="text-gray-500 text-sm italic">{playlist.description}</p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-widest text-gray-400">{playlist.stats}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
