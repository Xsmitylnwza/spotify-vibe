import { Icon } from '@iconify/react';
import { tracks } from '../data/mockData';
import type { Track } from '../types';

interface TopTracksProps {
    onPlay: (track: Track) => void;
}

export default function TopTracks({ onPlay }: TopTracksProps) {
    return (
        <section id="tracks" className="py-24 px-6 max-w-7xl mx-auto relative">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16">
                <div>
                    <h2 className="font-serif text-5xl md:text-6xl mb-2">Top Tracks</h2>
                    <p className="text-gray-400 font-sans text-sm tracking-wider uppercase">This Month's Rotation</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {tracks.slice(1).map((track) => (
                    <div key={track.id} className="group cursor-pointer" onClick={() => onPlay(track)}>
                        <div className="relative overflow-hidden mb-4 aspect-square bg-gray-900">
                            <img src={track.cover}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale group-hover:grayscale-0" alt="Track" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Icon icon="ph:play-fill" className="text-4xl text-white drop-shadow-lg" />
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-serif text-2xl group-hover:text-spotify transition-colors">{track.title}</h3>
                                <p className="text-gray-500 text-sm mt-1">{track.artist}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
