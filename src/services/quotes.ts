import {
    ref,
    push,
    set,
    get,
    update,
    remove,
    runTransaction,
    query,
    orderByChild,
    equalTo,
    onValue,
    type Unsubscribe,
} from 'firebase/database';
import { db } from './firebase';
import type { Quote, QuoteType } from '@/types';

const quotesRef = () => ref(db, 'quotes');
const quoteRef = (id: string) => ref(db, `quotes/${id}`);

/** Fetch all visible manual quotes (for feed — no auth required) */
export async function getManualQuotes(): Promise<Quote[]> {
    const q = query(quotesRef(), orderByChild('type'), equalTo('manual'));
    const snap = await get(q);
    if (!snap.exists()) return [];
    const quotes: Quote[] = [];
    snap.forEach((child) => {
        const q = child.val() as Quote;
        if (q.visible !== false) quotes.push({ ...q, id: child.key! });
    });
    return quotes.sort((a, b) => a.createdAt - b.createdAt);
}

/** Fetch ALL quotes (admin use — requires auth) */
export async function getAllQuotes(): Promise<Quote[]> {
    const snap = await get(quotesRef());
    if (!snap.exists()) return [];
    const quotes: Quote[] = [];
    snap.forEach((child) => {
        quotes.push({ ...child.val() as Quote, id: child.key! });
    });
    return quotes.sort((a, b) => b.createdAt - a.createdAt);
}

/** Subscribe to all quotes with a real-time listener (admin) */
export function subscribeToAllQuotes(
    callback: (quotes: Quote[]) => void
): Unsubscribe {
    return onValue(quotesRef(), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const quotes: Quote[] = [];
        snap.forEach((child) => {
            quotes.push({ ...child.val() as Quote, id: child.key! });
        });
        callback(quotes.sort((a, b) => b.createdAt - a.createdAt));
    });
}

/** Add a new hand-written quote (admin) */
export async function saveManualQuote(text: string): Promise<string> {
    const newRef = push(quotesRef());
    const id = newRef.key!;
    const quote: Quote = {
        id,
        text: text.trim(),
        type: 'manual',
        createdAt: Date.now(),
        likes: 0,
        musicMood: 'romantic', // Default for hand-written quotes
        visible: true,
    };
    await set(newRef, quote);
    return id;
}

/** Save an AI-generated quote to Firebase (called when card is returned from Groq) */
export async function saveAIQuote(
    text: string,
    imageQuery: string,
    musicMood: string
): Promise<string> {
    const newRef = push(quotesRef());
    const id = newRef.key!;
    const quote: Quote = {
        id,
        text,
        type: 'ai',
        createdAt: Date.now(),
        likes: 0,
        imageQuery,
        musicMood,
        visible: true,
    };
    await set(newRef, quote);
    return id;
}

/** Increment likes counter atomically — allowed by public Firebase rules */
export async function likeQuote(id: string): Promise<void> {
    const likesRef = ref(db, `quotes/${id}/likes`);
    await runTransaction(likesRef, (current: number | null) => (current ?? 0) + 1);
}

/** Mark an AI quote as saved via reaction (public write — allowed by rules) */
export async function markQuoteSavedByReaction(id: string): Promise<void> {
    await update(quoteRef(id), { savedBy: 'user_like' });
}

/** Toggle quote visibility (admin) */
export async function toggleVisibility(id: string, visible: boolean): Promise<void> {
    await update(quoteRef(id), { visible });
}

/** Update quote text inline (admin) */
export async function updateQuote(id: string, text: string): Promise<void> {
    await update(quoteRef(id), { text: text.trim() });
}

/** Promote an AI quote to manual status (admin) */
export async function promoteToManual(id: string): Promise<void> {
    await update(quoteRef(id), { type: 'manual' as QuoteType, savedBy: undefined });
}

/** Delete a quote (admin) */
export async function deleteQuote(id: string): Promise<void> {
    await remove(quoteRef(id));
}
