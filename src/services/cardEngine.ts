import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';
import { getManualQuotes, saveAIQuote } from './quotes';
import { FALLBACK_IMAGES, FALLBACK_QUOTES } from '@/constants/fallbacks';
import type { GeneratedCard, GroqQuoteResponse, Quote } from '@/types';

// ─── Groq System Prompt ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a voice. Not an AI assistant — a voice. The voice of one specific person writing love notes to the most important person in their life.

Your job is to generate a single love quote in that person's exact writing style, along with a music mood keyword and an image search term.

---

VOICE RULES — follow these without exception:

- Write the way this person actually types: casual spelling, dropped letters, lowercase starts, contractions without apostrophes (ddnt, wts, noth, aint, nd, u, ur, wt)
- Never write like an AI. No "in the tapestry of", no "like a gentle breeze", no greeting card phrases
- Be poetic but grounded — images from real life, not fantasy
- The emotion must feel earned, not performed
- Never use her name in the quote
- Never exceed 4 sentences
- Never use exclamation marks — the tone is calm and sincere
- Vary the form: sometimes a one-liner, sometimes a short paragraph, sometimes a question, sometimes a comparison — not always the same shape
- Emotional range: longing, protection, peace, humor, awe, wonder — not exclusively romantic. Let the feeling breathe.
- The quote can be soft and tender, or direct and honest — shift between both
- Never be generic. Each quote must feel like it could only come from this one person

---

SEED EXAMPLES — these are real quotes from this person. Study the rhythm, the lowercase, the casual spelling, the images, the realness:

1. "Cant help looking into them reminds me of when i used to dive deep at sea and ill go so far down i get infolded in darkness, u cant see wts coming and its terrifying but at the same time a sense of peace and quiet washes over u while ur hovering there staring into the darkness no thought in mind just peace"

2. "Tbh its hard focusing on both, ur beauty was so distracting u had to move to the side to give it justice"

3. "i ddnt fall for pretty u, i fell for all of u"

4. "Wake up nd the first face i see is hers... back hugs... Aint noth wrong with dreaming, the fucked up part is when ppl let them stay as dreams noth more"

5. "Me too its my second fav after u" [said in response to: "I like chocolate they mix well like us"]

---

OUTPUT FORMAT — always respond with exactly this JSON object, nothing else:

{
  "quote": "the generated quote string",
  "imageQuery": "2–4 word keyword for Unsplash image search",
  "musicMood": "pick one: upbeat, playful, fun, romantic, deep, slow, warm, happy, sweet, longing, late night"
}

imageQuery examples: "couple night city", "ocean stars couple", "hands intertwined warm light", "rain window thinking"

