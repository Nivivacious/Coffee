# Phases 2–4: Deck System, Hero Cards, Prototype

**A Tale of Two Homes** · decisions taken after Phase 1 review

| Decision | Choice |
|---|---|
| Direction | **The Seam.** One shared line per card, with the hidden sentence on it |
| Colour | **Full colour**, as seven spot inks on ivory stock (see palette) |
| Motion | **Every mirror moves.** Animated SVG on screen, lenticular seam band in print |
| Hero card 5 | **St. Mark's Road × St. Marks Place** replaces Church Street × Bleecker |
| Auto × cab line | Rewritten. See *Local accuracy* below |

The working prototype is `prototype/index.html`. The exported card files are in `prototype/svg/`.

---

## Local accuracy: the rule every pairing now has to pass

> Would a resident of each city nod, without needing it explained?

**The Brooklyn question.** You were right to push on it. "Cabs won't go to Brooklyn" was a real New York complaint, but it belongs to the 1990s and 2000s. Brooklyn is no longer a place cabs avoid, and a younger New Yorker would read the line as a period joke. "Autos won't go to Whitefield" is accurate today. The two halves weren't true in the same decade, so the pairing failed the test.

**The replacement** is true in both cities right now: the moment it rains at rush hour, every ride in town is suddenly going somewhere else. Autos refuse or ask for "meter plus fifty". Yellow cabs vanish, and the ones you see have their roof lights off. (Since 2013, a lit roof number means available and a dark light means not. There is no separate off-duty light any more.)

*The minute it rains, / everyone is going the other way.*

The rotational symmetry makes this line literal: the auto and the cab really are always going the other way.

**Facts checked for the hero cards**

- **Bangalore autos:** yellow hood, with a green body (LPG-era) or black body. The card uses green.
- **NYC roof lights:** lit = available, dark = unavailable (TLC rule, 2013).
- **Kannada signage:** ಕಾಫಿ (coffee), ಇಡ್ಲಿ · ವಡೆ (idli, vade), ದೋಸೆ (dose). Bangalore boards are required to carry Kannada.
- **Darshinis:** self-service, standing, tube-lit, steel counters, coffee served in a tumbler and davara.
- **Central Park lamp posts:** a four-digit plate on each post gives the nearest cross street. 7203 means 72nd Street.
- **Diner mugs:** heavy white restaurant ware with a green band.
- **Weather:** Bangalore's signature storm comes at 4 PM in April and May, before the monsoon proper.
- **St. Mark's Road and St. Marks Place:** both are real, and both are named for the same saint. The Manhattan street is East 8th Street between Third Avenue and Avenue A.
- **Still to verify:** whether Namma Metro still issues plastic tokens, before that pairing goes ahead.

**Pairings dropped for accuracy or staleness:** cab refusals to Brooklyn (dated), NYC broker fees (tenants mostly stopped paying them under the 2025 FARE Act, so the joke has expired).

---

## The system

### Suits are four dimensions of city life

| Suit | Theme | What belongs here |
|---|---|---|
| ♥ Hearts | Belonging | Rituals, regulars, people who know your order |
| ♦ Diamonds | Ambition | Work, money, early starts, getting somewhere |
| ♣ Clubs | Streets | Commutes, corners, food, small daily annoyances |
| ♠ Spades | Weather and time | Seasons, arrivals, leaving, growing up |

### Ranks keep time

Laid out from 2 to 10, each suit is one day. Every card's caption gives the same local hour in both cities.

| 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|
| 6 AM | 8 AM | 10 AM | Noon | 2 PM | 4 PM | 6 PM | 8 PM | 11 PM |

- **Aces are origins.** Where the city, or that part of life, began.
- **Jacks are restless.** The people who keep the city moving.
- **Queens are what the city loves.**
- **Kings are the contradiction.** What both cities complain about and never fix.
- **Jokers are the person.** No mirror, no rotation.

### Visual grammar

