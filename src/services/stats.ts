import {
    ref,
    runTransaction,
    onValue,
    type Unsubscribe,
} from 'firebase/database';
import { db } from './firebase';
import type { Stats } from '@/types';

const statsRef = () => ref(db, 'stats');
const statFieldRef = (field: keyof Stats) => ref(db, `stats/${field}`);

/** Atomically increment a stats counter by 1 */
export async function incrementStat(field: keyof Stats): Promise<void> {
    await runTransaction(statFieldRef(field), (current: number | null) =>
        (current ?? 0) + 1
    );
}

/** Increment totalScrolls */
export async function incrementScrolls(): Promise<void> {
    await incrementStat('totalScrolls');
}

/** Increment totalLikes */
export async function incrementLikes(): Promise<void> {
    await incrementStat('totalLikes');
}

/** Decrement totalLikes */
export async function decrementLikes(): Promise<void> {
    await runTransaction(statFieldRef('totalLikes'), (current: number | null) =>
        Math.max(0, (current ?? 0) - 1)
    );
}

/** Add seconds to totalHoursScrolled (converted from seconds) */
export async function addScrolledTime(seconds: number): Promise<void> {
    const hoursRef = statFieldRef('totalHoursScrolled');
    await runTransaction(hoursRef, (current: number | null) =>
        (current ?? 0) + seconds / 3600
    );
}

/** Update lastActive timestamp */
export async function updateLastActive(): Promise<void> {
    await runTransaction(statFieldRef('lastActive'), () => Date.now());
}

/**
 * Compute and write activeUsers count.
 * An active user is a session with lastSeen within the last 30 minutes.
 * This is called by the admin dashboard on mount.
 */
export async function updateActiveUsers(): Promise<void> {
    const { get } = await import('firebase/database');
    const snap = await get(ref(db, 'sessions'));
    if (!snap.exists()) return;

    const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
    let active = 0;
    snap.forEach((child) => {
        const session = child.val();
        if (session.lastSeen >= thirtyMinsAgo) active++;
    });

    await runTransaction(statFieldRef('activeUsers'), () => active);
}

/**
 * Subscribe to stats with a real-time listener.
 * Returns an unsubscribe function.
 */
export function subscribeToStats(callback: (stats: Stats) => void): Unsubscribe {
    return onValue(statsRef(), (snap) => {
        if (!snap.exists()) {
            callback({
                totalUsers: 0,
                activeUsers: 0,
                totalScrolls: 0,
                totalLikes: 0,
                totalHoursScrolled: 0,
                lastActive: 0,
            });
            return;
        }
        callback(snap.val() as Stats);
    });
}

/** One-time stats fetch (for non-reactive use) */
export async function getStats(): Promise<Stats> {
    const { get } = await import('firebase/database');
    const snap = await get(statsRef());
    if (!snap.exists()) {
        return {
            totalUsers: 0,
            activeUsers: 0,
            totalScrolls: 0,
            totalLikes: 0,
            totalHoursScrolled: 0,
            lastActive: 0,
        };
    }
    return snap.val() as Stats;
}
