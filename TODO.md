# 👑 Princess — TODO List
*Cross-referenced from all session prompts + Requirements Doc v1.0*
*Status as of: 2026-03-13*

---

## ✅ DONE

- [x] Skills: `firebase-princess-schema` + `groq-princess-voice` SKILL.md files
- [x] Full project scaffold — Vite + React 18 + TypeScript (strict), Tailwind v3, React Router v6
- [x] `.env.example`, `.gitignore` (env excluded), `public/robots.txt` (disallows /admin)
- [x] `src/types/index.ts` — Quote, Session, Stats, GeneratedCard, SessionInfo
- [x] `src/services/firebase.ts` — Firebase app init (env vars only)
- [x] `src/services/quotes.ts` — Full CRUD, realtime listener, like, visibility, promote
- [x] `src/services/sessions.ts` — UUID fingerprint, heartbeat, scroll/like tracking
- [x] `src/services/stats.ts` — Atomic counters, realtime listener, active users
- [x] `src/constants/fallbacks.ts` — 5 Jamendo tracks, 10 Unsplash images, 5 seed quotes
- [x] `src/services/cardEngine.ts` — Queue, alternation (first 7 manual → ai/manual), Groq rate-limit (3s), Unsplash cache, Jamendo fallback, audio preload
- [x] `src/components/feed/QuoteCard.tsx` — Full-screen card, gradient, type bar, 🫠 reaction, audio, Jamendo attribution
- [x] `src/components/feed/LoadingSkeleton.tsx` — Shimmer placeholder
- [x] `src/components/ErrorBoundary.tsx` — Per-card error isolation
- [x] `src/pages/Feed.tsx` — Snap scroll, IntersectionObserver, session tracking, AdSense async
- [x] `src/components/auth/AuthGuard.tsx` — Firebase Auth gate, redirect to /admin/login
- [x] `src/pages/admin/Login.tsx` — Firebase email/password sign-in, dark/pink theme
- [x] `src/pages/admin/Dashboard.tsx` — 4 panels: Stats, Quote Manager, AI Saved, Session Log + CSV export
- [x] `database.rules.json` — public read on /quotes, admin write, session/stats rules
- [x] Security: no hardcoded keys, rate limiting, error boundaries, robots.txt, .gitignore

---

## 🔧 SETUP (do before first run)

- [ ] **Fill `.env`** — copy `.env.example` → `.env`, add all 9 keys
  - VITE_FIREBASE_* (4 keys from Firebase Console)
  - VITE_GROQ_API_KEY (console.groq.com)
  - VITE_UNSPLASH_ACCESS_KEY (unsplash.com/developers)
  - VITE_JAMENDO_CLIENT_ID (developer.jamendo.com)
  - VITE_ADSENSE_PUBLISHER_ID (ca-pub-XXXXX, optional for now)
  - VITE_ADMIN_EMAIL (your admin login email)
  > *No skill needed — just data entry*

- [ ] **Firebase project setup**
  - Enable Email/Password Authentication in Firebase Console
  - Create Realtime Database (start in locked mode)
  - Deploy security rules: `npx firebase deploy --only database`
  - Create admin account: Firebase Console → Auth → Add User (use VITE_ADMIN_EMAIL)
  > *Skill: `firebase-princess-schema`*

- [x] **Create `firebase.json`** — needed for Firebase CLI deploy
  ```json
  {
    "database": { "rules": "database.rules.json" },
    "hosting": { "public": "dist", "ignore": ["firebase.json", "**/.*"], "rewrites": [{ "source": "**", "destination": "/index.html" }] }
  }
  ```
  > *Skill: `firebase-princess-schema`*

---

## 🐛 KNOWN BUGS TO FIX (before first real test)

- [x] **Feed IntersectionObserver leak** — observer is recreated on every cards.length change but old observers aren't disconnected cleanly. Refactor with a `useRef` for the observer so it persists and just observes new elements.
  > *Skill: `frontend-mobile-development-component-scaffold`*

- [x] **Audio autoplay blocked on mobile** — browsers block autoplay without a user gesture. First card audio will silently fail. Add a one-time "tap to unmute 🔊" overlay that appears on first load, clears on any tap, and retries `.play()` on the active card.
  > *Skill: `frontend-mobile-development-component-scaffold`*

- [x] **`vite.config.ts` needs `@types/node`** — uses `path.resolve` which requires node types. Add `"@types/node"` to devDependencies: `npm install -D @types/node`
  > *No skill needed*

- [x] **AdSense needs ad unit ID** — current code only uses publisher ID. The `<ins>` element needs `data-ad-slot` too. Store it as `VITE_ADSENSE_AD_SLOT_ID` and add to `.env.example`.
  > *Skill: `security-scanning-security-hardening`* (env var pattern)

