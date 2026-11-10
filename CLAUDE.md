# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## New Machine Setup

**Run this once on a fresh clone before anything else.**

### Prerequisites

- Node.js 22+ — install via [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux) or [nvm-windows](https://github.com/coreybutler/nvm-windows):
  ```bash
  nvm install 22
  nvm use 22
  ```
- npm 10+ (bundled with Node 22)

### First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Create env file (copy and fill in real values)
cp .env.local.example .env.local
# Then edit .env.local with actual Sanity credentials

# 3. Start dev server
npm run dev
```

### .env.local values

Ask the project owner for the real values, or find them at sanity.io/manage:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-02-22
```

### Auto-setup check (for Claude)

Before starting any task on a new machine, verify the environment is ready:
1. Check `node_modules/` exists — if not, run `npm install`
2. Check `.env.local` exists — if not, warn the user to create it from the values above
3. If either was missing, run `npm run build` to confirm everything compiles

---

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test framework is configured.

## Environment Variables

Create a `.env.local` with these required variables:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-02-22   # optional
```

### Spline kill switch

`SPLINE_ENABLED` in `src/lib/featureFlags.ts` turns every Spline scene on or off
(the skills stage on the homepage): at `false`
there is no viewer script, no WebGL context, no splash registration. The three.js
canvases (`HeroBackground`, `HeroCanvas`, `PortalCanvas`) are not affected — the
flag isolates Spline specifically.

## Architecture

**Next.js 15 App Router** with React 19 and TypeScript. Path alias `@/*` maps to `./src/*`.

### Pages

- `/` — Homepage: server-rendered with ISR (`revalidate = 30`). Fetches visible projects from Sanity and renders Navbar → Hero → Skills → ProjectsGrid → Footer.
- `/projects/[slug]` — Project detail page: fetches full project data + next project for navigation; renders a hero (image/iframe/custom color) followed by flexible `contentBlocks`.
- `/skills/[slug]` — Removed. Skill links (navbar menu) point to a representative project via `src/lib/skillProjects.ts`; old `/skills/*` URLs redirect in `next.config.ts`.
- `/studio/[[...tool]]` — Embedded Sanity Studio at `/studio`.

### Data Layer (Sanity CMS)

All CMS config lives in `src/sanity/`. GROQ queries are in `src/sanity/queries.ts`. The Sanity client is initialized in `src/sanity/lib/client.ts`.

The **Project** is the primary content type (`src/sanity/schemaTypes/projectType.ts`). Key fields:
- `visible` + `order` — control homepage grid display and ordering
- `gridSize` (one-third / half / two-thirds / full) — controls grid column span
- `diagonalRight` (none / slash / backslash) — decorative diagonal separators between cards
- `heroType` (photo / iframe / custom) — determines project page hero rendering
- `thumbnailImage` / `thumbnailVideo` — static thumb vs. hover video on cards
- `contentBlocks` — flexible array of `fullImage`, `twoCol`, `quote` blocks for the project page body

Other schema types (author, post, category, blockContent) exist but are unused stubs.

### Styling Approach

Styling uses **inline styles as the primary approach**, not Tailwind classes. Tailwind is configured but used minimally. Styled-components is also installed. Do not refactor to Tailwind unless asked.

### Animation & 3D

- **GSAP** (`@gsap/react`) for scroll and UI animations
- **Lottie** (`lottie-react`) for vector animations
- **Three.js** for the 3D mouse-tracking background in `src/components/HeroBackground.tsx`

### Deployment

Deployed on Vercel. The Sanity Studio is served inline within the Next.js app (not a separate deployment).
