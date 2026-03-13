# 👑 PRINCESS — Product Requirements Document
**Version 1.0 · Confidential**
*A personalized infinite-scroll reel experience — built for one.*

---

## 1. Project Overview

Princess is a TikTok-style, infinite-scroll web app that generates personalized love quote reels. Each card combines a romantic background image, a poetic quote, and a mood-matched music track — all generated on the fly as the user scrolls. No account needed. One intended audience.

**Stack:** React (Vite) · Firebase (Auth + Realtime DB) · Groq API · Jamendo API · Unsplash API · Google AdSense
**Deployment:** Web, mobile-first, full-screen vertical
**Admin:** /admin route, Firebase Auth protected
**Monetization:** Google AdSense banner (bottom of screen)

---

## 2. User Experience — The Reel Feed

### 2.1 Layout & Visual Design
- Full-screen vertical cards (100vh × 100vw), one at a time
- Scroll snapping — each swipe snaps to the next card
- Card anatomy top to bottom:
  - Colored top bar (6px) — blue for your quotes, red for AI
  - Full-bleed background image with dark gradient overlay
  - Quote text — centered, elegant serif, white, drop shadow
  - 🫠 reaction button with count — bottom center
  - AdSense banner — fixed at very bottom of viewport
- No navbar, no header — fully immersive

### 2.2 Quote Source Color Coding
- **Blue top bar** — hand-written quote by you, stored in Firebase
- **Red top bar** — AI-generated quote by Groq in your voice
- Cards alternate blue/red as user scrolls
- First 5–7 cards are always your hand-written quotes before AI alternation begins

### 2.3 Infinite Scroll & Card Generation Pipeline
Per card, in order:
1. Groq generates a quote in your voice + returns a music mood keyword + image search term (single JSON call)
2. Jamendo API fetches a matching track using the mood keyword
3. Unsplash API fetches a romantic/couple image using the image term
4. All three are assembled into a card and staged before the user gets there
- Next card is fully preloaded while user reads the current one
- Loading skeleton shown only if preload isn't ready in time (should be rare)
- AI quotes that receive a 🫠 are automatically saved to Firebase

### 2.4 Music Playback
- Autoplays on card snap-into-view, pauses when scrolled away
- Volume soft by default — ambient, not dominant
- No visible controls — seamless
- Track preloaded during previous card's display time
- Fallback: curated ambient Jamendo track plays if keyword returns no results

### 2.5 Reaction System
- One reaction per card: 🫠 (melting face — "this is too sweet")
- Tap increments like count for that quote in Firebase
- Count displayed below emoji (e.g. 🫠 14)
- No login required — tracked via anonymous session
- If reacted quote is AI-generated, it gets permanently saved to the Firebase quotes collection
- No comment system

### 2.6 Google AdSense
- Single banner pinned to bottom of viewport
- Sits below reaction button, never overlaps quote content
- Loads asynchronously — never blocks card display
- Publisher ID and ad unit ID stored in environment variables

---

## 3. Data Architecture — Firebase

### 3.1 Services Used
- **Firebase Auth** — admin only (email + password)
- **Realtime Database** — quotes, reactions, session stats

### 3.2 Database Schema

**quotes/{quoteId}**
- id — auto Firebase push key
- text — the quote string
- type — 'manual' | 'ai'
- createdAt — unix timestamp
- likes — integer, incremented on 🫠
- musicMood — Groq keyword used for Jamendo (AI quotes)
- imageQuery — Unsplash term used for background
- savedBy — 'user_like' (only on AI quotes saved via reaction)
- visible — boolean, toggleable from admin