- **Grid.** 250 × 350 units (1 unit = 0.01 in), so the card is exactly 2.5 × 3.5 in. The bleed version is 2.75 × 3.75 in.
- **Halves.** Each city gets an art window. The New York half is the Bangalore half's template rotated 180° about the card centre, so the symmetry is exact by construction.
- **The seam band.** A 0.16 in strip across the centre that both halves stand on. It's a road, a counter, a path, a doorstep or a pavement, depending on the card. The vermilion centre line is the shared line.
- **The hidden sentence.** Micro small caps on the band. The first clause reads upright from Bangalore's side, top left. The second clause reads only once the card is turned, bottom right. Dotted leaders fill the rest of each row, so at arm's length the sentence looks like ornament.
- **Indices.** Rank, pip and city code (BLR or NYC) in the left margin of each half.
- **Ornament.** Real coordinates run up the right margin of each half (12°58′N · 77°35′E and 40°42′N · 74°00′W). Each half also carries a caption cartouche with the place and the hour. Vermilion four-point stars sit in the corners.
- **Frame.** A double rule (0.7 + 0.22) with rounded corners.

### Typography

| Role | Face | Use |
|---|---|---|
| Display | Bodoni Moda | Ranks, Joker letters, titles |
| Micro | Cormorant Garamond, 600–700 | The seam sentence, captions, coordinates |
| Signage | Archivo Narrow | NYC street signs, diner boards, the taxi |
| Kannada | Noto Sans Kannada | Bangalore boards |

All text is outlined before print.

### Palette: seven spot inks on ivory stock

| Ink | Hex | Job |
|---|---|---|
| Ivory stock | `#F4ECDC` | Paper |
| Indigo black | `#1E2233` | Line, night |
| Kumkum | `#D9412B` | Red suits, the seam, brick, tile |
| Marigold | `#F2B330` | Shared by the auto's hood and the cab. Lamplight |
| Canopy | `#2E7D5B` | Trees, the auto's body, street signs |
| Monsoon | `#3B6EA8` | Rain, dusk, glass |
| Neon | `#E58A9B` | Diner neon, tabebuia blossom |
| Kaapi | `#7A4528` | Coffee, brownstone, wood |

Tints come from ink opacity, as in a halftone. There are no gradients.

### Motion: the moving mirror

On screen, each card is a short silent film that loops. Three rules keep the films consistent:

1. **Motion respects the rotation.** Both halves run the same animation in their own frame, so anything that moves in Bangalore moves in New York the other way round. The card stays rotationally symmetric in every frame, not just at rest.
2. **The centre is the key frame.** Every loop passes through its still pose. That still is the printed card, and the "Print frame" button shows it.
3. **One story beat per card.** The rain starts and the cab light goes dark. The walker gets lapped. The tube light flickers. Nothing moves just for decoration.

**In print**, the seam band, or the whole art window, can be printed lenticular. Tilting the card in your hand then plays a two- to four-frame version of the same motion: the auto and cab pass, rain becomes heavier, the windows light. This is a standard collectible-card process and costs more per deck, so it would suit a numbered first edition.

---

## The pairings: 21 cards toward the full deck

Hero cards are marked ★.

