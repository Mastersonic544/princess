import { cn } from '../../lib/utils';

interface SplashScreenProps {
  isReady: boolean;
  onDismiss: () => void;
  isFadingOut?: boolean;
}

export default function SplashScreen({ isReady, onDismiss, isFadingOut }: SplashScreenProps) {
  return (
    <div 
      onClick={isReady ? onDismiss : undefined}
      onWheel={isReady ? onDismiss : undefined}
      onTouchMove={isReady ? onDismiss : undefined}
      className={cn(
        "fixed inset-0 z-[100] bg-[#010101] flex flex-col items-center justify-center transition-opacity duration-500",
        isFadingOut && "opacity-0 pointer-events-none"
      )}
    >
      <div className="relative mb-8">
        {/* The splash image with a pulse effect */}
        <div className="w-32 h-32 rounded-full overflow-hidden tiktok-pulse shadow-2xl border-2 border-white/10">
          <img 
            src="/splash.webp" 
            alt="PrincessTok" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Sitename in TikTok-inspired glitch style */}
      <h1 className="text-4xl font-black tracking-tighter tiktok-glitch uppercase italic">
        PrincessTok
      </h1>
      
      <div className="absolute bottom-16 flex flex-col items-center animate-fade-in">
        {isReady ? (
          <>
            <div className="swipe-bounce flex flex-col items-center gap-2">
              <span className="text-white/80 text-sm font-medium uppercase tracking-[0.2em]">
                scroll to start
              </span>
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-6 h-6"
              >
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </div>
          </>
        ) : (
          /* Initial loading state before "scroll to start" */
          <div className="flex space-x-2">
            <div className="w-1.5 h-1.5 bg-[#ff0050] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1.5 h-1.5 bg-[#00f2ea] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}