**stats/**
- totalUsers — unique anonymous sessions ever
- activeUsers — sessions active in last 30 min
- totalScrolls — total card swipes across all sessions
- totalLikes — cumulative 🫠 reactions
- totalHoursScrolled — cumulative time users spent in feed
- lastActive — timestamp of most recent activity

**sessions/{sessionId}**
- sessionId — UUID generated client-side on first visit
- startedAt — unix timestamp
- lastSeen — updated every 60 seconds while active
- scrollCount — cards viewed this session
- likeCount — 🫠 reactions this session
- durationSeconds — calculated on session end or heartbeat

---

## 4. AI Generation — Groq

### 4.1 System Prompt Design
The system prompt is the soul of the product. It must replicate your voice — casual spelling, poetic instinct, raw honesty, the shift between soft and direct.

- Seed with your 7 best real quotes as examples (the deep sea one is non-negotiable)
- Instruct the model to: match your casual spelling style, avoid generic AI phrasing, be poetic but grounded, never use clichés
- Model must always return a JSON object — no plain text responses

**Required JSON schema per Groq call:**
- quote — the generated quote string
- musicMood — 1–3 word keyword for Jamendo (e.g. "lofi romantic", "soft piano", "r&b slow")
- imageQuery — 2–4 word Unsplash query (e.g. "couple night city", "ocean stars couple")

**Model settings:**
- Model: llama-3.3-70b-versatile or mixtral-8x7b-32768
- Temperature: 0.85–0.95
- Max tokens: 200 per call

### 4.2 Quote Quality Rules (enforced via prompt)
- Never exceed 4 sentences
- No exclamation marks — calm and sincere tone only
- Never use her name in the quote
- Vary the form: one-liners, short paragraphs, questions — not always the same shape
- Emotional range: longing, protection, peace, humor, awe — not exclusively romantic

---

## 5. External Media APIs

### 5.1 Background Images — Unsplash
- API: Unsplash Developer API (free tier)
- Query: imageQuery from Groq response
- Orientation: portrait only
- Overlay: dark CSS gradient over image for text readability
- Fallback: local pool of 10 pre-approved images if API fails
- Cache: images cached after first load for session duration

### 5.2 Music — Jamendo
- API: Jamendo Tracks API (free tier, requires client ID)
- Search: musicMood keyword from Groq
- Format: MP3 stream URL
- Preload: HTML Audio object created during previous card
- Autoplay: triggered on card snap-into-view
- Fallback: 5 curated ambient Jamendo tracks if keyword returns nothing
- Attribution: Jamendo requires artist credit — displayed subtly in bottom corner of card (small, elegant, not intrusive)

---

## 6. Admin Dashboard — /admin

### 6.1 Access & Auth
- Route: /admin — not linked anywhere in the public UI
- Login: Firebase Auth, email + password, single admin account
- Session persists across browser sessions via Firebase Auth state
- Logout button always visible in dashboard header
- All DB write rules locked to authenticated admin in Firebase rules

### 6.2 Dashboard — Panel 1: Live Stats
Real-time KPI cards (Firebase listeners, no refresh needed):
- Total unique users (all time)
- Active users right now (sessions active in last 30 min)
- Total hours scrolled (all time)
- Total 🫠 reactions (all time)
- Total cards viewed (all time)
- Most liked quote — text preview + count

### 6.3 Dashboard — Panel 2: Quote Manager
- Add new hand-written quote — text input + submit, saved as type: 'manual', appears with blue bar
- View all quotes in sortable table: text, type, date added, like count
- Edit quote text inline
- Delete quote (with confirmation prompt)
- Toggle quote visibility — hide from feed without deleting
- Filter by: All / Manual / AI-saved / Most liked / Most recent
- Keyword search across all quotes

### 6.4 Dashboard — Panel 3: Liked AI Quotes
- Lists all AI quotes auto-saved via 🫠 reactions
- Promote a saved AI quote to 'manual' status (turns it into a permanent blue-bar quote)
- Delete AI quotes that don't meet your standard

### 6.5 Dashboard — Panel 4: Session Log
- Table: session ID (truncated), start time, duration, cards viewed, likes given
- Sortable by date, duration, or engagement
- Summary totals row at the bottom
- Export to CSV button

### 6.6 Admin UX Details
- Same pink/dark color palette as the main app
- Mobile-friendly — manageable from your phone
- All destructive actions require one confirmation click
- Toast notifications for all actions (saved, deleted, updated, hidden)
- No AdSense in admin — clean workspace

---

## 7. Full Tech Stack

- Framework: React 18 + Vite
- Styling: Tailwind CSS
- Routing: React Router v6 (/ feed, /admin dashboard)
- Auth: Firebase Authentication (email/password, admin only)
- Database: Firebase Realtime Database
- AI: Groq API — llama-3.3-70b-versatile
- Images: Unsplash API
- Music: Jamendo Tracks API
- Ads: Google AdSense
- Hosting: Firebase Hosting or Vercel

---

## 8. Environment Variables

- VITE_GROQ_API_KEY
- VITE_UNSPLASH_ACCESS_KEY
- VITE_JAMENDO_CLIENT_ID
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_DATABASE_URL
- VITE_FIREBASE_PROJECT_ID
- VITE_ADSENSE_PUBLISHER_ID
- VITE_ADMIN_EMAIL

---

## 9. Performance & Optimization

- Next card fully preloaded (quote + image + audio) before scroll
- Images cached in memory for session duration
- Jamendo audio preloaded as HTML Audio object, src swapped on card change
- Groq called only when card N-1 enters view — not all at once on load
- Firebase writes batched to stay within free tier
- Fallback assets bundled locally for zero-dependency resilience
- AdSense script async — never blocks feed render

---

## 10. Out of Scope (v1.0)

- User login or accounts
- Comment system
- Share buttons
- Push notifications
- Multi-language support
- Light mode
- Multiple admin accounts

---

## 11. Future Ideas

- Reveal card — unlocks to show who made the app
- Anniversary card — locked until a specific date
- Admin ability to schedule quotes at a specific time
- Haptic feedback on 🫠 tap (mobile)
- Admin notification when she hits a milestone (e.g. 100 cards scrolled)

---

*Built with love. For one person. 👑*
