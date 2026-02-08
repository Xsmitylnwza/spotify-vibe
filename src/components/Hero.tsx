import { Icon } from '@iconify/react';

export default function Hero() {
    const scrollToPlaylists = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        document.getElementById('playlists')?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToTracks = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        document.getElementById('tracks')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <header id="home" className="relative min-h-screen pt-20 flex flex-col items-center justify-center overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-spotify/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen animate-float-delayed"></div>
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center">

                {/* Text Content */}
                <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1">

                    {/* Vibe Tag */}
                    <div className="inline-flex items-center gap-3 px-4 py-2 border border-white/10 rounded-full mb-8 bg-white/5 backdrop-blur-md hover:border-spotify/50 transition-colors duration-500 group cursor-default">
                        <Icon icon="ph:wave-sine" className="text-spotify text-xl group-hover:animate-pulse" />
                        <span className="font-sans text-xs tracking-[0.2em] uppercase text-gray-300 group-hover:text-white transition-colors">Audio Visual Journal</span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.9] mb-8 text-white tracking-tight mix-blend-difference">
                        Sonic <br className="hidden lg:block" />
                        <span className="italic text-gray-500 font-light relative">
                            Memoir
                            <Icon icon="ph:sparkle-fill" className="hidden lg:inline-block absolute -top-4 -right-12 text-3xl text-spotify animate-pulse" />
                        </span>
                    </h1>

                    {/* Narrative Copy */}
                    <div className="relative max-w-xl">
                        <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-spotify to-transparent opacity-30 hidden lg:block"></div>
                        <p className="font-serif text-2xl md:text-3xl leading-relaxed text-gray-300 mb-10 pl-0 lg:pl-6">
                            "This isn't just a playlist collection. It's a <span className="text-spotify italic drop-shadow-[0_0_8px_rgba(29,185,84,0.3)]">visual autobiography</span> written in melodies. Each song is a memory. Each playlist is a mood."
                        </p>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
                        <a href="#playlists" onClick={scrollToPlaylists} className="group relative px-8 py-4 bg-spotify text-black font-sans font-bold text-xs uppercase tracking-[0.2em] overflow-hidden transition-all hover:bg-white hover:scale-105">
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Explore Playlists
                                <Icon icon="ph:arrow-right-bold" className="text-lg group-hover:translate-x-1 transition-transform" />
                            </span>
                        </a>
                        <a href="#tracks" onClick={scrollToTracks} className="group px-8 py-4 border border-white/20 text-white font-sans font-bold text-xs uppercase tracking-[0.2em] hover:border-spotify hover:text-spotify transition-all hover:bg-white/5">
                            Top Tracks
                        </a>
                    </div>

                    {/* Stats / Footer of Hero */}
                    <div className="mt-12 pt-8 border-t border-white/5 w-full flex justify-center lg:justify-start gap-8 md:gap-12 text-gray-500 font-sans text-[10px] uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2">
                            <span className="text-lg text-spotify font-serif italic">12</span> Collections
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg text-spotify font-serif italic">342</span> Tracks
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg text-spotify font-serif italic">∞</span> Vibes
                        </div>
                    </div>
                </div>

                {/* Visual Collage */}
                <div className="lg:col-span-5 h-[500px] lg:h-[700px] relative order-1 lg:order-2 perspective-1000">

                    {/* Floating Elements */}
                    <div className="absolute inset-0 flex items-center justify-center">

                        {/* Back Layer (Vinyl) */}
                        <div className="absolute w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-black rounded-full border border-white/10 shadow-2xl animate-spin-slow opacity-80 lg:-translate-x-12">
                            <div className="absolute inset-0 rounded-full border-[20px] border-black opacity-50" style={{ background: 'repeating-radial-gradient(#111 0, #111 2px, #222 3px, #222 4px)' }}></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 bg-spotify rounded-full flex items-center justify-center">
                                <div className="w-3 h-3 bg-black rounded-full"></div>
                            </div>
                        </div>

                        {/* Middle Layer (Photo) */}
                        <div className="absolute w-64 h-80 md:w-72 md:h-96 lg:w-80 lg:h-[450px] transform -rotate-6 hover:rotate-0 transition-transform duration-700 z-10">
                            <img src="https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838242918-60798e6e/Justin_and_Hailey_Bieber___.jpg"
                                className="w-full h-full object-cover shadow-[0_20px_50px_rgba(0,0,0,0.5)] torn-paper-1 grayscale hover:grayscale-0 transition-all duration-700" alt="Hero Mood" />
                        </div>

                        {/* Front Layer (Overlay Photo) */}
                        <div className="absolute bottom-0 -right-4 lg:bottom-10 lg:right-0 w-40 h-56 md:w-48 md:h-64 lg:w-56 lg:h-72 transform rotate-6 hover:-rotate-3 transition-transform duration-700 z-20 hidden md:block">
                            <img src="https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838992214-f75531d0/Not_us_everywhere.jpg"
                                className="w-full h-full object-cover shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/10 grayscale contrast-125 hover:grayscale-0 transition-all duration-700" alt="Detail" />
                        </div>

                        {/* Decorative Sticker */}
                        <div className="absolute top-10 right-0 lg:top-20 lg:-right-10 z-30 animate-bounce-slow">
                            <Icon icon="ph:star-four-fill" className="text-4xl text-spotify drop-shadow-[0_0_10px_rgba(29,185,84,0.5)]" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
