export default function ArtistSpotlight() {
    return (
        <section id="artists" className="py-32 px-6 bg-black">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                <div className="relative">
                    <img src="https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838992214-f75531d0/Not_us_everywhere.jpg"
                        className="w-80 h-96 object-cover grayscale torn-paper-1 rotate-3 ml-12 hover:rotate-0 transition-transform duration-700" alt="Artist" />
                </div>
                <div className="lg:pl-10">
                    <span className="text-spotify text-sm uppercase tracking-widest">Artist Spotlight</span>
                    <h2 className="font-serif text-6xl md:text-7xl mb-8 leading-none">The Sound of<br /><span className="italic text-gray-400">Melancholy</span></h2>
                    <p className="text-gray-400 text-lg mb-8 max-w-md">Exploring the depths of lo-fi aesthetics and alternative R&B.</p>
                    <a href="https://open.spotify.com/artist/3pc0bOVB5whdxDNeCEABJQ" target="_blank" rel="noopener noreferrer" id="explore-artist-link" className="inline-block border-b border-white pb-1 text-sm uppercase tracking-[0.2em] hover:text-spotify hover:border-spotify transition-colors">Explore Collection on Spotify</a>
                </div>
            </div>
        </section>
    );
}