- [x] **Card engine `isPreloading` race condition** — if `preloadNextCard()` is called concurrently (e.g. rapid scroll), calls stack up. Change `isPreloading: boolean` to a `Promise` queue so concurrent calls enqueue rather than drop.
  > *Skill: `typescript-pro`*

---

## 🎨 UI POLISH (RD section 2 — not yet implemented)

- [x] **Feed first-load animation** — cards should fade in on first appearance. Currently snaps in instantly. Add `animate-fade-in` class on mount.
  > *Skill: `tailwind-design-system`*

- [x] **Reaction count display** — count is hidden when 0. PRD shows "🫠 14" format always. Show count as `0` on first load until liked.
  > *Skill: `frontend-mobile-development-component-scaffold`*

- [x] **Quote font sizing** — very long quotes (deep sea quote = 300+ chars) run small but shorter quotes need more `letter-spacing` and `line-height` polish. Fine-tune the responsive font tiers in `QuoteCard.tsx`.
  > *Skill: `tailwind-design-system`*

- [x] **Card loading state in feed** — when engine is still initializing and queue is empty, Feed shows a single `LoadingSkeleton`. Make it show 3 stacked skeletons for a more realistic first-load feel.
  > *Skill: `frontend-mobile-development-component-scaffold`*

- [x] **Jamendo attribution hover** — currently just text in corner. Make it a subtle link (`<a href>`) to the Jamendo track page (Jamendo requires this for attribution compliance).
  > *Skill: `tailwind-design-system`*

---

## 🔒 SECURITY (RD section 6 / prompt 6 — finish pass)

- [x] **Run security audit** — do a full scan for any remaining env var access patterns, check all `fetch()` calls use HTTPS, validate no console.log leaks API responses.
  > *Skill: `security-auditor`*

- [x] **Firebase rules hardening** — current rules allow public writes to `sessions/$sessionId` and `stats/`. Consider adding `.validate` rules to prevent arbitrary data injection into session fields.
  > *Skill: `firebase-princess-schema`* + `security-auditor`*

- [x] **CSP headers** — add Content Security Policy headers for Firebase Hosting in `firebase.json` to prevent XSS.
  > *Skill: `security-scanning-security-hardening`*

---

## 📡 END-TO-END FLOW TEST (RD section 9)

- [ ] **Test full scroll flow** (requires filled `.env`):
  1. Open `http://localhost:5174/`
  2. First 7 cards should be manual (blue top bars, your quotes)
  3. Card 8 should be AI-generated (red bar)
  4. Music plays on each card snap, pauses on scroll away
  5. Tap 🫠 → count increments → AI quotes show up in admin Panel 3
  6. Check Firebase Realtime DB → `/sessions/` node created → `/stats/` incrementing
  > *Skill: `full-stack-orchestration-full-stack-feature`*

- [ ] **Test admin dashboard**:
  1. Go to `/admin/login` → sign in
  2. Add a manual quote in Panel 2 → reload feed → confirms blue-bar card appears
  3. Panel 1 stats update in real-time as you scroll in another tab
  4. Panel 4 session log shows your session with correct scroll count
  5. Export CSV works
  > *Skill: `firebase-princess-schema`*

---

## 🚀 DEPLOYMENT (RD section 7 / hosting)

- [ ] **Build + deploy**:
  ```bash
  npm run build
  npx firebase deploy
  ```
  > *No special skill needed — follow firebase.json config*

- [ ] **Verify production**: test the deployed URL, confirm Firebase rules are live (try to write a quote from the browser console without auth — should 403)
  > *Skill: `security-auditor`*

---

## 💡 FUTURE IDEAS (RD section 11 — v2+)

- [ ] **Reveal card** — a special locked card that reveals who made the app when unlocked (tap + hold? Password? Date?)
  > *Skill: `frontend-mobile-development-component-scaffold`* + `tailwind-design-system`*

- [ ] **Anniversary card** — card locked behind a specific date (e.g. renders as blank until date passes, then unlocks)
  > *Skill: `typescript-pro`* (date logic) + `tailwind-design-system`*

- [ ] **Scheduled quotes** — admin can set a quote to appear at a specific timestamp
  > *Skill: `firebase-princess-schema`* (add `scheduledAt` field to Quote type)

- [ ] **Haptic feedback** — on 🫠 tap on mobile, trigger `navigator.vibrate(50)`
  > *Skill: `frontend-mobile-development-component-scaffold`*

- [ ] **Admin milestone notification** — when she hits 100 scrolls / 50 likes / first visit, send yourself an email or push notification
  > *Skill: `firebase-princess-schema`* (Cloud Function trigger)

---

## 📋 SESSION STARTUP CHECKLIST

When starting a new session, run these first:
```bash
cd c:\Users\djla7\Downloads\princess
npm run dev
```
Then tell the AI:
> *"Read `TODO.md` and `Requirements Doc.md` in the princess project. Then read the skills listed for the task I want to work on."*
