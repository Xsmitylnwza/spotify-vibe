import { recentlyPlayed } from "../data/mockData";

export default function RecentlyPlayed() {
    return (
        <section id="recently-played" className="py-20 bg-[#0a0a0a]">
            <div className="max-w-7xl mx-auto px-6 mb-12">
                <h2 className="font-serif text-4xl">Recently Played</h2>
            </div>
            <div className="overflow-x-auto scrollbar-hide pb-12 pl-6">
                <div className="flex gap-8 w-max pr-6">
                    {recentlyPlayed.map((item, index) => (
                        <div key={index} className="w-64 relative group">
                            <div className={`aspect-[3/4] overflow-hidden relative transform transition-transform duration-500 group-hover:-translate-y-2 ${index % 2 === 0 ? 'rotate-2' : '-rotate-1'} bg-gray-800`}>
                                <img src={item.cover} className="w-full h-full object-cover grayscale opacity-70 group-hover:opacity-100 transition-all duration-500" alt="Recent" />
                            </div>
                            <div className="mt-4 text-center"><p className="font-serif text-lg">{item.title}</p><p className="text-xs text-gray-500 uppercase">{item.artist}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
