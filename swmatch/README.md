# swmatch

An India-first dupe finder for **lipstick, blush, foundation and highlighter**.
Pick a brand, a range and a shade (say Rare Beauty → Soft Pinch Liquid Blush → Hope) and swmatch ranks
dupes from Indian and international brands, with the price in rupees, the saving, and links to
Purplle, Nykaa, Tira and Myntra.

## How a match is scored

Every candidate in the same category gets eight scores, 0–100, blended with per-category weights
(`WEIGHTS` in `engine.js`; visitors can retune them on the page):

| Criterion | What it measures |
|---|---|
| Colour | CIEDE2000 ΔE between the two swatches. Under 2 reads identical; over 8 is a different shade. |
| Undertone | Warm / cool / neutral / olive. From the brand where stated (W/C/N codes, "golden", "olive"), otherwise read from the swatch hue. |
| Depth | Lightness (L\*) gap. Foundation depth is labelled Fair, Light, Wheatish, Medium-tan, Dusky or Deep. |
| Intensity | Chroma gap: vivid vs muted. |
| Finish | Matte → soft-matte → satin → dewy → glossy, plus shimmer and metallic, placed on sheen and sparkle axes. |
| Payoff | Pigmentation, or coverage for foundation. |
| Formula | Bullet, crayon, liquid, cream, stick, powder, baked. |
| Community | A bonus when dupe sites or Indian beauty editors already pair the two. It never lowers a score. |

A colour miss of ΔE > 14 caps the score at 60, so packaging and finish can't rescue the wrong shade.
Each card also gets plain-language notes ("a touch deeper, finish is matte instead of dewy; tap a
balm on top") and, when the visitor sets their skin tone, a note on how the shade will read on it.

The **AI stylist** (`api/ask.js`) sends the chosen shade and the engine's top dupes to Claude, which writes a
short verdict: best match, best value, what differs and how to close the gap. It only explains what
the engine found; it doesn't invent products. It needs `ANTHROPIC_API_KEY` set in the Vercel project. Without
it, the page falls back to the engine's own notes.

Plain-language search ("warm nude matte lipstick under ₹800", "MAC Ruby Woo dupe under ₹600") runs
in the browser.

## Data

- **Purplle** (`scripts/fetch_purplle.py`): lipstick, blush, foundation and bronzer/highlighter ranges,
  with each shade's swatch colour from Purplle's own listing, plus price, rating and product link.
  Where Purplle shows an image swatch instead of a hex code, the colour is read from the image and
  marked `hexSource: "image"`; the engine trusts those a little less. Only paths that Purplle's
  robots.txt allows are read, one request at a time.
- **Hand-compiled ranges** (`data/curated.json`): prestige and international lines Purplle doesn't
  carry (MAC, Charlotte Tilbury, NARS, Rare Beauty, Fenty Beauty, Huda Beauty, Estée Lauder, Benefit,
  Milani, e.l.f. and more), plus a few popular Indian shades. Swatch colours are approximations from brand
  and reviewer swatches; prices are approximate Indian MRP. Edit this file to add ranges or community pairings.
- **Nykaa, Tira and Myntra** block automated catalog reads (HTTP 403 or dropped connections), so
  swmatch links to their search for every shade instead of pulling their listings.

## Commands

```bash
npm install                                # Anthropic SDK for the AI stylist
python3 scripts/fetch_purplle.py           # refresh data/purplle-raw.json (needs Pillow for image swatches)
node scripts/build-catalog.js              # merge into data/catalog.js
npm test                                   # engine tests
python3 -m http.server                     # then open http://localhost:8000
```

Deploy the `swmatch/` folder to Vercel as its own project (root directory `swmatch`) and set
`ANTHROPIC_API_KEY`. The site is static apart from `api/ask.js`.