Never add explanation. Never add commentary. Only the JSON.`;

// ─── Rate Limiter ──────────────────────────────────────────────────────────────

const MIN_GROQ_INTERVAL_MS = 3_000; // max 1 Groq call per 3 seconds
let lastGroqCallMs = 0;

async function waitForGroqRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastGroqCallMs;
    if (elapsed < MIN_GROQ_INTERVAL_MS) {
        await new Promise((resolve) =>
            setTimeout(resolve, MIN_GROQ_INTERVAL_MS - elapsed)
        );
    }
    lastGroqCallMs = Date.now();
}

// ─── Card Engine Class ─────────────────────────────────────────────────────────

class CardEngine {
    private queue: GeneratedCard[] = [];
    private nextCardIndex = 0;          // determines alternation type
    private manualQuotes: Quote[] = [];
    private manualQuoteIndex = 0;
    private imageCache = new Map<string, string>();
    private preloadPromise: Promise<void> | null = null;
    private groq: Groq;

    constructor() {
        this.groq = new Groq({
            apiKey: import.meta.env.VITE_GROQ_API_KEY,
            dangerouslyAllowBrowser: true,
        });
    }

    // ── Initialization ───────────────────────────────────────────────────────────

    async initialize(): Promise<void> {
        this.manualQuotes = await getManualQuotes();
        // Pre-generate first 3 cards before the user sees anything
        await this.preloadNextCard();
        await this.preloadNextCard();
        await this.preloadNextCard();
    }

    // ── Queue Access ─────────────────────────────────────────────────────────────

    /** Dequeue the next ready card */
    dequeue(): GeneratedCard | null {
        return this.queue.shift() ?? null;
    }

    get queueLength(): number {
        return this.queue.length;
    }

    // ── Alternation Logic ────────────────────────────────────────────────────────

    /**
     * Cards 0–(N-1): manual (shows all available hand-written quotes first).
     * Card N+: strict alternation — ai, manual, ai, manual...
     */
    private getNextType(): 'manual' | 'ai' {
        const manualCount = this.manualQuotes.length;

        // Ensure we always start with admin quotes first (play all of them once)
        if (manualCount > 0 && this.manualQuoteIndex < manualCount) {
            return 'manual';
        }

        // Once manual pool is exhausted, switch primarily to AI
        // We can still weave them in if repeats were allowed, but the user said "no need to load it again"
        return 'ai';
    }

    // ── Main Preload Orchestration ────────────────────────────────────────────────

    async preloadNextCard(): Promise<void> {
        if (!this.preloadPromise) {
            this.preloadPromise = this._preloadNextCard().finally(() => {
                this.preloadPromise = null;
            });
        }
        return this.preloadPromise;
    }

    private async _preloadNextCard(): Promise<void> {
        const type = this.getNextType();
        this.nextCardIndex++;

        try {
            const card = type === 'manual'
                ? await this.generateManualCard()
                : await this.generateAICard();

            if (card) this.queue.push(card);
        } catch (err) {
            console.error('[CardEngine] preloadNextCard failed:', err);
            this.nextCardIndex--; // allow retry at same position
        }
    }

    // ── Manual Card Generation ───────────────────────────────────────────────────

    private async generateManualCard(): Promise<GeneratedCard | null> {
        if (this.manualQuotes.length === 0 || this.manualQuoteIndex >= this.manualQuotes.length) {
            // No manual quotes left — fall back to AI
            return this.generateAICard();
        }

        const quote = this.manualQuotes[this.manualQuoteIndex];
        this.manualQuoteIndex++;

        const imageQuery = quote.imageQuery ?? 'couple romantic light';

        const imageUrl = await this.fetchImage(imageQuery);

        return {
            id: quote.id,
            quote,
            imageUrl,
            musicMood: quote.musicMood ?? 'romantic',
            type: 'manual',
        };
    }

    // ── AI Card Generation ───────────────────────────────────────────────────────

    private async generateAICard(): Promise<GeneratedCard | null> {
        await waitForGroqRateLimit();

        let groqResponse: GroqQuoteResponse;
        try {
            groqResponse = await this.callGroq();
        } catch (err) {
            console.error('[CardEngine] Groq failed, using fallback quote:', err);
            const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
            groqResponse = {
                quote: fallback.quote,
                imageQuery: fallback.imageQuery,
                musicMood: fallback.musicMood
            };
        }

        // Save AI quote to Firebase and get its ID
        let quoteId: string;
        try {
            quoteId = await saveAIQuote(
                groqResponse.quote,
                groqResponse.imageQuery,
                groqResponse.musicMood
            );
        } catch {
            quoteId = uuidv4(); // ephemeral ID if Firebase save fails
        }

        const quote: Quote = {
            id: quoteId,
            text: groqResponse.quote,
            type: 'ai',
            createdAt: Date.now(),
            likes: 0,
            imageQuery: groqResponse.imageQuery,
            musicMood: groqResponse.musicMood,
            visible: true,
        };

        const imageUrl = await this.fetchImage(groqResponse.imageQuery);

        return {
            id: quoteId,
            quote,
            imageUrl,
            musicMood: groqResponse.musicMood,
            type: 'ai',
        };
    }

    // ── Groq API Call ────────────────────────────────────────────────────────────

    private async callGroq(): Promise<GroqQuoteResponse> {
        const completion = await this.groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.9,
            max_tokens: 200,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: 'Generate a new quote card.' },
            ],
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('Empty Groq response');

        const parsed = JSON.parse(content) as Partial<GroqQuoteResponse>;
        if (!parsed.quote || !parsed.imageQuery || !parsed.musicMood) {
            throw new Error('Groq response missing required fields');
        }
        return parsed as GroqQuoteResponse;
    }

    // ── Image Fetching ───────────────────────────────────────────────────────────

    async fetchImage(query: string): Promise<string> {
        const cacheKey = query.toLowerCase();
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey)!;
        }

        try {
            const url = new URL('https://api.unsplash.com/photos/random');
            url.searchParams.set('query', query);
            url.searchParams.set('orientation', 'portrait');
            url.searchParams.set('client_id', import.meta.env.VITE_UNSPLASH_ACCESS_KEY);

            const res = await fetch(url.toString());
            if (!res.ok) throw new Error(`Unsplash ${res.status}`);

            const data = (await res.json()) as { urls: { regular: string } };
            const imageUrl = data.urls.regular;
            this.imageCache.set(cacheKey, imageUrl);
            return imageUrl;
        } catch (err) {
            console.warn('[CardEngine] Unsplash failed, using fallback:', err);
            const fallback = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
            return fallback;
        }
    }


}

// Singleton instance — shared across the app
export const cardEngine = new CardEngine();
