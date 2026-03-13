/**
 * Fallback assets used when Jamendo/Unsplash APIs return no results.
 * These are hardcoded so the app works in full offline/API-failure mode.
 */


/**
 * 10 Unsplash fallback image URLs — pre-approved romantic/couple portrait images.
 * These are static URLs; replace with your own approved set when deploying.
 */
export const FALLBACK_IMAGES: string[] = [
    'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80',
    'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&q=80',
    'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=800&q=80',
    'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80',
    'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800&q=80',
    'https://images.unsplash.com/photo-1502810190503-8303352d0dd1?w=800&q=80',
    'https://images.unsplash.com/photo-1494200483891-8e2df7d24b51?w=800&q=80',
    'https://images.unsplash.com/photo-1543854589-fef573871bd5?w=800&q=80',
    'https://images.unsplash.com/photo-1488135776646-37b39e0bb093?w=800&q=80',
    'https://images.unsplash.com/photo-1515552726023-7125c8d07fb3?w=800&q=80',
];

/** Seed quotes for Groq fallback if API fails entirely */
export const FALLBACK_QUOTES = [
    {
        quote: "i ddnt fall for pretty u, i fell for all of u",
        imageQuery: 'couple warm light',
        musicMood: 'romantic',
    },
    {
        quote: "Cant help looking into them reminds me of when i used to dive deep at sea and ill go so far down i get infolded in darkness, u cant see wts coming and its terrifying but at the same time a sense of peace and quiet washes over u while ur hovering there staring into the darkness no thought in mind just peace",
        imageQuery: 'ocean dark deep light',
        musicMood: 'deep',
    },
    {
        quote: "Wake up nd the first face i see is hers... back hugs... Aint noth wrong with dreaming, the fucked up part is when ppl let them stay as dreams noth more",
        imageQuery: 'morning light soft couple',
        musicMood: 'sweet',
    },
    {
        quote: "Tbh its hard focusing on both, ur beauty was so distracting u had to move to the side to give it justice",
        imageQuery: 'portrait golden hour',
        musicMood: 'warm',
    },
    {
        quote: "Me too its my second fav after u",
        imageQuery: 'coffee warm cozy night',
        musicMood: 'late night',
    },
];
