import { useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import type { PlayerState } from '../types';

interface PreviewPlayerProps {
    playerState: PlayerState;
    onClose: () => void;
    onToggle: () => void;
}

export default function PreviewPlayer({ playerState, onClose, onToggle }: PreviewPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (playerState.track?.previewUrl) {
            if (!audioRef.current) {
                audioRef.current = new Audio(playerState.track.previewUrl);
                audioRef.current.volume = 0.5;
            } else if (audioRef.current.src !== playerState.track.previewUrl) {
                audioRef.current.src = playerState.track.previewUrl;
            }

            if (playerState.isPlaying) {
                audioRef.current.play().catch(e => console.log("Audio play error", e));
            } else {
                audioRef.current.pause();
            }
        } else {
            // Track has no preview or is playing is toggled without track
            if (audioRef.current) {
                audioRef.current.pause();
            }
        }
    }, [playerState.isPlaying, playerState.track]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    if (!playerState.track) return null;

    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-white text-black h-20 px-6 rounded-full shadow-2xl z-[100] flex items-center justify-between transition-all duration-500 ${playerState.track ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 overflow-hidden rounded-full">
                    <img src={playerState.track.cover} className="w-full h-full object-cover grayscale" alt="Cover" />
                </div>
                <div>
                    <p className="text-sm font-bold truncate w-32 md:w-48">
                        {playerState.track.title}
                        {!playerState.track.previewUrl && <span className="text-red-500 ml-2 text-xs">(No Preview)</span>}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">{playerState.track.artist}</p>
                </div>
            </div>
            <div className="flex flex-col items-center flex-1 max-w-xs mx-4">
                <div className="flex items-center gap-6">
                    <button className="hover:text-spotify transition-colors"><Icon icon="ph:skip-back-fill" className="text-xl" /></button>
                    <button onClick={onToggle} className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
                        <Icon icon={playerState.isPlaying ? "ph:pause-fill" : "ph:play-fill"} className="text-xl" />
                    </button>
                    <button className="hover:text-spotify transition-colors"><Icon icon="ph:skip-forward-fill" className="text-xl" /></button>
                </div>
                <div className="w-full h-[2px] bg-gray-200 mt-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-spotify w-1/3 animate-pulse"></div>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><Icon icon="ph:x-bold" /></button>
        </div>
    );
}
