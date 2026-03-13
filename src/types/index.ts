/** Quote stored in Firebase /quotes/{quoteId} */
export type QuoteType = 'manual' | 'ai';

export interface Quote {
    id: string;
    text: string;
    type: QuoteType;
    createdAt: number;
    likes: number;
    imageQuery?: string;
    musicMood: string;
    savedBy?: 'user_like';
    visible: boolean;
}

/** Anonymous session stored in Firebase /sessions/{sessionId} */
export interface Session {
    sessionId: string;
    startedAt: number;
    lastSeen: number;
    scrollCount: number;
    likeCount: number;
    durationSeconds: number;
}

/** Global aggregate stats stored in Firebase /stats/ */
export interface Stats {
    totalUsers: number;
    activeUsers: number;
    totalScrolls: number;
    totalLikes: number;
    totalHoursScrolled: number;
    lastActive: number;
}

/** Raw Groq API response shape */
export interface GroqQuoteResponse {
    quote: string;
    imageQuery: string;
    musicMood: string;
}

/** A fully assembled card ready for display */
export interface GeneratedCard {
    /** Unique card ID (Firebase quote ID or ephemeral UUID for AI cards not yet saved) */
    id: string;
    quote: Quote;
    imageUrl: string;
    musicMood: string;
    type: QuoteType;
}

/** Session initialization result */
export interface SessionInfo {
    sessionId: string;
    startedAt: number;
}
