import { useState, useCallback } from 'react';
import type { GeneratedCard } from '@/types';
import { likeQuote, unlikeQuote, markQuoteSavedByReaction } from '@/services/quotes';
import { incrementLikes, decrementLikes, updateLastActive } from '@/services/stats';
import { cn } from '@/lib/utils';

interface QuoteCardProps {
  card: GeneratedCard;
  isActive: boolean; // Keeping for potential future use or consistency with Feed, but removing use in destructing if it triggers warning
  onLike?: (liked: boolean) => void;
}

export default function QuoteCard({ card, onLike }: QuoteCardProps) {
  const [likeCount, setLikeCount] = useState(card.quote.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [tapping, setTapping] = useState(false);

  // ── Reaction handler ─────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    const isLiking = !hasLiked;
    
    // Optimistic UI update
    setHasLiked(isLiking);
    setLikeCount((c) => isLiking ? c + 1 : c - 1);
    
    if (isLiking) {
      setTapping(true);
      // Tapping state for the central pop animation
      setTimeout(() => setTapping(false), 800);
    }

    try {
      if (isLiking) {
        await likeQuote(card.quote.id);
        if (card.quote.type === 'ai') {
          await markQuoteSavedByReaction(card.quote.id);
        }
        await incrementLikes();
      } else {
        await unlikeQuote(card.quote.id);
        await decrementLikes();
      }
      
      await updateLastActive();
      // Notify parent (adjusts session like count)
      onLike?.(isLiking);
    } catch (err) {
      console.error('[QuoteCard] Like/Unlike failed:', err);
      // Revert optimistic UI on failure
      setHasLiked(!isLiking);
      setLikeCount((c) => isLiking ? c - 1 : c + 1);
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

      {/* Central Heart Pop Effect */}
      {tapping && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <svg
            viewBox="0 0 24 24"
            fill="white"
            className="w-32 h-32 heart-pop"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      )}

      {/* Reaction button */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
        <button
          onClick={handleLike}
          aria-label="Like"
          className={cn(
            'heart-button p-2 select-none touch-manipulation',
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className={cn(
              'w-10 h-10 transition-colors duration-200',
              hasLiked ? 'fill-red-500 stroke-red-500' : 'fill-transparent stroke-white/80'
            )}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>
        <span className="text-white/70 text-xs font-medium tabular-nums min-h-[16px]">
          {likeCount}
        </span>
      </div>

    </div>
  );
}
