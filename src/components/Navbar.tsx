import { Icon } from '@iconify/react';

export default function Navbar() {
    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-black/60 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <a href="#" className="flex items-center gap-3 group">
                    <Icon icon="mdi:spotify" className="text-4xl text-spotify transition-transform duration-500 group-hover:rotate-180" />
                    <span className="font-serif text-xl tracking-widest uppercase hidden md:block">Collection</span>
                </a>

                <div className="hidden md:flex items-center gap-12 font-sans text-xs tracking-[0.2em] uppercase text-gray-400">
                    <a href="#home" onClick={(e) => scrollToSection(e, 'home')} className="hover:text-spotify transition-colors duration-300">Showcase</a>
                    <a href="#tracks" onClick={(e) => scrollToSection(e, 'tracks')} className="hover:text-spotify transition-colors duration-300">Top Tracks</a>
                    <a href="#playlists" onClick={(e) => scrollToSection(e, 'playlists')} className="hover:text-spotify transition-colors duration-300">Playlists</a>
                    <a href="#artists" onClick={(e) => scrollToSection(e, 'artists')} className="hover:text-spotify transition-colors duration-300">Artists</a>
                </div>

                <div className="flex items-center gap-6">
                    <button className="hover:text-spotify transition-colors">
                        <Icon icon="lucide:search" className="text-xl" />
                    </button>
                    <a href="#profile" className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-white/20 hover:border-spotify transition-colors">
                        <img src="https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838991702-9ab4f706/Hailey_Bieber___Justin_bieber__2022_.jpg" className="w-full h-full object-cover grayscale" alt="Profile" />
                    </a>
                </div>
            </div>
        </nav>
    );
}
