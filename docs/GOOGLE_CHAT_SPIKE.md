# Google Chat Embed — Feasibility Spike

**Status:** Research complete — conditional recommendation  
**Date:** 2025  
**Requester:** Ryan / The Wound Well Co. internal team  
**Gated by:** `isTenantFeatureEnabled("google_chat")` feature flag — internal staff only

---

## Summary

Google Chat can be surfaced inside WoundNote as a **read-only embedded right-rail panel** for `*@thewoundwellco.com` staff accounts. This is a **creature-comfort feature**, not a v1 clinical deliverable.

**Recommendation:** Proceed with the iframe-embed approach (Option B below) for the internal pilot. Do **not** send PHI into Chat channels. Gate strictly behind the feature flag and domain check.

---

## Option A — Google Chat REST API + Service Account

**How it works:**  
Use a Google Workspace service account with domain-wide delegation to list and read Chat Space messages via the [Chat API](https://developers.google.com/workspace/chat/api/reference/rest). Render messages in a custom React panel.

**Pros:**

- Full control over the UI
- Can display messages inline, poll for updates, show unread counts

**Cons:**

- Requires service account + domain-wide delegation setup (GCP project, IAM, Workspace admin)
- Read + write would require building a full message composer — significant scope
- **BAA gap**: Google Workspace does not offer a BAA covering Google Chat; PHI in Chat messages would be a HIPAA compliance risk
- Polling is noisy; real-time requires a push webhook or SSE proxy

**Verdict:** Too much infrastructure for a comfort feature. Deferred.

---

## Option B — Google Chat Space Iframe Embed ✅ Recommended

**How it works:**  
Google Chat spaces can be embedded via an `<iframe>` using the authenticated session cookie from a Workspace Google account. The URL format is:

```
https://chat.google.com/room/{spaceId}
```

The user must be logged into Google Workspace in the same browser session. The iframe loads the full Chat UI inside a panel.

**Pros:**

- Zero API infrastructure
- Zero message storage in WoundNote
- Full Chat UX (reactions, threads, mentions) out of the box
- Takes <1 day to implement as a collapsible right-rail panel

**Cons:**

- Requires the user to be logged into Workspace in the same browser profile
- No unread count badge (cannot query Chat state without API)
- If user logs out of Google, iframe shows login screen
- Still subject to the PHI-in-Chat risk — team must enforce a "no patient identifiers in Chat" policy

**PHI Risk Mitigation:**

- Display a visible banner inside the panel: _"Do not include patient names, MRNs, or clinical details in chat."_
- Limit to the internal `#wound-well-team` space (hard-coded space ID, configurable via env var)

---

## Option C — Google Meet Link Panel

**How it works:**  
Display upcoming Google Meet links from Calendar events in a sidebar widget.

**Pros:** Useful for telehealth visits. BAA-safe (Google Workspace HIPAA-eligible services include Meet).

**Verdict:** Useful but out of scope for Phase 6. Tag for Phase 7 / telehealth track.

---

## Implementation Plan (Option B)

### 1. Feature flag check

Already present in `lib/features.ts`:

```typescript
// google_chat: true — enables right-rail Chat panel (internal only)
```

### 2. Domain guard

In the panel component, check `user.email?.endsWith("@thewoundwellco.com")` before rendering.

### 3. Component

`components/layout/google-chat-panel.tsx` — collapsible right-rail panel, 320px wide, visible on `lg+` screens:

```tsx
"use client";

import { useState } from "react";
import { MessageSquare, X, ChevronLeft } from "lucide-react";

const CHAT_SPACE_URL =
  process.env.NEXT_PUBLIC_GOOGLE_CHAT_SPACE_URL ?? "https://chat.google.com";

type GoogleChatPanelProps = {
  enabled: boolean;
  userEmail: string | undefined;
};

export function GoogleChatPanel({ enabled, userEmail }: GoogleChatPanelProps) {
  const [open, setOpen] = useState(false);

  if (!enabled || !userEmail?.endsWith("@thewoundwellco.com")) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-6 bottom-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#3ecfaa] text-white shadow-lg transition-colors hover:bg-[#2db885]"
        aria-label="Toggle team chat"
      >
        {open ? (
          <ChevronLeft className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <aside className="fixed top-0 right-0 z-40 flex h-full w-[320px] flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <span className="text-sm font-semibold">Team Chat</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-shrink-0 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            ⚠️ Do not include patient names, MRNs, or clinical details in chat.
          </div>
          <iframe
            src={CHAT_SPACE_URL}
            className="w-full flex-1 border-0"
            title="Team Chat"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </aside>
      )}
    </>
  );
}
```

### 4. Wire into dashboard layout

In `app/dashboard/layout.tsx`, fetch `isTenantFeatureEnabled("google_chat")` and pass to a server component wrapper; render `<GoogleChatPanel>` client component with `enabled` + `userEmail`.

### 5. Env var

Add to `.env.local` and Vercel:

```
NEXT_PUBLIC_GOOGLE_CHAT_SPACE_URL=https://chat.google.com/room/{YOUR_SPACE_ID}
```

---

## HIPAA / BAA Considerations

| Service      | HIPAA-eligible (BAA available)                        |
| ------------ | ----------------------------------------------------- |
| Google Meet  | ✅ Yes (via Workspace HIPAA BAA)                      |
| Google Chat  | ❌ No — explicitly excluded from Google Workspace BAA |
| Google Drive | ✅ Yes                                                |
| Gmail        | ✅ Yes                                                |

**Conclusion:** Google Chat is **not covered by Google's BAA**. PHI must never be transmitted via Chat channels. The panel is safe for internal operational coordination (scheduling, logistics, non-clinical comms) only.

---

## Decision Record

| Phase   | Action                                                                                                      |
| ------- | ----------------------------------------------------------------------------------------------------------- |
| Phase 6 | Document spike (this file). Component code above is ready to ship.                                          |
| Phase 7 | Wire into dashboard layout if team confirms internal pilot. Add `NEXT_PUBLIC_GOOGLE_CHAT_SPACE_URL` to env. |
| Post-v1 | Evaluate Google Meet widget for telehealth visit links (Option C).                                          |
