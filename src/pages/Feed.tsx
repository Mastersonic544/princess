import { useEffect, useRef, useState, useCallback } from 'react';
import { cardEngine } from '@/services/cardEngine';
import {
  initSession,
  startSessionHeartbeat,
  incrementSessionScrolls,
  incrementSessionLikes,
  decrementSessionLikes,
  endSession,
} from '@/services/sessions';
import { incrementScrolls, updateLastActive } from '@/services/stats';
import QuoteCard from '@/components/feed/QuoteCard';
import LoadingSkeleton from '@/components/feed/LoadingSkeleton';
import SplashScreen from '../components/feed/SplashScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { GeneratedCard, SessionInfo } from '@/types';

/** AdSense banner — injected once globally at bottom of viewport */
function AdSenseBanner() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID;
    if (!publisherId || !ref.current) return;

    // Inject the AdSense script only once
    if (!document.querySelector('#adsense-script')) {
      const script = document.createElement('script');
      script.id = 'adsense-script';
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    const slotId = import.meta.env.VITE_ADSENSE_AD_SLOT_ID;

    // Inject the ad unit
    if (ref.current.childElementCount === 0) {
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', publisherId);
      if (slotId) {
        ins.setAttribute('data-ad-slot', slotId);
      }
      ref.current.appendChild(ins);
      (window as { adsbygoogle?: unknown[] }).adsbygoogle =
        (window as { adsbygoogle?: unknown[] }).adsbygoogle ?? [];
      ((window as { adsbygoogle?: unknown[] }).adsbygoogle as unknown[]).push({});
    }
  }, []);

  if (!import.meta.env.VITE_ADSENSE_PUBLISHER_ID) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-black/80"
      style={{ minHeight: '50px' }}
      ref={ref}
    />
  );
}

const MIN_QUEUE_AHEAD = 2;

export default function Feed() {
  const [cards, setCards] = useState<(GeneratedCard | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const isLoadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ── Initialize on mount ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      // Start session
      const info = await initSession();
      if (cancelled) return;
      sessionRef.current = info;
      startSessionHeartbeat(info.sessionId, info.startedAt);

      // Initialize card engine + fill initial queue
      await cardEngine.initialize();
      if (cancelled) return;

      const initial: (GeneratedCard | null)[] = [];
      for (let i = 0; i < 3; i++) {
        initial.push(cardEngine.dequeue());
      }
      setCards(initial.filter(Boolean) as GeneratedCard[]);
      setIsReady(true);
    }

    setup().catch(console.error);

    // End session on unload
    const handleUnload = () => {
      if (sessionRef.current) {
        void endSession(sessionRef.current.sessionId, sessionRef.current.startedAt);
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // ── Preload more cards as user scrolls ────────────────────────────────────
  const maybePreload = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      // Keep at least MIN_QUEUE_AHEAD cards in reserve beyond current
      while (cardEngine.queueLength < MIN_QUEUE_AHEAD) {
        await cardEngine.preloadNextCard();
        const next = cardEngine.dequeue();
        if (next) setCards((prev) => [...prev, next]);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // ── Scroll detection via IntersectionObserver ─────────────────────────────
  // Create observer only once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(
              (entry.target as HTMLElement).dataset.cardIndex ?? '0',
              10
            );
            setActiveIndex(idx);

            // Preload when user is on card N-1 (second to last visible)
            setCards((prev) => {
              if (idx >= prev.length - 2) {
                void maybePreload();
              }
              return prev;
            });

            // Track scroll in Firebase
            if (sessionRef.current) {
              void incrementSessionScrolls(sessionRef.current.sessionId);
              void incrementScrolls();
              void updateLastActive();
            }
          }
        });
      },
      { root: container, threshold: 0.7 }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [maybePreload]);

  // Connect observer to new cards as they arrive
  useEffect(() => {
    const container = containerRef.current;
    const observer = observerRef.current;
    if (!container || !observer) return;

    // We only observe elements that haven't been observed yet to prevent leak
    const cardEls = container.querySelectorAll('[data-card-index]:not([data-observed])');
    cardEls.forEach((el) => {
      observer.observe(el);
      el.setAttribute('data-observed', 'true');
    });
  }, [cards.length]);

  const handleLike = useCallback((liked: boolean) => {
    if (sessionRef.current) {
      if (liked) {
        void incrementSessionLikes(sessionRef.current.sessionId);
      } else {
        void decrementSessionLikes(sessionRef.current.sessionId);
      }
    }
  }, []);

  const dismissSplash = useCallback(() => {
    if (!isReady || isFadingOut) return;
    setIsFadingOut(true);
    // Remove from DOM after transition
    setTimeout(() => setShowSplash(false), 500);
  }, [isReady, isFadingOut]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {showSplash && (
        <SplashScreen 
          isReady={isReady} 
          onDismiss={dismissSplash} 
          isFadingOut={isFadingOut}
        />
      )}
      
      <div 
        ref={containerRef} 
        className="feed-container relative"
        onWheel={dismissSplash}
        onTouchStart={dismissSplash}
      >
        {cards.length === 0 ? (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        ) : (
          cards.map((card, idx) =>
            card ? (
              <ErrorBoundary
                key={card.id}
                fallback={<LoadingSkeleton />}
              >
                <div data-card-index={idx}>
                  <QuoteCard
                    card={card}
                    isActive={idx === activeIndex}
                    onLike={handleLike}
                  />
                </div>
              </ErrorBoundary>
            ) : (
              <LoadingSkeleton key={`skeleton-${idx}`} />
            )
          )
        )}
      </div>

      {/* AdSense banner — fixed at bottom, rendered once, never blocks feed */}
      <AdSenseBanner />
    </>
  );
}
