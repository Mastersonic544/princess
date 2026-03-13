export type Track = {
    id: string;        // YouTube video ID
    title: string;
    artist: string;
    mood: string[];    // mood tags this track matches
};

export const TRACK_POOL: Track[] = [
    {
        id: 'pRpeEdMmmQ0',
        title: 'Shape of You',
        artist: 'Ed Sheeran',
        mood: ['upbeat', 'playful', 'fun'],
    },
    {
        id: '450p7goxZqg',
        title: 'All of Me',
        artist: 'John Legend',
        mood: ['romantic', 'deep', 'slow'],
    },
    {
        id: 'rtOvBOTyX00',
        title: 'Golden Hour',
        artist: 'JVKE',
        mood: ['warm', 'happy', 'romantic'],
    },
    {
        id: 'h_D3VFfhvs4',
        title: 'Perfect',
        artist: 'Ed Sheeran',
        mood: ['romantic', 'slow', 'sweet'],
    },
    {
        id: 'kXYiU_JCYtU',
        title: 'Nights',
        artist: 'Frank Ocean',
        mood: ['deep', 'longing', 'late night'],
    },
    // Placeholder slots for future video IDs
    // { id: 'PLACEHOLDER_1', title: '', artist: '', mood: [] },
    // { id: 'PLACEHOLDER_2', title: '', artist: '', mood: [] },
    // { id: 'PLACEHOLDER_3', title: '', artist: '', mood: [] },
    // { id: 'PLACEHOLDER_4', title: '', artist: '', mood: [] },
    // { id: 'PLACEHOLDER_5', title: '', artist: '', mood: [] },
];

/**
 * Returns a random track from the pool.
 */
export const getRandomTrack = (): Track => {
    const randomIndex = Math.floor(Math.random() * TRACK_POOL.length);
    return TRACK_POOL[randomIndex];
};

/**
 * Finds the best match from the pool by mood tag.
 * Falls back to a random track if no match is found.
 * @param mood The mood tag to search for.
 */
export const getTrackByMood = (mood: string): Track => {
    const matches = TRACK_POOL.filter((track) => track.mood.includes(mood));

    if (matches.length > 0) {
        const randomIndex = Math.floor(Math.random() * matches.length);
        return matches[randomIndex];
    }

    return getRandomTrack();
};
