# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arabic RTL slideshow presenting **Generative AI** (الذكاء الاصطناعي التوليدي) for ITE_BMM601 · SVU · S25. Pure static site — no build step, no framework, no dependencies beyond Google Fonts.

**Preview:** open `index.html` directly in a browser, or use VS Code Live Server on port 5500.

## File structure

```
index.html        — 13-slide deck (slides 00–12)
css/style.css     — all styles, single file
js/main.js        — all interactivity, single IIFE
img/              — svu-logo.png + future media assets
```

## Architecture

### Slide system
- `#deck` contains 13 `<article class="slide" data-index="N">` elements.
- The active slide gets class `.active`; JS in **section 3 (SLIDE MANAGEMENT)** drives navigation via `goTo(idx)`.
- `onSlideEnter(idx)` in **section 15** is the hook for per-slide animations — ethics bars animate at `idx === 11`, timeline at `idx === 11`.
- `SLIDE_LABELS[13]` maps index → Arabic name, used by nav dots and the canvas cursor label.
- `#total-num` in HTML must match the actual slide count when slides are added/removed.

### Card flip pattern
Slides 02–08 and 12 have an interactive back face:
```
.card-wrap > .card > .card-face.card-front   (info + "▶" button)
                   > .card-face.card-back    (canvas/demo + btn-back)
```
`.card.flipped` triggers the CSS 3D flip (`rotateY(-180deg)`). The flip button carries `data-flip="true"`; `.btn-back` reverses it.

### Deep Dive overlay
`#deep-dive-overlay` is a single shared panel populated on demand from `DEEP_DIVE_DATA` (JS section 16). Each slide front has `<button class="deep-dive-btn" data-slide="KEY">`. Keys: `definition diffusion gans llm image audio video dev scale tools ethics`.

### Two canvases
| Canvas | Z-index | Purpose |
|--------|---------|---------|
| `#bg-canvas` | 0 | Animated neural-network background (nodes + gold links) |
| `#cursor-canvas` | 100 | Custom cursor: lerp ring + Arabic/AI letter particles + nav label |

The cursor label drawn above the ring comes from `_lastHoveredLabel` (format `"01 · الغلاف"`), set on nav dot `mouseenter`.

### RTL + bidi rules
- `<html dir="rtl">` — the whole page is RTL.
- Mixed Arabic/Latin inline text must **never** live in a single text node. Use flex rows with separate `<span>` children instead (see `.student-row` on the cover slide).
- `.student-row` uses `direction: ltr` to enforce left-to-right flex order (name → id → class); `.s-name` restores `direction: rtl` for Arabic text shaping.

## CSS conventions

- Design tokens are all in `:root` — always use the variables, never hard-code colours.
- Key palette: `--navy` (bg), `--gold` (accent/borders), `--teal` (interactive/highlight), `--cream` (body text).
- Fonts: `Changa` for headings and display numbers; `IBM Plex Sans Arabic` for body and UI.
- Slide-specific layout modifiers follow the pattern `.slide-inner--{name}` (e.g. `--col2`, `--gan`, `--llm`, `--tools`, `--scale`).
- Each card-flip slide's front face gets a unique structural identity — no two slides share the same layout.

## JS sections (main.js IIFE)

| # | Section |
|---|---------|
| 1 | Neural network background |
| 2 | Cursor letter particles |
| 3 | Slide management + nav dots |
| 4 | Card flip & external links |
| 5–11 | Per-slide demos: Diffusion · GAN · Token streaming · Forge · TTS · Video · Code typing |
| 12 | Living scale (Pros/Cons) |
| 13 | AI timeline (Slide 11) |
| 14 | Quiz (Slide 12 back) |
| 15 | `onSlideEnter(idx)` hooks |
| 16 | Deep Dive overlay |

## Media placeholders

Slides with `.media-skeleton` are awaiting real media from the team. Replace the skeleton `<div>` with the actual `<img>`, `<audio>`, or `<video>` element when the asset is ready. All media must be converted to WEBP (images) or MP4/MP3 before final submission.

## Commit conventions

Commits follow the incremental structure agreed with the supervisor — one logical block per commit. Format: `feat: <slide or feature name>` / `fix: <what>` / `style: <what>` / `init: <what>`.
