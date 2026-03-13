import { useState, useCallback } from 'react';
import type { GeneratedCard } from '@/types';
import { likeQuote, markQuoteSavedByReaction } from '@/services/quotes';
import { incrementLikes, updateLastActive } from '@/services/stats';
import { cn } from '@/lib/utils';

interface QuoteCardProps {
  card: GeneratedCard;
  isActive: boolean; // Keeping for potential future use or consistency with Feed, but removing use in destructing if it triggers warning
  onLike?: () => void;
}

export default function QuoteCard({ card, onLike }: QuoteCardProps) {
  const [likeCount, setLikeCount] = useState(card.quote.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [tapping, setTapping] = useState(false);

  // ── Reaction handler ─────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    if (hasLiked) return;
    setHasLiked(true);
    setLikeCount((c) => c + 1);
    setTapping(true);
    setTimeout(() => setTapping(false), 350);

    try {
      await likeQuote(card.quote.id);
      if (card.quote.type === 'ai') {
        await markQuoteSavedByReaction(card.quote.id);
      }
      await incrementLikes();
      await updateLastActive();
      // Notify parent (increments session like count)
      onLike?.();
    } catch (err) {
      console.error('[QuoteCard] Like failed:', err);
      // Optimistic UI stays — don't revert
    }
  }, [card.quote.id, card.quote.type, hasLiked, onLike]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const isManual = card.type === 'manual';

  return (
    <div
      className="feed-card-snap animate-fade-in"
      style={{
        backgroundImage: `url(${card.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/55 to-black/90" />

      {/* Top type indicator bar */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1.5 z-10',
          isManual ? 'bg-blue-500' : 'bg-red-500'
        )}
      />

      {/* Quote text — centered in card */}
      <div className="absolute inset-0 flex items-center justify-center px-8 z-10">
        <p
          className={cn(
            'quote-text text-white text-center max-w-[85%]',
            card.quote.text.length > 300
              ? 'text-sm sm:text-base leading-relaxed'    // Very long (deep sea quote)
              : card.quote.text.length > 200
              ? 'text-base sm:text-lg leading-relaxed'    // Long
              : card.quote.text.length > 120
              ? 'text-lg sm:text-xl leading-relaxed'      // Medium
              : card.quote.text.length > 80
              ? 'text-xl sm:text-2xl leading-loose tracking-wide' // Short
              : 'text-2xl sm:text-3xl leading-loose tracking-wide font-medium' // Very short
          )}
        >
          {card.quote.text}
        </p>
      </div>

      {/* Reaction button */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
        <button
          onClick={handleLike}
          aria-label="React with melting face"
          className={cn(
            'text-3xl transition-transform select-none touch-manipulation',
            tapping && 'reaction-tap',
            hasLiked ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          )}
        >
          🫠
        </button>
        <span className="text-white/70 text-xs font-medium tabular-nums min-h-[16px]">
          {likeCount}
        </span>
      </div>

    </div>
  );
}