| Card | Bangalore | New York | Hidden sentence |
|---|---|---|---|
| A♥ | Jagali katte, the raised doorstep seat of old Basavanagudi houses | The Brooklyn stoop | *Every house needs a step / that belongs to the street.* |
| ★ 2♥ | Cubbon Park, 6 AM | Central Park, 6 AM | *Every loud city / needs somewhere to whisper.* |
| ★ 3♥ | Darshini, Jayanagar | Diner, Astoria | *You don't order anymore. / You just nod.* |
| 5♥ | Mallige strings sold by the arm's length | Bucket flowers outside the deli | *Somebody is buying flowers / for no particular reason.* |
| Q♥ | The street dog the whole lane feeds and names | The bodega cat | *Owned by no one. / Answers to everyone.* |
| K♥ | The aunty who knows the whole street | The super who knows the whole building | *Knows your business / better than your mother does.* |
| A♦ | Kempegowda's boundary towers, 1537 | The 1653 wall that named Wall Street | *Every city begins / by deciding where it ends.* |
| 2♦ | KR Market flower stalls before dawn | The 28th Street flower district before dawn | *The prettiest hour / belongs to the people working it.* |
| J♦ | Food delivery rider in the rain | Deliverista on an e-bike | *Everyone's dinner / is somebody's shift.* |
| K♦ | Silk Board junction | The Cross Bronx Expressway | *Everyone is going somewhere. / Nobody is moving.* |
| 4♣ | "Swalpa adjust maadi" on a packed BMTC bus | "Step all the way in" on a packed train | *There's always room / if everyone's a little uncomfortable.* |
| 5♣ | Black Sintex tanks on every roof | Wooden water towers on every roof | *Every house keeps a little worry / upstairs, just in case.* |
| 6♣ | The greens cart's call: "soppu!" | The Mister Softee jingle | *You never hear them coming. / Only leaving.* |
| ★ 8♣ | Auto-rickshaw, 6 PM | Yellow cab, 6 PM | *The minute it rains, / everyone is going the other way.* |
| ★ 10♣ | St. Mark's Road, 11 PM | St. Marks Place, 11 PM | *Same saint. / Very different evenings.* |
| Q♣ | The Iyengar bakery | The bodega | *Open before you're up. / Still open when you're not okay.* |
| K♣ | That pothole | That pothole | *Nobody fixes it. / Everybody knows exactly where it is.* |
| A♠ | Majestic bus station | Port Authority Bus Terminal | *The ugliest building in town / is where everyone's story starts.* |
| 3♠ | Pink tabebuia in February | Cherry blossom in April | *Once a year the pavement / forgets it's grey.* |
| ★ 7♠ | The April 4 PM storm | The first snow at dusk | *Nobody leaves early / in weather like this.* |
| J♠ | Gully cricket | Stickball | *The game ends / when someone's mother calls.* |
| K♠ | "Bangalore was better before" | "New York was better before" | *Everyone says it was better / the year they arrived.* |
| Joker I | The Departure | — | *Funny how you can miss two places at once.* |
| Joker II | The Return | — | *Funny how you can miss two places at once.* |

---

## Phase 3: the five hero cards and two Jokers

### ★ 8♣ The Ride Home: auto-rickshaw × yellow cab

- **Rank and suit:** 8 of Clubs (Streets), 6 PM.
- **Composition:**
  - Top half: Richmond Road in the rain. A rain tree, tangled overhead cables, a Sintex tank on a roof, and a ಕಾಫಿ board over a rolling shutter.
  - Bottom half: Second Avenue. A brick walk-up with a fire escape, a water tower, a ONE WAY sign and a deli awning.
- **The seam:** the road. The vermilion line is its centre line.
- **Motion:** the auto drives along the top half and the cab along the bottom. Because of the rotation, they cross at the centre line going opposite ways. When the rain arrives, the cab's roof light goes dark.
- **Hidden sentence:** *The minute it rains, / everyone is going the other way.*
- **Why it works:** it skips the easy resemblance (both are yellow) for a shared experience every resident has had. The rotation turns "the other way" from a figure of speech into the card's geometry.

### ★ 2♥ Morning Walk: Cubbon Park × Central Park

- **Rank and suit:** 2 of Hearts (Belonging), 6 AM.
- **Composition:**
  - Top half: the flat umbrella of a rain tree, bamboo, a bench, the red State Central Library and a low sun.
  - Bottom half: the vase of an American elm, a Central Park lamp post with its street-number plate, the San Remo's twin towers in faint line, and morning mist.
- **The seam:** the walking path. A single trunk rises from it in both directions, so the card reads as one tree with two crowns, the oldest double-headed image in cards.
- **Motion:** both canopies sway together. The Bangalore walker takes the loop at a stroll; the New York runner laps them.
- **Hidden sentence:** *Every loud city / needs somewhere to whisper.*
- **Why it works:** the two parks share an hour and a crowd, not a look. The different paces are the one difference the card allows itself, and it's affectionate.

