🇺🇸 [한국어](./README.ko.md)

# 포커스스트릭 (focusstreak) — A habit-building Pomodoro focus tracker for Apps-in-Toss

포커스스트릭 is a Pomodoro-style focus timer mini app that tracks how much time you spend focusing each day. It shows your progress toward a daily goal on a calendar, tracks streaks and badges, and compares weekly focus time with friends. It is built for people who want a simple, habit-forming way to see their focus time grow, and it runs inside the Toss app as a standalone Vite + React web app.

## Features

- ⏱️ **Focus timer**: 25-minute focus sessions with a countdown computed from an absolute end time, so the display stays correct after the app is backgrounded.
- 🎯 **Daily goal ring**: Home shows progress toward your daily focus goal (default 120 minutes).
- 📅 **Calendar**: a monthly view that shades each day into one of four levels relative to your goal.
- 🗂️ **History**: the sessions for a selected day, with delete and a confirmation dialog.
- 🔥 **Streaks**: current and longest streak, computed from your recorded sessions.
- 🏅 **Badges**: seven achievements (first record, 3/7/30-day streaks, 10h and 50h totals, a 2-hour deep focus session), with a share button.
- 📊 **Weekly report**: a summary of the current week. The report is unlocked by watching a rewarded ad; after three failed ad loads it opens without one. Up to 12 unlocked weeks are kept.
- 👥 **Friend ranking**: compare this week's focus minutes with friends. Friends are added with a share code, and all data stays on the device.
- ⚙️ **Settings**: edit the daily goal and timer preferences, with range validation.
- 🔗 **Sharing**: share a Toss deep link to the app's screens.
- ⭐ **Review prompt**: asks for an app review once, right after a completed focus session.
- 📣 **Banner ads**: shown on several screens (Home, Calendar, History, More).

> **Current limitations**
> - The timer does not save a new session yet. Its completion hook (`onSessionEnd` in `src/pages/Home.tsx`) is a placeholder; sessions are only read and can be deleted in History.
> - The Home timer always uses a fixed 25-minute focus length. The focus and break lengths in Settings are stored but not applied to the timer yet.
> - The in-app purchase component (`src/components/TossPurchase.tsx`) exists but no page mounts it.

## Tech Stack

- **Framework**: React 18, TypeScript, Vite 6 (static build only)
- **Routing**: React Router 7 (`BrowserRouter`)
- **UI**: Toss Design System (`@toss/tds-mobile`, `@toss/tds-mobile-ait`) with TDS theme colors and CSS variables
- **Platform SDK**: `@apps-in-toss/web-framework` (haptics, share links, ads, analytics, review request)
- **Storage**: browser `localStorage` with `fs:`-prefixed keys. No database and no server.
- **Auth**: none. The Toss app provides the user session.
- **Testing**: Vitest with jsdom and Testing Library; Playwright visual smoke tests

## Getting Started

```bash
# Install dependencies (npm, not pnpm)
npm install

# Unit tests
npx vitest run

# Production bundle (output in dist/)
npx vite build

# Apps-in-Toss bundle
npx ait build
```

Copy `.env.example` to `.env` and fill in the values you need before building (see below).

## Environment Variables

Vite reads these at build time, so rebuild after changing a value.

| Variable | Description | Required |
| --- | --- | --- |
| `VITE_TOSS_AD_GROUP_ID` | Banner ad group ID from the Apps-in-Toss console. Used by `AdSlot` on Calendar, History, and More. Not listed in `.env.example`. | Recommended for production |
| `VITE_TOSS_AD_SLOT_ID` | Rewarded ad slot ID that unlocks the weekly report (Report page). | Recommended for production |
| `VITE_SHARE_OG_URL` | Preview image URL attached to share links. If empty, no preview image is attached. | No |
| `VITE_TOSS_IAP_SKU` | Product SKU for `TossPurchase`. Read by that component, which no page mounts yet. | No (for now) |
| `VITE_TOSS_PROMOTION_CODE` | Listed in `.env.example`, but no source file reads it yet. | No (for now) |

If a value is empty, the feature that uses it degrades quietly and the rest of the app still renders.

## Project Structure

```
src/
├── App.tsx          # Route table
├── main.tsx         # Entry point: TDS provider and router
├── pages/           # Screens (Home, Calendar, History, Report, Badges, Rank, Settings, More)
├── components/      # Reusable UI built on TDS (ScreenScaffold, SummaryHero, FloatingTabBar, ...)
├── lib/             # Domain logic, storage helpers, SDK wrappers (analytics, share, review)
├── styles/          # Global CSS and rewarded-ad styles
├── types/           # Shared type declarations
└── __tests__/       # Vitest unit tests and test helpers
e2e/                 # Playwright visual smoke tests
scripts/             # Build and check scripts
apps-in-toss.config.ts  # Apps-in-Toss app configuration (appName, brand color)
```

## Deployment

1. Build the Apps-in-Toss bundle with `npx ait build`. The `appName` in `apps-in-toss.config.ts` must match the app name registered in the Apps-in-Toss console exactly, including case. A mismatch causes a deploy error (4031).
2. Upload the build to Toss hosting using the Apps-in-Toss CLI, following the current `ait` deploy instructions.
3. In the Apps-in-Toss developer console, check the app's build and review it, then submit it for review.

The app is a static build (CSR). Dynamic server rendering is not supported. The review checklist requires that the app has no external-domain navigation, no `console.error` output in production, and no minor-targeted content.

## License

MIT
