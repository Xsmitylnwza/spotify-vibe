export default function Marquee() {
    return (
        <div className="w-full bg-spotify py-3 overflow-hidden border-y border-black/10 relative z-20 rotate-1">
            <div className="flex whitespace-nowrap animate-marquee">
                <span className="text-black font-serif text-2xl mx-8 italic uppercase">R&B SOUL — ALTERNATIVE — INDIE POP — LO-FI BEATS — JAZZ FUSION — NEO SOUL — </span>
                <span className="text-black font-serif text-2xl mx-8 italic uppercase">R&B SOUL — ALTERNATIVE — INDIE POP — LO-FI BEATS — JAZZ FUSION — NEO SOUL — </span>
                <span className="text-black font-serif text-2xl mx-8 italic uppercase">R&B SOUL — ALTERNATIVE — INDIE POP — LO-FI BEATS — JAZZ FUSION — NEO SOUL — </span>
                <span className="text-black font-serif text-2xl mx-8 italic uppercase">R&B SOUL — ALTERNATIVE — INDIE POP — LO-FI BEATS — JAZZ FUSION — NEO SOUL — </span>
            </div>
        </div>
    );
}
