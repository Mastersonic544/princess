---
name: firebase-princess-schema
description: Encodes the full Firebase Realtime Database schema, security rules, and anonymous session fingerprinting logic for the Princess app. Use this skill whenever reading from or writing to Firebase, configuring Realtime DB rules, or managing session UUIDs.
---

# Firebase Princess Schema Skill

## Overview

The Princess app uses **Firebase Realtime Database** for all persistent data. Firebase Auth is used only for admin access. Anonymous visitors are tracked via a UUID fingerprint stored in `localStorage` — no login required.

---

## 1. Realtime Database Schema

### `quotes/{quoteId}`

Each quote is stored under a Firebase push-key as `quoteId`.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Firebase push key (same as `quoteId`) |
| `text` | string | The quote content |
| `type` | `'manual'` \| `'ai'` | `manual` = hand-written (blue bar), `ai` = Groq-generated (red bar) |
| `createdAt` | number | Unix timestamp (ms) |
| `likes` | number | Integer, incremented on 🫠 reaction |
| `musicMood` | string | Groq keyword used for Jamendo search (AI quotes only) |
| `imageQuery` | string | Unsplash query term used for background (AI quotes only) |
| `savedBy` | string | `'user_like'` — only present on AI quotes saved via reaction |
| `visible` | boolean | Toggleable from admin — hides quote from feed without deleting |

**Example:**
```json
{
  "quotes": {
    "-Nxyz123": {
      "id": "-Nxyz123",
      "text": "i ddnt fall for pretty u, i fell for all of u",
      "type": "manual",
      "createdAt": 1710000000000,
      "likes": 42,
      "visible": true
    },
    "-Nabc456": {
      "id": "-Nabc456",
      "text": "AI generated quote here...",
      "type": "ai",
      "createdAt": 1710000060000,
      "likes": 7,
      "musicMood": "soft piano",
      "imageQuery": "couple night city",
      "savedBy": "user_like",
      "visible": true
    }
  }
}
```

---

### `stats/`

Global aggregate counters. Updated via atomic increments or Firebase transactions.

| Field | Type | Notes |
|---|---|---|
| `totalUsers` | number | Unique anonymous sessions ever (incremented once per new UUID) |
| `activeUsers` | number | Sessions with `lastSeen` within the last 30 minutes |
| `totalScrolls` | number | Total card swipes across all sessions |
| `totalLikes` | number | Cumulative 🫠 reactions across all sessions |
| `totalHoursScrolled` | number | Cumulative time users spent in feed (hours, float) |
| `lastActive` | number | Unix timestamp of most recent user activity |

**Example:**
```json
{
  "stats": {
    "totalUsers": 1,
    "activeUsers": 1,
    "totalScrolls": 47,
    "totalLikes": 12,
    "totalHoursScrolled": 0.83,
    "lastActive": 1710003600000
  }
}
```

---

### `sessions/{sessionId}`

One node per anonymous session, keyed by the UUID fingerprint.

| Field | Type | Notes |
|---|---|---|
| `sessionId` | string | UUID generated client-side on first visit |
| `startedAt` | number | Unix timestamp when session began |
| `lastSeen` | number | Updated every 60 seconds while the user is active |
| `scrollCount` | number | Cards viewed this session |
| `likeCount` | number | 🫠 reactions this session |
| `durationSeconds` | number | Calculated on session end or during heartbeat |

**Example:**
```json
{
  "sessions": {
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
      "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "startedAt": 1710000000000,
      "lastSeen": 1710003600000,
      "scrollCount": 20,
      "likeCount": 3,
      "durationSeconds": 3600
    }
  }
}
```

---

## 2. Firebase Security Rules

These rules enforce:
- **Admin write-only** for all data — only authenticated Firebase Auth users can write quotes, stats, or sessions directly.
- **Public read on `quotes/`** — anyone can read quotes for the feed.
- **Authenticated read/write on `sessions/` and `stats/`** — sessions and stats can only be written by authenticated users (admin) or via controlled server-side paths.

> **Note:** In the Princess app, anonymous sessions and stats are written from the client using Firebase Auth anonymous sign-in or direct DB rules that allow writes to `sessions/{sessionId}` only where the sessionId matches a known pattern. The simplest secure approach is to allow public writes to `sessions/{sessionId}` (keyed by UUID) and `stats/` fields via atomic transactions, while locking `quotes/` writes to admin only.