### ★ 3♥ The Usual: darshini × diner

- **Rank and suit:** 3 of Hearts, 8 AM.
- **Composition:**
  - Top half: a green menu board in Kannada, a SELF SERVICE plate, white wall tiles, a tube light, stacked steel plates, and a tumbler in its davara.
  - Bottom half: a black letter board (COFFEE, EGGS ANY STYLE), pink OPEN neon, a pie under a glass dome, and a green-banded mug on a saucer.
- **The seam:** the counter.
- **Motion:** steam rises from both cups, away from the shared counter. The tube light stutters and the neon flickers on its own rhythm.
- **Hidden sentence:** *You don't order anymore. / You just nod.*
- **Why it works:** this is belonging at its smallest scale. It works whether you stand (darshini) or sit for an hour (diner).

### ★ 7♠ Four O'Clock: the April storm × the first snow

- **Rank and suit:** 7 of Spades (Weather and time), 4 PM.
- **Composition:**
  - Top half: Basavanagudi. A storm cloud, a flicker of lightning, a red Mangalore-tile eave dripping, a window grille, an open door glowing yellow under a mango-leaf thorana, and chappals left on the step.
  - Bottom half: Park Slope. A brownstone stoop dusted with snow, a lit double door, snow boots on the top step, and a streetlamp.
- **The seam:** the ground both doorsteps stand on. Puddles ripple on one side; snow settles on the other.
- **Hidden sentence:** *Nobody leaves early / in weather like this.*
- **Why it works:** the shoes at the door do the talking. In both cities, they mean someone came over and is staying.

### ★ 10♣ Late on St Mark's: St. Mark's Road × St. Marks Place

- **Rank and suit:** 10 of Clubs, 11 PM. It's the only night-sky card among the heroes.
- **Composition:**
  - Top half: St. Mark's Cathedral's dome and pediment in moonlight, and a café window full of late diners.
  - Bottom half: East Village tenements with fire escapes and windows switching on and off.
- **The seam:** one signpost carries both names. The blue blade reads ST. MARK'S ROAD; turned over, the green NYC blade reads ST MARKS PL.
- **Motion:** strollers loop with nowhere to be. Windows light up one after another.
- **Hidden sentence:** *Same saint. / Very different evenings.*
- **Why it works:** the coincidence gets the smile. The evenings, which are cathedral-and-café on one side and East Village on the other, carry the feeling.

### Joker I: The Departure · Joker II: The Return

- **The Departure:** a steel tumbler pours into a Greek-key New York paper cup. The sentence flows downstream inside the coffee.
- **The Return:** the paper cup pours back into a davara that already holds a little coffee. The stream is paler, and the sentence runs upstream.
- **What both share:** a single index (a vertical JOKER), engraved rays behind the pour, and a seam line that breaks where the stream crosses it. These are the only cards that can be upside down.
- **As a pair:** side by side, they're mirror images. Every other card says *it's the same either way up*. The pair says *you need both to be whole*.

---

## Files

- **`prototype/index.html`:** the screening page. One card on the stage, the reel of the collection, the Jokers, and the system. Controls: turn the card 180°, pause, show the print frame, copy SVG.
- **`prototype/cards.js`:** all the artwork as code. Each card is a function, and rotational symmetry is enforced by the renderer.
- **`prototype/export.js`:** run `node prototype/export.js` to regenerate `prototype/svg/`. For each card it writes an animated `<id>.svg` and a still `<id>-print.svg` with bleed.

## Next

1. Verify the open fact (Namma Metro tokens), then lock the 21 pairings.
2. Design the card back: a pulli kolam dot grid woven into a Greek-key meander, rotationally symmetric.
3. Draw the court figures. Jacks, Queens and Kings need people, so they need their own drawing pass.
4. Get printer quotes for lenticular seam bands versus full-art lenticular.
