import type { Playlist, Track } from "../types";

export const tracks: Track[] = [
    {
        id: "1",
        title: "Understand",
        artist: "Keshi",
        album: "GABRIEL",
        duration: "3:32",
        cover: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838927255-8dfc650a/f25d6e80f442ce4dc10c171831b1fc76.jpg"
    },
    {
        id: "2",
        title: "Soft Spot",
        artist: "Keshi",
        album: "Always",
        duration: "3:12",
        cover: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838991440-0d5954da/_______.jpg"
    },
    {
        id: "3",
        title: "Die For You",
        artist: "Joji",
        album: "Smithereens",
        duration: "3:31",
        cover: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838991959-5852539d/___________1_.jpg"
    },
    {
        id: "4",
        title: "Peaches",
        artist: "Justin Bieber",
        album: "Justice",
        duration: "3:18",
        cover: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838992467-a303f153/200__Couples_Posing_Prompts_for_Photographers.jpg"
    }
];

export const playlists: Playlist[] = [
    {
        id: "vibes-001",
        title: "Midnight Reflections",
        creator: "Curated by You",
        stats: "24 Songs • 1h 12m",
        description: "A journey through soft acoustics and late-night thoughts.",
        coverImages: [
            "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838992214-f75531d0/Not_us_everywhere.jpg",
            "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838935452-20adf132/images__3_.jpg",
            "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838991440-0d5954da/_______.jpg",
            "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838927255-8dfc650a/f25d6e80f442ce4dc10c171831b1fc76.jpg"
        ],
        tracks: [tracks[0], tracks[1], tracks[2], tracks[3], tracks[0], tracks[1]]
    },
    {
        id: "indie-alt",
        title: "Alternative Escapes",
        creator: "Curated by You",
        stats: "18 Songs • 58m",
        description: "Gritty basslines and dreamy synthesizers for everyday escapes.",
        coverImages: [
            "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838991959-5852539d/___________1_.jpg"
        ],
        tracks: [tracks[2], tracks[3], tracks[0]]
    },
    {
        id: "jazz-neo",
        title: "Neo-Soul Sunday",
        creator: "Curated by You",
        stats: "32 Songs • 2h 05m",
        description: "Warm harmonies and smooth grooves to slow down your day.",
        coverImages: [
            "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838992467-a303f153/200__Couples_Posing_Prompts_for_Photographers.jpg"
        ],
        tracks: [tracks[3], tracks[0], tracks[1]]
    }
];

export const recentlyPlayed = [
    {
        title: "Midnight City",
        artist: "M83",
        cover: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838927255-8dfc650a/f25d6e80f442ce4dc10c171831b1fc76.jpg"
    },
    {
        title: "Stay",
        artist: "Kid LAROI",
        cover: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/be7bd51c-6dd7-4e04-a620-8108ef138948/1768838991702-9ab4f706/Hailey_Bieber___Justin_bieber__2022_.jpg"
    }
];