**Recommended Firebase Realtime DB rules (`database.rules.json`):**

```json
{
  "rules": {
    "quotes": {
      ".read": true,
      ".write": "auth !== null && auth.token.email === root.child('adminEmail').val()"
    },
    "sessions": {
      "$sessionId": {
        ".read": "auth !== null",
        ".write": true,
        ".validate": "newData.hasChildren(['sessionId', 'startedAt', 'lastSeen'])"
      }
    },
    "stats": {
      ".read": true,
      ".write": true
    }
  }
}
```

> **Design rationale:** `quotes` write is locked to the admin email. `sessions` are world-writable (keyed by UUID — the UUID is not guessable). `stats` are world-writable because atomic increments from anonymous users are required for accurate totals. If you want stricter rules for `stats`, require server-side writes via Cloud Functions.

---

## 3. Anonymous Session Fingerprinting

### How It Works

1. On first visit, generate a UUID v4 and persist it to `localStorage`:
   ```js
   // lib/session.js
   import { v4 as uuidv4 } from 'uuid';

   const SESSION_KEY = 'princess_session_id';

   export function getOrCreateSessionId() {
     let sessionId = localStorage.getItem(SESSION_KEY);
     if (!sessionId) {
       sessionId = uuidv4();
       localStorage.setItem(SESSION_KEY, sessionId);
     }
     return sessionId;
   }
   ```

2. On app load, call `getOrCreateSessionId()` to get the session UUID.

3. Initialize the session node in Firebase if it doesn't exist:
   ```js
   import { ref, set, get } from 'firebase/database';
   import { db } from './firebase';
   import { getOrCreateSessionId } from './session';

   export async function initSession() {
     const sessionId = getOrCreateSessionId();
     const sessionRef = ref(db, `sessions/${sessionId}`);
     const snapshot = await get(sessionRef);

     if (!snapshot.exists()) {
       await set(sessionRef, {
         sessionId,
         startedAt: Date.now(),
         lastSeen: Date.now(),
         scrollCount: 0,
         likeCount: 0,
         durationSeconds: 0,
       });
       // Increment totalUsers in stats
       await incrementStat('totalUsers');
     }
     return sessionId;
   }
   ```

4. **Heartbeat** — every 60 seconds, update `lastSeen` and recalculate `durationSeconds`:
   ```js
   import { ref, update } from 'firebase/database';
   import { db } from './firebase';

   export function startSessionHeartbeat(sessionId, startedAt) {
     setInterval(async () => {
       const now = Date.now();
       const sessionRef = ref(db, `sessions/${sessionId}`);
       await update(sessionRef, {
         lastSeen: now,
         durationSeconds: Math.floor((now - startedAt) / 1000),
       });
     }, 60_000);
   }
   ```

5. **Active user counting** — `activeUsers` in `stats/` reflects sessions where `lastSeen >= now - 30 minutes`. This is typically computed by the admin dashboard querying all sessions in real-time and filtering client-side, or via a scheduled Cloud Function.

---

## 4. Key Firebase Helper Patterns

### Increment a stat atomically
```js
import { ref, runTransaction } from 'firebase/database';
import { db } from './firebase';

export async function incrementStat(field) {
  const statRef = ref(db, `stats/${field}`);
  await runTransaction(statRef, (current) => (current || 0) + 1);
}
```

### Increment likes on a quote
```js
import { ref, runTransaction } from 'firebase/database';
import { db } from './firebase';

export async function likeQuote(quoteId) {
  const likesRef = ref(db, `quotes/${quoteId}/likes`);
  await runTransaction(likesRef, (current) => (current || 0) + 1);
}
```

### Save an AI quote when reacted to
```js
import { ref, update } from 'firebase/database';
import { db } from './firebase';

export async function saveAiQuoteOnReaction(quoteId) {
  const quoteRef = ref(db, `quotes/${quoteId}`);
  await update(quoteRef, { savedBy: 'user_like' });
}
```

---

## 5. Environment Variables Required

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
```

All accessed via `import.meta.env.VITE_*` in Vite.
