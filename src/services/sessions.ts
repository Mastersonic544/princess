import { ref, set, update, get } from 'firebase/database';
import { db } from './firebase';
import { incrementStat } from './stats';
import type { Session, SessionInfo } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'princess_session_id';
const HEARTBEAT_INTERVAL_MS = 60_000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

/** Get existing session UUID or generate a new one */
function getOrCreateSessionId(): string {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
        id = uuidv4();
        localStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

/**
 * Initialize session on first app load.
 * Creates node in /sessions/{sessionId} if it doesn't exist.
 * Increments totalUsers in /stats if this is a new session.
 */
export async function initSession(): Promise<SessionInfo> {
    const sessionId = getOrCreateSessionId();
    const sessionRef = ref(db, `sessions/${sessionId}`);
    const snap = await get(sessionRef);
    const startedAt = Date.now();

    if (!snap.exists()) {
        const session: Session = {
            sessionId,
            startedAt,
            lastSeen: startedAt,
            scrollCount: 0,
            likeCount: 0,
            durationSeconds: 0,
        };
        await set(sessionRef, session);
        await incrementStat('totalUsers');
    }

    return { sessionId, startedAt: snap.exists() ? snap.val().startedAt : startedAt };
}

/**
 * Update lastSeen and durationSeconds every 60 seconds.
 * Call startSessionHeartbeat() after initSession().
 */
export function startSessionHeartbeat(sessionId: string, startedAt: number): void {
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    heartbeatTimer = setInterval(async () => {
        const now = Date.now();
        const sessionRef = ref(db, `sessions/${sessionId}`);
        await update(sessionRef, {
            lastSeen: now,
            durationSeconds: Math.floor((now - startedAt) / 1000),
        });
    }, HEARTBEAT_INTERVAL_MS);
}

/** Increment scroll count for this session */
export async function incrementSessionScrolls(sessionId: string): Promise<void> {
    const scrollRef = ref(db, `sessions/${sessionId}/scrollCount`);
    const snap = await get(scrollRef);
    await update(ref(db, `sessions/${sessionId}`), {
        scrollCount: (snap.val() ?? 0) + 1,
    });
}

/** Increment like count for this session */
export async function incrementSessionLikes(sessionId: string): Promise<void> {
    const likeRef = ref(db, `sessions/${sessionId}/likeCount`);
    const snap = await get(likeRef);
    await update(ref(db, `sessions/${sessionId}`), {
        likeCount: (snap.val() ?? 0) + 1,
    });
}

/** Final session update on page unload */
export async function endSession(sessionId: string, startedAt: number): Promise<void> {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    const now = Date.now();
    const sessionRef = ref(db, `sessions/${sessionId}`);
    await update(sessionRef, {
        lastSeen: now,
        durationSeconds: Math.floor((now - startedAt) / 1000),
    });
}

/** Get all sessions (admin) */
export async function getAllSessions(): Promise<Session[]> {
    const snap = await get(ref(db, 'sessions'));
    if (!snap.exists()) return [];
    const sessions: Session[] = [];
    snap.forEach((child) => { sessions.push(child.val() as Session); });
    return sessions.sort((a, b) => b.startedAt - a.startedAt);
}
