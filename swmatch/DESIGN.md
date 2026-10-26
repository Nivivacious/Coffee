# swmatch design system

swmatch is a shopping tool first: people arrive with one shade in mind and want its dupe fast. The
look is the logo's own world, a warm coral stage and a quiet blush-white counter, made premium by
real product photos, real swatch colour and restraint, not by effects. One theme, light: there
is no dark mode, and the page tells browsers not to darken it (`color-scheme: light`).

Direction was set from the brand files and the owner's feedback (keep the coral design, add real
imagery and interaction, nothing dark or WebGL). Motion and layout ideas came from motionsites.ai,
reactbits.dev and pdimagearchive.org (see README), rebuilt in plain CSS/JS.

## Colour

Every colour has one job. Tokens live on `:root` in `index.html`.

| Token | Value | Role |
|---|---|---|
| `--coral` | `#F26671` | The stage behind the hero and the footer. Never text. |
| `--butter` | `#F8F3A6` | The logo slash, highlights behind words, the ticker, focus ring. Never text on coral. |
| `--plum` | `#2B1519` | Primary buttons, text on coral and butter (5.6:1 on coral, 13:1 on butter). |
| `--on-coral` | `#FFFFFF` | Large type on coral only (h1, wordmark): 3:1, passes for large text. |
| `--accent` | `#C8404D` | Selected states, match %, links. 4.9:1 on white. |
| `--bg` / `--surface` / `--sunk` | `#FFF8F6` / `#FFFFFF` / `#FCEDEB` | Page, cards, wells. |
| `--ink` / `--ink-2` | `#2B1519` / `#7A5A5F` | Body text / secondary text (5.4:1 on white). |
| `--line` | `#F2DAD7` | Hairlines and card borders. |
| `--good` / `--warn` | `#1F8A5B` / `#946010` | Savings / low-confidence notes. |

Shade swatches are data, not decoration: they always show the catalogue hex, never a brand colour.

## Typography

Nunito (rounded, friendly, matches the wordmark) for everything you read or tap, Instrument Serif
for display headlines only, and IBM Plex Mono for numbers compared side by side (price per ml, ΔE,
ranks). Prices and scores use tabular figures. Nothing renders below 12px; selects are 16px on
phones so iOS doesn't zoom.

| Step | Size / line | Weight | Use |
|---|---|---|
| Display | clamp(52px, 7.4vw, 104px) / .94 | Instrument Serif 400 | Hero h1 only |
| H2 | clamp(32px, 3.6vw, 46px) / 1.05 | Instrument Serif 400 | Section titles, shade name |
| H3 | 22px / 1.2 | 900 | Shade name in the match panel, Tested headline parts |
| Title | 17px / 1.25 | 800 | Card titles (dupe name, tile name) |
| Body | 16px / 1.55 | 400–600 | Copy, notes |
| Small | 13px / 1.4 | 700 | Meta lines, chips, labels |
| Eyebrow | 12px, +.12em, caps | 800 | Section kickers |

Emphasis inside a headline is the serif italic with a butter marker underneath (`.mark`), never gradient
text. Lines stay under 70 characters (`max-width: 60ch` on copy blocks).

## Spacing, shape, depth

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96. Sections are 64px apart on desktop, 44px on phones.
- Content width 1240px with a 16px minimum gutter.
- Radius: `--r-sm` 12px (chips' inner wells, thumbnails), `--r` 22px (cards, tiles), 999px (pills, buttons).
- Shadows: `--shadow` (cards at rest) and `--shadow-lift` (hover, floating cards). Nothing else.

## Components

- **Buttons**: primary is a plum pill with white text; secondary is a white pill with a hairline;
  quiet is text with an underline. Hover lifts 1px; focus shows the butter ring with a plum halo;
  disabled is 50% opacity with a not-allowed cursor.
- **Chips** (`.pill`, `.fams`, filters): hairline pill, 13px bold; pressed = plum fill.
- **Inputs**: the search is one white pill with the primary button inside it.
- **Cards**: white surface, `--line` border, `--r`. Dupe cards lead with the product photo, the
  match ring and the price; every other fact is a quiet chip.
- **Tabs**: a three-way segmented control in the header; the thumb slides between tabs.
- **Score ring**: conic-gradient ring in `--accent` around the match % (the engine's verdict),
  counted up when it scrolls into view.

## Imagery

1. Real retailer product photos (Purplle) for every shade that has one, on white, `object-fit: contain`.
2. Public-domain archive plates (Public Domain Image Archive) where no product photo exists:
   Ogawa Kazumasa's hand-coloured flowers (1896) for skincare, Desgoffe's soap bubble (1882) for
   highlighter, Werner's Nomenclature of Colours (1814) and Vanderpoel's colour studies on the
   Tested page. Credited in the footer.
3. Tinted swatch textures (`assets/tex`) for swatches on skin.
4. Simple drawn product SVGs only as a fallback when an image fails.

No stock photos, no AI images standing in for real swatches, no emoji icons.

## Motion

One easing, `cubic-bezier(.22, 1, .36, 1)`, 0.5–0.7s for reveals, 60–90ms stagger. Motion explains
something (a score counting up, a swatch revealed under the cursor, the dupe sliding into place)
or it isn't there. Everything respects `prefers-reduced-motion`.

Interaction rules: anything that moves on its own pauses on hover and focus and has a visible pause
(the swaps reel) or progress (the hero dots); every card a pointer can open is reachable with Tab;
buttons give a small press (scale .96); switching shades cross-fades the panel; the panel takes a
wash of the picked shade; hovering a dupe slides in callouts with the facts behind its score.
